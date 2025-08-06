import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SentryService } from '@ntegral/nestjs-sentry';
import * as bodyParser from 'body-parser';
import fs from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { TMP_PATH, TMP_PATH_FIXED } from './enums/tmpPathsEnums';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });
  const configService: ConfigService = app.get(ConfigService);
  const isDocker = configService.get<boolean>('IS_DOCKER');

  app.useLogger(SentryService.SentryServiceInstance());

  if (isDocker) {
    console.log('Running in Docker');
  }

  let publicPath;

  if (isDocker) {
    publicPath = join(__dirname, 'public');
  } else {
    publicPath = join(__dirname, '..', 'public');
  }

  if (!isDocker) {
    !fs.existsSync(TMP_PATH) && fs.mkdirSync(TMP_PATH);
    !fs.existsSync(TMP_PATH_FIXED) && fs.mkdirSync(TMP_PATH_FIXED);
  }

  app.useStaticAssets(publicPath);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: [configService.get<string>('WEBSITE_URL')],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = configService.get<string>('API_PORT') || 3000;

  console.log(`Listening on Port ${port}`);
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(
    bodyParser.urlencoded({
      limit: '50mb',
      parameterLimit: 100000,
      extended: true,
    }),
  );

  await app.listen(port);
}

bootstrap();
