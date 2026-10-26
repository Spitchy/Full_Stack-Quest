export const config = {
  port: Number(process.env.API_PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-a-changer',
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX ?? 60),
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  },
};
