import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred.';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        if (
          'message' in exceptionResponse &&
          typeof exceptionResponse.message === 'string'
        ) {
          message = exceptionResponse.message;
        } else if (
          'error' in exceptionResponse &&
          typeof exceptionResponse.error === 'string'
        ) {
          message = exceptionResponse.error;
        }

        if ('errors' in exceptionResponse) {
          errors = (exceptionResponse as any).errors;
        }
      }
    } else {
      this.logger.error(
        `[${request.method}] ${request.url} - ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} responded with ${status}\nMessage: ${message}`,
      );
    }

    response.status(status).json({
      error: message,
      errors: errors,
    });
  }
}
