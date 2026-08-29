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
import { extname } from 'path';
import { fileTypeFromBuffer } from 'file-type';
import { isAllowedAudioExtension } from './common/upload.utils';
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
      file,
      folder,
      extname(file.originalname),
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
      file,
      folder,
      `.${type!.ext}`,
      "We can't save your voice message =(",
    );
  }

  private async putObject(
    file: Express.Multer.File,
    folder: string,
    extension: string,
    failureMessage: string,
  ): Promise<string> {
    try {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const key = `${folder}/${uniqueSuffix}${extension}`;

      const bucketName = this.configService.get<string>('R2_BUCKET_NAME');
      const publicDomain = this.configService.get<string>('R2_PUBLIC_DOMAIN');

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      return `${publicDomain}/${key}`;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error during uploading on R2: ${err.message}`,
        err.stack,
      );
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
