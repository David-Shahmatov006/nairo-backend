import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Nice post!' })
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: '08c87441-7cc8-4a9a-8bb8-dfd7a6a66d48' })
  @IsNotEmpty()
  postId: string;
}
