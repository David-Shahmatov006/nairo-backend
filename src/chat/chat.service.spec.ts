import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { R2Service } from 'src/r2.service';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { Chat } from './entities/chat.entity';
import { Message, MessageType } from './entities/message.entity';

// The real R2Service pulls in `file-type`, which is ESM only and cannot be
// loaded by this CommonJS jest setup.
jest.mock('src/r2.service', () => ({
  R2Service: class R2ServiceStub {},
}));

type MessageRow = {
  id: string;
  type: MessageType;
  text: string | null;
  audioUrl?: string | null;
  sender: { id: string };
  chat: { id: string };
  editedAt?: Date | null;
};

type FindOneArgs = { where?: { id?: string } };

const SENDER_ID = 'user-1';
const RECEIVER_ID = 'user-2';
const CHAT_ID = 'chat-1';
const AUDIO_URL = 'https://cdn.example.com/voice-messages/1-2.webm';
const WAVEFORM = [0, 25, 50, 100];

const messageRow = (overrides: Partial<MessageRow> = {}): MessageRow => ({
  id: 'message-1',
  type: 'text',
  text: 'Original text',
  sender: { id: SENDER_ID },
  chat: { id: CHAT_ID },
  ...overrides,
});

const setup = async (
  options: {
    messages?: MessageRow[];
    chatIds?: string[];
    existingChatBetween?: { id: string } | null;
  } = {},
) => {
  const messages = options.messages ?? [];
  const chatIds = options.chatIds ?? [CHAT_ID];

  const messageRepo = {
    findOne: jest.fn((args: FindOneArgs) =>
      Promise.resolve(
        messages.find((message) => message.id === args.where?.id) ?? null,
      ),
    ),
    create: jest.fn((data: Partial<MessageRow>) => ({ ...data })),
    save: jest.fn((data: Partial<MessageRow>) =>
      Promise.resolve({ id: 'message-new', ...data }),
    ),
    delete: jest.fn(() => Promise.resolve({ affected: 1 })),
  };

  const existingChatBetween = options.existingChatBetween ?? null;

  const chatRepo = {
    findOne: jest.fn((args: FindOneArgs) =>
      Promise.resolve(
        chatIds.includes(args.where?.id ?? '')
          ? { id: args.where?.id, participants: [] }
          : null,
      ),
    ),
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn(() => Promise.resolve(existingChatBetween)),
    })),
    create: jest.fn((data: unknown) => data),
    save: jest.fn((data: unknown) =>
      Promise.resolve({ id: 'chat-new', ...(data as object) }),
    ),
  };

  const userRepo = {
    findOne: jest.fn(() => Promise.resolve({ id: SENDER_ID })),
    find: jest.fn(() =>
      Promise.resolve([{ id: SENDER_ID }, { id: RECEIVER_ID }]),
    ),
  };

  const r2Service = {
    deleteFile: jest.fn(() => Promise.resolve(undefined)),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      ChatService,
      {
        provide: getRepositoryToken(Message),
        useValue: messageRepo as unknown as Repository<Message>,
      },
      {
        provide: getRepositoryToken(Chat),
        useValue: chatRepo as unknown as Repository<Chat>,
      },
      {
        provide: getRepositoryToken(User),
        useValue: userRepo as unknown as Repository<User>,
      },
      { provide: R2Service, useValue: r2Service },
    ],
  }).compile();

  return {
    service: moduleRef.get(ChatService),
    messageRepo,
    chatRepo,
    r2Service,
  };
};

describe('ChatService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('sendMessage', () => {
    it('stores a text message without audio fields', async () => {
      const { service, messageRepo } = await setup();

      await service.sendMessage(CHAT_ID, SENDER_ID, RECEIVER_ID, {
        type: 'text',
        text: 'Hello there',
      });

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'text', text: 'Hello there' }),
      );
      expect(messageRepo.create.mock.calls[0][0]).not.toHaveProperty(
        'audioUrl',
      );
    });

    it('stores a voice message with an empty text', async () => {
      const { service, messageRepo } = await setup();

      const result = await service.sendMessage(
        CHAT_ID,
        SENDER_ID,
        RECEIVER_ID,
        {
          type: 'voice',
          audioUrl: AUDIO_URL,
          durationMs: 4200,
          waveform: WAVEFORM,
        },
      );

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'voice',
          text: null,
          audioUrl: AUDIO_URL,
          durationMs: 4200,
          waveform: WAVEFORM,
        }),
      );
      expect(result.chatId).toBe(CHAT_ID);
    });

    it('creates a chat when none exists yet', async () => {
      const { service, chatRepo } = await setup({ chatIds: [] });

      const result = await service.sendMessage(null, SENDER_ID, RECEIVER_ID, {
        type: 'voice',
        audioUrl: AUDIO_URL,
        durationMs: 1000,
        waveform: WAVEFORM,
      });

      expect(chatRepo.create).toHaveBeenCalledWith({
        participants: [{ id: SENDER_ID }, { id: RECEIVER_ID }],
      });
      expect(result.chatId).toBe('chat-new');
    });
  });

  describe('updateMessage', () => {
    it('refuses to edit a voice message', async () => {
      const { service, messageRepo } = await setup({
        messages: [
          messageRow({ type: 'voice', text: null, audioUrl: AUDIO_URL }),
        ],
      });

      await expect(
        service.updateMessage('message-1', 'Hijacked', SENDER_ID),
      ).rejects.toThrow(
        new BadRequestException("Voice messages can't be edited"),
      );
      expect(messageRepo.save).not.toHaveBeenCalled();
    });

    it('refuses to edit a message written by somebody else', async () => {
      const { service } = await setup({ messages: [messageRow()] });

      await expect(
        service.updateMessage('message-1', 'Hijacked', RECEIVER_ID),
      ).rejects.toThrow(new ForbiddenException("You can't edit this message"));
    });

    it('updates the text for the author', async () => {
      const { service, messageRepo } = await setup({
        messages: [messageRow()],
      });

      const result = await service.updateMessage(
        'message-1',
        'Edited text',
        SENDER_ID,
      );

      expect(result.text).toBe('Edited text');
      expect(messageRepo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown message', async () => {
      const { service } = await setup({ messages: [] });

      await expect(
        service.updateMessage('ghost', 'Edited', SENDER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMessage', () => {
    it('removes the audio object from R2 for a voice message', async () => {
      const { service, messageRepo, r2Service } = await setup({
        messages: [
          messageRow({ type: 'voice', text: null, audioUrl: AUDIO_URL }),
        ],
      });

      await service.deleteMessage('message-1', SENDER_ID);

      expect(messageRepo.delete).toHaveBeenCalledWith('message-1');
      expect(r2Service.deleteFile).toHaveBeenCalledWith(AUDIO_URL);
    });

    it('does not touch R2 for a text message', async () => {
      const { service, r2Service } = await setup({
        messages: [messageRow()],
      });

      await service.deleteMessage('message-1', SENDER_ID);

      expect(r2Service.deleteFile).not.toHaveBeenCalled();
    });

    it('refuses to delete a message written by somebody else', async () => {
      const { service, messageRepo, r2Service } = await setup({
        messages: [
          messageRow({ type: 'voice', text: null, audioUrl: AUDIO_URL }),
        ],
      });

      await expect(
        service.deleteMessage('message-1', RECEIVER_ID),
      ).rejects.toThrow(
        new ForbiddenException("You can't delete this message"),
      );
      expect(messageRepo.delete).not.toHaveBeenCalled();
      expect(r2Service.deleteFile).not.toHaveBeenCalled();
    });
  });
});
