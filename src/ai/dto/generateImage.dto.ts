import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class GenerateImageDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'imagePrompt must not be blank' })
  @MaxLength(2000)
  imagePrompt: string;
}
