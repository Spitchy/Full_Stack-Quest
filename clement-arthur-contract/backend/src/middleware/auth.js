import jwt from 'jsonwebtoken';
import { sendError } from '../errors.js';

// Sécurité playerToken : JWT transmis dans Authorization: Bearer <token>.
export function requireToken(secret) {
  return (req, res, next) => {
    const [scheme, token] = (req.get('Authorization') ?? '').split(' ');

    if (scheme !== 'Bearer' || !token) {
      return invalidToken(res);
    }

    try {
      req.joueur = jwt.verify(token, secret, { algorithms: ['HS256'] });
      next();
    } catch {
      invalidToken(res);
    }
  };
}

function invalidToken(res) {
  sendError(res, 401, 'INVALID_TOKEN', "Le jeton d'authentification est manquant ou invalide.");
}
