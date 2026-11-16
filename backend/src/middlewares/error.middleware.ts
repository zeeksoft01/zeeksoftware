import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export const notFoundApiHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, `API endpoint not found: ${req.method} ${req.path}`));
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown = undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = err.issues.map((e) => e.message).join('; ');
    details = err.issues;
  } else if (err instanceof multer.MulterError) {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file exceeds the maximum allowed size limit (50 MB).'
        : err.message;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid identifier format for field "${err.path}"`;
  } else if (
    err instanceof SyntaxError &&
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status?: number }).status === 400
  ) {
    statusCode = 400;
    message = 'Invalid JSON request payload.';
  } else if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.too.large'
  ) {
    statusCode = 413;
    message = 'Request payload is too large.';
  } else if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  ) {
    statusCode = 409;
    message = 'A record with this unique value already exists.';
  } else if (err instanceof Error) {
    message = env.isProduction ? 'Internal server error' : err.message;
  }

  if (statusCode >= 500 && !(err instanceof ApiError)) {
    console.error('[API Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && !env.isProduction ? { details } : {}),
  });
};
