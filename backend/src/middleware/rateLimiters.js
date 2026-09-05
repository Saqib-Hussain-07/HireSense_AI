const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

/**
 * Rate limiter for authentication endpoints (/api/auth/*).
 * Protects against brute-force and credential stuffing.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again in 15 minutes.',
  },
  skip: () => isTest,
});

/**
 * Rate limiter for AI-intensive reasoning endpoints.
 * Protects Gemini and Groq API quotas and billing from abuse.
 */
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AI reasoning rate limit reached. Please wait a few moments before submitting further requests.',
  },
  skip: () => isTest,
});

/**
 * Baseline general API rate limiter.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  skip: () => isTest,
});

module.exports = {
  authLimiter,
  aiLimiter,
  generalLimiter,
};
