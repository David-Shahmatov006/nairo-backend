import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://nairo-frontend-production.up.railway.app',
    ],
    credentials: true,
  });
  
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 5001);
}
bootstrap();
