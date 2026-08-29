import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const VOICE_WAVEFORM_BARS = 48;
export const VOICE_MIN_DURATION_MS = 500;
export const VOICE_MAX_DURATION_MS = 120000;

const parseWaveform = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

export class SendVoiceMessageDto {
  @ApiProperty({ example: '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a' })
  @IsUUID()
  receiverId: string;

  @ApiPropertyOptional({ example: '31d7a49b-9771-403e-af65-36d4f08b4d19' })
  @IsOptional()
  @IsUUID()
  chatId?: string;

  @ApiProperty({
    example: 4200,
    minimum: VOICE_MIN_DURATION_MS,
    maximum: VOICE_MAX_DURATION_MS,
  })
  @Type(() => Number)
  @IsInt()
  @Min(VOICE_MIN_DURATION_MS)
  @Max(VOICE_MAX_DURATION_MS)
  durationMs: number;

  @ApiProperty({
    description: `JSON-encoded array of ${VOICE_WAVEFORM_BARS} amplitudes in the 0..100 range`,
    example: '[0,12,48,100,72,30]',
    type: String,
  })
  @Transform(({ value }: { value: unknown }) => parseWaveform(value))
  @IsArray()
  @ArrayMinSize(VOICE_WAVEFORM_BARS)
  @ArrayMaxSize(VOICE_WAVEFORM_BARS)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  waveform: number[];
}
