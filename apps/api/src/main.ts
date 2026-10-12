import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const port = process.env.PORT || 3000;
  const globalPrefix = process.env.API_PREFIX || 'api/v1';

  // Configuración de CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Prefijo global de API
  app.setGlobalPrefix(globalPrefix);

  // Filtro global de excepciones RFC 7807
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Validación global estricta de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configuración de OpenAPI / Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Voko API')
    .setDescription(
      'Documentación interactiva de la API REST de Voko — Plataforma SaaS Multiempresa de Gestión de Turnos.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Sistema y Diagnóstico', 'Endpoints de verificación de estado y salud del sistema')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Voko API Documentation',
  });

  await app.listen(port);
  logger.log(`🚀 Voko API corriendo en: http://localhost:${port}/${globalPrefix}`);
  logger.log(`📚 Documentación Swagger disponible en: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  const logger = new Logger('BootstrapError');
  logger.error(`Error crítico iniciando Voko API: ${err.message}`, err.stack);
});
