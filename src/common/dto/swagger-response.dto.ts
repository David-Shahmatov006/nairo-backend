import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicUserDto {
  @ApiProperty({
    example: '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a',
  })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'username' })
  username: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatars/user.webp',
    nullable: true,
  })
  avatar?: string | null;

  @ApiPropertyOptional({
    example: 'Fullstack engineer',
    nullable: true,
  })
  bio?: string | null;

  @ApiProperty({ example: 'en' })
  preferredLanguage: string;
}

export class UserSummaryDto {
  @ApiProperty({
    example: '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a',
  })
  id: string;

  @ApiProperty({ example: 'username' })
  username: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatars/user.webp',
    nullable: true,
  })
  avatar?: string | null;
}

export class UserProfileDto extends PublicUserDto {
  @ApiProperty({ type: () => UserSummaryDto, isArray: true })
  followers: UserSummaryDto[];

  @ApiProperty({ type: () => UserSummaryDto, isArray: true })
  following: UserSummaryDto[];

  @ApiProperty({ type: () => UserOwnedPostDto, isArray: true })
  posts: UserOwnedPostDto[];

  @ApiProperty({ example: true })
  isFollowing: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'Login successful' })
  message: string;

  @ApiProperty({ type: () => PublicUserDto })
  user: PublicUserDto;

  @ApiProperty({ example: 'jwt-access-token' })
  accessToken: string;

  @ApiPropertyOptional({ example: ['early_bird'], type: [String] })
  newlyUnlocked?: string[];
}

export class AccessTokenResponseDto {
  @ApiProperty({ example: 'jwt-access-token' })
  accessToken: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}

export class DeleteCommentResponseDto {
  @ApiProperty({ example: true })
  deleted: boolean;
}

export class ToggleFollowResponseDto {
  @ApiProperty({ example: true })
  isFollowing: boolean;
}

export class ToggleSaveResponseDto {
  @ApiProperty({ example: true })
  saved: boolean;
}

export class ToggleLikeResponseDto {
  @ApiProperty({ example: true })
  isLiked: boolean;

  @ApiProperty({ example: 42 })
  likes: number;
}

export class CheckUserFieldsResponseDto {
  @ApiProperty({ example: false })
  emailExists: boolean;

  @ApiProperty({ example: true })
  usernameExists: boolean;
}

export class EmailExistsResponseDto {
  @ApiProperty({ example: true })
  exists: boolean;
}

export class AchievementItemDto {
  @ApiProperty({ example: 'night_owl' })
  key: string;

  @ApiProperty({ example: true })
  unlocked: boolean;
}

export class VisitAchievementsResponseDto {
  @ApiProperty({ type: () => AchievementItemDto, isArray: true })
  achievements: AchievementItemDto[];

  @ApiProperty({ example: ['halloween'], type: [String] })
  newlyUnlocked: string[];
}

export class ResetTokenResponseDto {
  @ApiProperty({ example: 'reset-token-value' })
  resetToken: string;
}

export class PublicPostDto {
  @ApiProperty({
    example: '08c87441-7cc8-4a9a-8bb8-dfd7a6a66d48',
  })
  id: string;

  @ApiProperty({ example: 'https://cdn.example.com/posts/post.webp' })
  image: string;

  @ApiProperty({ example: 'My first post' })
  title: string;

  @ApiProperty({ example: 'Some description' })
  description: string;

  @ApiProperty({ example: 12 })
  savings: number;

  @ApiProperty({ type: () => UserSummaryDto })
  user: UserSummaryDto;

  @ApiProperty({ example: '2026-07-30T08:00:00.000Z' })
  createdAt: string;
}

export class UserOwnedPostDto {
  @ApiProperty({
    example: '08c87441-7cc8-4a9a-8bb8-dfd7a6a66d48',
  })
  id: string;

  @ApiProperty({ example: 'https://cdn.example.com/posts/post.webp' })
  image: string;

  @ApiProperty({ example: 'My first post' })
  title: string;

  @ApiProperty({ example: 'Some description' })
  description: string;

  @ApiProperty({ example: 12 })
  savings: number;

  @ApiProperty({ example: '2026-07-30T08:00:00.000Z' })
  createdAt: string;
}

export class PostViewDto extends PublicPostDto {
  @ApiProperty({ example: true })
  isSaved: boolean;

  @ApiProperty({ example: false })
  isLiked: boolean;

  @ApiProperty({ example: 17 })
  likes: number;
}

export class PaginatedPostsResponseDto {
  @ApiProperty({ type: () => PostViewDto, isArray: true })
  posts: PostViewDto[];

  @ApiProperty({ example: true })
  hasMore: boolean;
}

export class CommentDto {
  @ApiProperty({
    example: '78ea8c79-3101-4474-a547-0f35fe9d0a30',
  })
  id: string;

  @ApiProperty({ example: 'Nice post!' })
  text: string;

  @ApiProperty({ type: () => UserSummaryDto })
  user: UserSummaryDto;

  @ApiProperty({ example: '2026-07-30T08:00:00.000Z' })
  createdAt: string;
}

export class MessageDto {
  @ApiProperty({
    example: 'a8b9e3d0-ae53-43f4-bb93-42cad3283db4',
  })
  id: string;

  @ApiProperty({ example: 'text', enum: ['text', 'voice'] })
  type: 'text' | 'voice';

  @ApiProperty({ example: 'Hello there', nullable: true })
  text: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/voice-messages/voice.webm',
    nullable: true,
  })
  audioUrl?: string | null;

  @ApiPropertyOptional({ example: 4200, nullable: true })
  durationMs?: number | null;

  @ApiPropertyOptional({
    example: [0, 12, 48, 100, 72, 30],
    type: [Number],
    nullable: true,
  })
  waveform?: number[] | null;

  @ApiProperty({ type: () => UserSummaryDto })
  sender: UserSummaryDto;

  @ApiProperty({ example: '2026-07-30T08:00:00.000Z' })
  createdAt: string;

  @ApiPropertyOptional({
    example: '2026-07-30T08:05:00.000Z',
    nullable: true,
  })
  editedAt?: string | null;
}

export class ChatDto {
  @ApiProperty({
    example: '31d7a49b-9771-403e-af65-36d4f08b4d19',
  })
  id: string;

  @ApiProperty({ type: () => UserSummaryDto, isArray: true })
  participants: UserSummaryDto[];

  @ApiProperty({
    example: {
      '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a':
        'a8b9e3d0-ae53-43f4-bb93-42cad3283db4',
    },
    additionalProperties: { type: 'string' },
  })
  lastReadMessages: Record<string, string>;
}

export class ChatWithUnreadCountDto extends ChatDto {
  @ApiProperty({ example: 3 })
  unreadCount: number;
}
