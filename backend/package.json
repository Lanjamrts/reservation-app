import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // ✅ CORS ouvert pour Vercel (et localhost en dev)
  app.enableCors({
    origin: [
      'http://localhost:4200',
      /\.vercel\.app$/,        // accepte tous les sous-domaines vercel
    ],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ✅ PORT dynamique pour Railway
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on port ${port}`);
}
bootstrap();