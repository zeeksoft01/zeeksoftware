import { Response } from 'express';

export const sendSuccess = <T extends Record<string, unknown>>(
  res: Response,
  payload: T,
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    ...payload,
  });
};
