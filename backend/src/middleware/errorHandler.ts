import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  // Stripe webhook signature verification error
  if (error.type === 'StripeSignatureVerificationError') {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Validation errors
  if (error.isJoi) {
    return res.status(400).json({ 
      error: 'Validation error',
      details: error.details.map((d: any) => d.message)
    });
  }

  // Default error
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error'
  });
};