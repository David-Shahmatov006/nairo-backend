import { FunctionDeclaration, Type } from '@google/genai';
import { AI_INSTRUCTIONS } from '../ai.instructions';
import { supportedAgentLanguages } from './types/agent-actions';
export { supportedAgentLanguages } from './types/agent-actions';


export const agentTools: FunctionDeclaration[] = [
  {
    name: 'searchUsers',
    description: AI_INSTRUCTIONS.SEARCH_USERS,
    parameters: {
      type: Type.OBJECT,
      properties: {
        queries: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: AI_INSTRUCTIONS.SEARCH_QUERIES,
        },
      },
      required: ['queries'],
    },
  },
  {
    name: 'getUserPosts',
    description: AI_INSTRUCTIONS.GET_USER_POSTS,
    parameters: {
      type: Type.OBJECT,
      properties: {
        userId: {
          type: Type.STRING,
          description: AI_INSTRUCTIONS.POSTS_USER_ID,
        },
        limit: {
          type: Type.INTEGER,
          description: AI_INSTRUCTIONS.POSTS_LIMIT,
        },
      },
      required: ['limit'],
    },
  },
  {
    name: 'controlInterface',
    description: AI_INSTRUCTIONS.CONTROL_INTERFACE,
    parameters: {
      type: Type.OBJECT,
      properties: {
        actions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                enum: ['setTheme', 'setLanguage', 'openCreatePost'],
              },
              value: {
                type: Type.STRING,
                description: AI_INSTRUCTIONS.ACTION_VALUE,
              },
            },
            required: ['type'],
          },
        },
      },
      required: ['actions'],
    },
  },
];
