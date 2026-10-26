const TOKEN = import.meta.env.VITE_PLAYER_TOKEN;

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// GET /api/v1/classement — toutes les erreurs remontent au format { code, message }.
// `limite` n'est pas envoyé : le serveur applique sa valeur par défaut (20).
export async function fetchClassement({ periode, page }, signal) {
  const params = new URLSearchParams({ periode, page });
  const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

  let res;
  try {
    res = await fetch(`/api/v1/classement?${params}`, { headers, signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Impossible de joindre le serveur.');
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.code ?? 'UNKNOWN_ERROR',
      body?.message ?? `Le serveur a répondu ${res.status}.`,
    );
  }

  return body;
}
