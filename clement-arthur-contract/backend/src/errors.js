// Format unique ApiError { code, message } pour tous les codes HTTP d'erreur (principe 5 du contrat).
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function sendError(res, status, code, message) {
  res.status(status).json({ code, message });
}

export function notFound(req, res) {
  sendError(res, 404, 'NOT_FOUND', `Ressource introuvable : ${req.method} ${req.path}`);
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return sendError(res, err.status, err.code, err.message);
  }
  console.error(err);
  sendError(res, 500, 'INTERNAL_ERROR', 'Une erreur interne est survenue.');
}
