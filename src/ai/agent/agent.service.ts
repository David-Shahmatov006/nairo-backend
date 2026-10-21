import { AI_INSTRUCTIONS } from '../ai.instructions';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Content, GoogleGenAI, Part } from '@google/genai';
import { PostService } from 'src/post/post.service';
import { UserService } from 'src/user/user.service';
import { agentTools, supportedAgentLanguages } from './agent-tools';
import { RedisService } from 'src/redis/redis.service';
import { AgentHistoryMessageDto } from './dto/agent.dto';

import type { AgentAction } from './types/agent-actions';

@Injectable()
export class AgentService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly postsService: PostService,
    private readonly usersService: UserService,
    private readonly redisService: RedisService,
  ) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.getOrThrow<string>('GEMINI_NAIRO_KEY'),
    });

    this.model = this.configService.getOrThrow<string>('GEMINI_FLASH_MODEL');
  }

  private validateActions(value: unknown): AgentAction[] {
    if (!Array.isArray(value)) return [];

    return value.slice(0, 5).flatMap((item: unknown): AgentAction[] => {
      if (!item || typeof item !== 'object') return [];

      const action = item as Record<string, unknown>;
      const language = supportedAgentLanguages.find(
        (code) => code === action.value,
      );

      if (action.type === 'setLanguage' && language !== undefined) {
        return [
          {
            type: 'setLanguage',
            value: language,
          },
        ];
      }

      if (
        action.type === 'setTheme' &&
        (action.value === 'dark' || action.value === 'light')
      ) {
        return [{ type: 'setTheme', value: action.value }];
      }

      if (action.type === 'openCreatePost') {
        return [{ type: 'openCreatePost' }];
      }

      return [];
    });
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    currentUserId: string,
  ) {
    switch (name) {
      case 'searchUsers': {
        if (!Array.isArray(args.queries)) {
          return { error: 'Invalid search queries' };
        }

        const queries = args.queries
          .filter((q): q is string => typeof q === 'string')
          .map((q) => q.trim().slice(0, 100))
          .filter(Boolean)
          .slice(0, 5);

        if (!queries.length) {
          return { error: 'Empty search queries' };
        }

        return this.searchUsers(queries);
      }

      case 'getUserPosts': {
        if (args.userId !== undefined && typeof args.userId !== 'string') {
          return { error: 'Invalid userId' };
        }

        if (typeof args.limit !== 'number') {
          return { error: 'Invalid limit' };
        }

        return this.getUserPosts(
          currentUserId,
          args.userId as string | undefined,
          args.limit,
        );
      }

      case 'searchWeb': {
        if (typeof args.query !== 'string') {
          return { error: 'Invalid search query' };
        }

        const query = args.query.trim().slice(0, 200);

        if (!query) {
          return { error: 'Empty search query' };
        }

        return this.searchWeb(query);
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  private async searchWeb(query: string) {
    const response = await this.ai.models.generateContent({
      model: this.configService.getOrThrow<string>('GEMINI_FLASH_MODEL'),
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: AI_INSTRUCTIONS.SEARCH_WEB,
      },
    });

    const grounding = response.candidates?.[0]?.groundingMetadata;

    return {
      message: response.text ?? '',
      sources:
        grounding?.groundingChunks
          ?.filter((chunk) => chunk.web?.uri)
          .map((chunk) => ({
            title: chunk.web?.title,
            url: chunk.web?.uri,
          })) ?? [],
    };
  }

  async clearHistory(currentUserId: string): Promise<void> {
    await this.redisService.del(`ai:chat:${currentUserId}:default`);
  }

  async searchUsers(queries: string[]) {
    const results = await Promise.all(
      queries.map((query) => this.usersService.searchUsers(query)),
    );

    const uniqueUsers = new Map();

    for (const users of results) {
      for (const user of users) {
        uniqueUsers.set(user.id, {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      }
    }

    return [...uniqueUsers.values()].slice(0, 10);
  }

  async getUserPosts(currentUserId: string, userId?: string, limit = 5) {
    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.trunc(limit), 1), 10)
      : 5;

    const result = await this.postsService.getUserPosts(
      userId || currentUserId,
      currentUserId,
      1,
      safeLimit,
    );

    return result.posts.map((post) => ({
      id: post.id,
      title: post.title,
      description: post.description,
      likes: post.likes,
      createdAt: post.createdAt,
    }));
  }

  async chat(
    message: string,
    currentUserId: string,
    visibleHistory?: AgentHistoryMessageDto[],
  ) {
    const historyKey = `ai:chat:${currentUserId}:default`;
    const history = await this.redisService.getJson<Content[]>(historyKey);
    const pendingActions: AgentAction[] = [];

    const cached: Content[] = Array.isArray(history) ? history : [];
    const lastReply = cached
      .at(-1)
      ?.parts?.map((part) => part.text ?? '')
      .join('')
      .trim();
    const lastVisibleReply = visibleHistory?.at(-1);
    const useCached =
      visibleHistory === undefined ||
      (lastVisibleReply?.role === 'assistant' &&
        lastVisibleReply.content.trim() === lastReply);
    const contents: Content[] = useCached
      ? cached
      : (visibleHistory ?? []).map((entry) => ({
          role: entry.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: entry.content }],
        }));

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    for (let step = 0; step < 5; step++) {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: AI_INSTRUCTIONS.AGENT,
          tools: [{ functionDeclarations: agentTools }],
        },
      });

      const functionCalls = response.functionCalls ?? [];

      if (!functionCalls.length) {
        const reply = response.text?.trim();

        if (!reply) {
          throw new Error('Gemini returned an empty response');
        }

        const modelContent = response.candidates?.[0]?.content;

        contents.push(
          modelContent ?? {
            role: 'model',
            parts: [{ text: reply }],
          },
        );

        await this.redisService.setJson(historyKey, contents, 60 * 60 * 24);

        return {
          message: reply,
          actions: pendingActions,
        };
      }

      const modelContent = response.candidates?.[0]?.content;

      if (!modelContent) {
        throw new Error('Gemini returned no candidate content');
      }

      contents.push(modelContent);

      const toolResponses: Part[] = [];

      for (const call of functionCalls) {
        if (call.name === 'controlInterface') {
          const actions = this.validateActions(call.args?.actions);
          const requested: unknown[] = Array.isArray(call.args?.actions)
            ? call.args.actions
            : [];
          const rejected = requested.flatMap((item: unknown) => {
            if (!item || typeof item !== 'object') return [];
            const action = item as Record<string, unknown>;
            if (
              action.type !== 'setLanguage' ||
              supportedAgentLanguages.some((code) => code === action.value)
            )
              return [];
            return [
              {
                type: 'setLanguage',
                value: typeof action.value === 'string' ? action.value : null,
                reason: 'unsupported_language',
              },
            ];
          });

          pendingActions.push(...actions);

          toolResponses.push({
            functionResponse: {
              name: call.name,
              id: call.id,
              response: {
                accepted: actions.length,
                status: actions.length
                  ? 'pending_frontend_execution'
                  : 'rejected',
                rejected,
                supportedLanguages: supportedAgentLanguages,
                ...(rejected.length
                  ? { instruction: AI_INSTRUCTIONS.UNSUPPORTED_LANGUAGE }
                  : {}),
              },
            },
          });

          continue;
        }

        const result = await this.executeTool(
          call.name ?? '',
          call.args ?? {},
          currentUserId,
        );

        toolResponses.push({
          functionResponse: {
            name: call.name,
            id: call.id,
            response: { result },
          },
        });
      }

      contents.push({
        role: 'user',
        parts: toolResponses,
      });
    }

    return {
      message:
        'Unable to complete the request. Please try making it more specific.',
    };
  }
}
