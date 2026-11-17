import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor';
    let code: string | undefined;
    const requestId = randomUUID();

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const details =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as Record<string, unknown>)
          : undefined;
      const text =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : details?.message;
      if (
        typeof text === 'string' ||
        (Array.isArray(text) && text.every((item) => typeof item === 'string'))
      )
        message = text;
      if (
        typeof details?.code === 'string' &&
        /^[A-Z][A-Z0-9_]{0,79}$/.test(details.code)
      )
        code = details.code;
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      'status' in exception &&
      typeof exception.status === 'number'
    ) {
      status = (exception as { status: number }).status;
      message = (exception as { message?: string }).message ?? message;
    } else if (exception instanceof Error) {
      // Não vaza stack traces nem detalhes internos para o cliente
      this.logger.error(
        `Erro não tratado: ${exception.name}; requestId=${requestId}`,
      );
      message = 'Erro interno do servidor';
    }

    response.setHeader('X-Request-Id', requestId);
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.path,
      message,
      code: code ?? `HTTP_${status}`,
      requestId,
    });
  }
}
