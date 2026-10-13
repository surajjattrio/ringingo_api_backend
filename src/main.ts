import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import mongoose from 'mongoose';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { swaggerConfig } from './swagger/swagger.config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SetUUIDInterceptor } from './interceptor/logged-in-user-info.interceptor';
// import { json, urlencoded } from 'express';
import * as fs from "fs";
// import { Transport } from '@nestjs/microservices';
import { initVoiceBroadcastProcessLogger } from './logger/voice-broadcast-process-logger';

//Create SSL SERVER
const httpsOptions = {
  key: fs.readFileSync(process.env.key),
  cert: fs.readFileSync(process.env.cert),
};
//End

//Voice-broadcast: file-based uncaughtException/unhandledRejection capture (logs/voice-broadcast/exceptions|rejections-*.log).
//Registered once here, process-wide by nature - see voice-broadcast-process-logger.ts for why.
initVoiceBroadcastProcessLogger();
//Just for development purpose
let debug = process.env.ENVIRONMENT == 'development' ? true : false;
mongoose.set('debug', debug);
//End
async function bootStrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.ENVIRONMENT == 'development' ? ['debug', 'error', 'log', 'verbose', 'warn'] : ['error'],
    // httpsOptions
  });

  // // RabbitMQ Microservice setup
  // app.connectMicroservice({
  //   transport: Transport.RMQ,
  //   options: {
  //     urls: [process.env.RABBITMQ_URL],
  //     queue: 'ringingo_auric_google_sheet_queue',
  //     queueOptions: {
  //       durable: true,
  //     },
  //     noAck: true, // Auto acknowledgment
  //   },
  // });

  // await app.startAllMicroservices(); // Start RabbitMQ microservice

  app.enableCors();
  /* app.enableCors({
    origin: true, // allows all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  */
  // app.use(json({ limit: '300mb' }));
  // app.use(urlencoded({ extended: true, limit: '300mb' }));
  app.use(helmet({ crossOriginResourcePolicy: false })); // Protect HTTP Headers
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); // To validate every request
  app.useGlobalInterceptors(new SetUUIDInterceptor()); // To add uuid of logged in entity

  //Swagger Configuration
  const document = SwaggerModule.createDocument(app, swaggerConfig());
  SwaggerModule.setup(process.env.SWAGGER_DOCS_PREFIX, app, document, {
    swaggerOptions: {
      displayRequestDuration: true,
      persistAuthorization: true,
    }
  });
  //End
  await app.listen(process.env.NEST_JS_SERVER_PORT, '0.0.0.0', () => {
    let server = app.getHttpServer(); // HTTP server
    server.keepAliveTimeout = 300000; // Set the keep-alive timeout (e.g., 5 minutes)
    Logger.log(`[Nest API] Server is running on port ==> ${process.env.NEST_JS_SERVER_PORT}`);
  });
}
bootStrap();
