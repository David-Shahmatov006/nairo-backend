import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GeneratePostDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  idea: string;

  @IsOptional()
  withImage: boolean;
}
