// Émet un JWT de développement pour le joueur courant.
// Avec --write-env, l'écrit dans frontend/.env.local (VITE_PLAYER_TOKEN) pour que le Front l'utilise.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import { config } from '../src/config.js';

const token = jwt.sign({ sub: 'p_1042' }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '7d' });

if (process.argv.includes('--write-env')) {
  const envPath = fileURLToPath(new URL('../../frontend/.env.local', import.meta.url));
  writeFileSync(envPath, `VITE_PLAYER_TOKEN=${token}\n`);
  console.log(`Jeton écrit dans ${envPath}`);
} else {
  console.log(token);
}
