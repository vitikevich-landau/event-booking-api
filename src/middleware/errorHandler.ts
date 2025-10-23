import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { ErrorResponse } from '../types';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: _req.path,
    method: _req.method,
  });

  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      error: 'Validation Error',
      message: 'Invalid request data',
      details: err.errors,
    };
    res.status(400).json(response);
    return;
  }

  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: err.constructor.name,
      message: err.message,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  const response: ErrorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  };

  res.status(500).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ErrorResponse = {
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  };
  res.status(404).json(response);
};
