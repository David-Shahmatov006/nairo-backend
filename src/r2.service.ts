import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import { isAllowedAudioExtension } from './common/upload.utils';
import { randomUUID } from 'crypto';

@Injectable()
export class R2Service {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(R2Service.name);

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.configService.get<string>('R2_ENDPOINT')!,
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>(
          'R2_SECRET_ACCESS_KEY',
        )!,
      },
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const type = await fileTypeFromBuffer(file.buffer);

    if (!type || !type.mime.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    return this.putObject(
      file.buffer,
      type.mime,
      folder,
      `.${type.ext}`,
      "We can't save your image =(",
    );
  }

  async uploadAudioFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const type = await fileTypeFromBuffer(file.buffer);

    if (!isAllowedAudioExtension(type?.ext)) {
      throw new BadRequestException('Only audio files are allowed');
    }

    return this.putObject(
      file.buffer,
      type!.mime,
      folder,
      `.${type!.ext}`,
      "We can't save your voice message =(",
    );
  }

  async uploadAiImage(buffer: Buffer, userId: string): Promise<string> {
    const type = await fileTypeFromBuffer(buffer);

    if (!type || !['image/png', 'image/jpeg'].includes(type.mime)) {
      throw new BadRequestException('Unsupported AI image format');
    }

    return this.putObject(
      buffer,
      type.mime,
      `ai-temp/${userId}`,
      `.${type.ext}`,
      'Failed to upload AI image',
    );
  }

  private async putObject(
    buffer: Buffer,
    mimeType: string,
    folder: string,
    extension: string,
    failureMessage: string,
  ): Promise<string> {
    try {
      const key = `${folder}/${randomUUID()}${extension}`;

      const bucketName =
        this.configService.getOrThrow<string>('R2_BUCKET_NAME');

      const publicDomain = this.configService
        .getOrThrow<string>('R2_PUBLIC_DOMAIN')
        .replace(/\/$/, '');

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      return `${publicDomain}/${key}`;
    } catch (error) {
      const err = error as Error;

      this.logger.error(`Error uploading to R2: ${err.message}`, err.stack);

      throw new InternalServerErrorException(failureMessage);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const publicDomain = this.configService.get<string>('R2_PUBLIC_DOMAIN')!;

      if (!fileUrl || !fileUrl.startsWith(publicDomain)) {
        return;
      }

      const key = fileUrl.replace(`${publicDomain}/`, '');
      const bucketName = this.configService.get<string>('R2_BUCKET_NAME')!;

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File successfully deleted: ${key}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error during deleting from R2: ${err.message}`,
        err.stack,
      );
    }
  }
}
