import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * AllExceptionsFilter
 *
 * Централизованная обработка всех исключений в приложении.
 * Ловит все ошибки и форматирует их в единый формат ответа.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Определяем статус код
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Получаем сообщение об ошибке
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Форматируем сообщение
    const errorMessage =
      typeof message === 'string'
        ? message
        : (message as any).message || 'An unexpected error occurred';

    // Получаем детали валидации если есть
    const details =
      typeof message === 'object' && (message as any).message !== undefined
        ? (message as any).message
        : undefined;

    // Логируем ошибку
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    // Формируем ответ
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: exception instanceof HttpException ? exception.name : 'Error',
      message: errorMessage,
      ...(details && Array.isArray(details) && { details }),
    };

    response.status(status).json(errorResponse);
  }
}
