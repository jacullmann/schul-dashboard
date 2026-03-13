import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CustomLoggerService } from './common/logger/custom-logger.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new CustomLoggerService();
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Security Middleware
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  // CORS matching Express config
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-tenant-id'],
  });

  // Reverse proxy support
  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter && httpAdapter.getInstance) {
    const instance = httpAdapter.getInstance();
    if (instance.set) {
      instance.set('trust proxy', 1);
    }
  }

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Validation Pipe formatting payload similarly to previous Express app
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        return new BadRequestException({
          error: 'Validierungsfehler. Bitte überprüfe deine Eingabe.',
          errors: errors, // Passing the full array for frontend inspection
        });
      },
    }),
  );

  // Swagger UI (Dev only)
  if (process.env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Schul Dashboard API')
      .setDescription('The Schul Dashboard NestJS API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Set global prefix if needed (Express used '/api' for most routes directly defined in main or routes)
  app.setGlobalPrefix('api'); // Assuming all controllers will map to /api/...

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Server is running on port ${port}`, 'Bootstrap');
}
bootstrap();
