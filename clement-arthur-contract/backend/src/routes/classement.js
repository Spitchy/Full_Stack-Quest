import { Router } from 'express';
import { ApiError } from '../errors.js';
import { classer, paginer } from '../classement.js';

const PERIODES = ['saison', 'aujourd_hui'];

export const classementRouter = Router();

// GET /api/v1/classement?periode=saison|aujourd_hui&page=1&limite=20
classementRouter.get('/classement', (req, res) => {
  const { periode } = req.query;

  if (!PERIODES.includes(periode)) {
    throw invalidParam("La période doit être 'saison' ou 'aujourd_hui'.");
  }

  const page = entier(req.query.page, 1);
  if (page === null || page < 1) {
    throw invalidParam('La page doit être un entier supérieur ou égal à 1.');
  }

  const limite = entier(req.query.limite, 20);
  if (limite === null || limite < 1 || limite > 100) {
    throw invalidParam('La limite doit être un entier compris entre 1 et 100.');
  }

  res.json({ periode, ...paginer(classer(periode), page, limite) });
});

// Paramètre optionnel : valeur par défaut si absent, null s'il n'est pas un entier.
function entier(valeur, defaut) {
  if (valeur === undefined) return defaut;
  if (typeof valeur !== 'string' || !/^-?\d+$/.test(valeur)) return null;
  return Number(valeur);
}

function invalidParam(message) {
  return new ApiError(400, 'INVALID_QUERY_PARAMETER', message);
}
