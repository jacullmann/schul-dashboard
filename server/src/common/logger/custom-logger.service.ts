import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import * as path from 'path';
import * as rfs from 'rotating-file-stream';
import * as fs from 'fs';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private fileLogger: rfs.RotatingFileStream;
  private readonly defaultLogLevels: LogLevel[] = [
    'log',
    'error',
    'warn',
    'debug',
    'verbose',
    'fatal',
  ];

  constructor() {
    const logDirectory = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory, { recursive: true });
    }

    this.fileLogger = rfs.createStream('nest-server.log', {
      interval: '1d', // rotate daily
      path: logDirectory,
      maxFiles: 14, // keep logs for 14 days
    });
  }

  private writeLog(level: LogLevel, message: any, context?: string) {
    const timestamp = new Date().toISOString();
    const contextPrefix = context ? `[${context}] ` : '';
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${contextPrefix}${message}\n`;

    // Console output
    if (level === 'error' || level === 'fatal') {
      console.error(formattedMessage.trim());
    } else if (level === 'warn') {
      console.warn(formattedMessage.trim());
    } else {
      console.log(formattedMessage.trim());
    }

    // File output
    this.fileLogger.write(formattedMessage);
  }

  log(message: any, context?: string) {
    this.writeLog('log', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.writeLog('error', message, context);
    if (trace) {
      this.writeLog('error', `Trace: ${trace}`, context);
    }
  }

  warn(message: any, context?: string) {
    this.writeLog('warn', message, context);
  }

  debug(message: any, context?: string) {
    this.writeLog('debug', message, context);
  }

  verbose(message: any, context?: string) {
    this.writeLog('verbose', message, context);
  }

  fatal(message: any, context?: string) {
    this.writeLog('fatal', message, context);
  }
}
