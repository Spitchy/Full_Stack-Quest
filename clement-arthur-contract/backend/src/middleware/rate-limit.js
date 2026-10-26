import { sendError } from '../errors.js';

// Fenêtre fixe par adresse IP, en mémoire.
export function rateLimit({ max, windowMs }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    let entry = hits.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      return sendError(res, 429, 'RATE_LIMITED', 'Trop de requêtes effectuées. Veuillez réessayer plus tard.');
    }

    next();
  };
}
