import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Content, GoogleGenAI, Part } from '@google/genai';
import { PostService } from 'src/post/post.service';
import { UserService } from 'src/user/user.service';
import { agentTools } from './agent-tools';

@Injectable()
export class AgentService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly postsService: PostService,
    private readonly usersService: UserService,
  ) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.getOrThrow<string>('GEMINI_NAIRO_KEY'),
    });

    this.model = this.configService.getOrThrow<string>('GEMINI_FLASH_MODEL');
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    currentUserId: string,
  ) {
    switch (name) {
      case 'searchUsers': {
        if (typeof args.query !== 'string') {
          return { error: 'Invalid search query' };
        }

        return this.searchUsers(args.query);
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

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  async searchUsers(query: string) {
    const safeQuery = query.trim().slice(0, 100);

    if (!safeQuery) return [];

    const users = await this.usersService.searchUsers(safeQuery);

    return users.slice(0, 10).map((user) => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
    }));
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

  async chat(message: string, currentUserId: string) {
    const contents: Content[] = [
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    for (let step = 0; step < 5; step++) {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: `
          You are Nairo AI, an assistant for the Nairo social network.
          Help users find people and posts.
          Use tools when you need real data from Nairo.
          Never invent users, posts, or statistics.
          Link to posts using Markdown with relative URLs: [title](/post/POST_ID).
          Link to user profiles using [name](/user/USER_ID).
          Use only IDs returned by tools. Never invent a website domain.
          The post route is /post/, never /posts/.
          If multiple users match a name and the intended user
          is ambiguous, ask the user to clarify.
          Respond in the same language as the user.
        `,
          tools: [{ functionDeclarations: agentTools }],
        },
      });

      const functionCalls = response.functionCalls ?? [];

      if (!functionCalls.length) {
        return {
          message: response.text ?? '',
        };
      }

      const modelContent = response.candidates?.[0]?.content;

      if (!modelContent) {
        throw new Error('Gemini returned no candidate content');
      }

      contents.push(modelContent);

      const toolResponses: Part[] = [];

      for (const call of functionCalls) {
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
      message: 'Unable to complete the request. Please try making it more specific.',
    };
  }
}
