import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private writeLog(level: LogLevel, message: any, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextPrefix = context ? `[${context}] ` : '';
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${contextPrefix}${message}`;

    if (level === 'error' || level === 'fatal') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  log(message: any, context?: string): void {
    this.writeLog('log', message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.writeLog('error', message, context);
    if (trace) {
      this.writeLog('error', `Trace: ${trace}`, context);
    }
  }

  warn(message: any, context?: string): void {
    this.writeLog('warn', message, context);
  }

  debug(message: any, context?: string): void {
    this.writeLog('debug', message, context);
  }

  verbose(message: any, context?: string): void {
    this.writeLog('verbose', message, context);
  }

  fatal(message: any, context?: string): void {
    this.writeLog('fatal', message, context);
  }
}
