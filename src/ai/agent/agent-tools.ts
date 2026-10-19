import { FunctionDeclaration, Type } from '@google/genai';

export const agentTools: FunctionDeclaration[] = [
  {
    name: 'searchUsers',
    description:
      'Search Nairo users by username, first name, last name or full name.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description:
            'Extract only the name or username from the user request. Do not include conversational phrases.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getUserPosts',
    description:
      'Get posts published by a specific user. If userId is omitted, get the current user posts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        userId: {
          type: Type.STRING,
          description: 'ID of the user whose posts should be retrieved.',
        },
        limit: {
          type: Type.INTEGER,
          description: 'Number of posts to retrieve, between 1 and 10.',
        },
      },
      required: ['limit'],
    },
  },
];
