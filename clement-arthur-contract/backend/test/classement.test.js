import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';

const secret = 'test-secret';
const token = jwt.sign({ sub: 'p_1042' }, secret);
let server;
let baseUrl;

before(async () => {
  const app = createApp({ jwtSecret: secret, rateLimit: { max: 1000, windowMs: 60_000 } });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => server.close());

function get(query, headers = { Authorization: `Bearer ${token}` }) {
  return fetch(`${baseUrl}/api/v1/classement${query}`, { headers });
}

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

test('200 : enveloppe, pagination par défaut et rangs continus', async () => {
  const res = await get('?periode=saison');
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.equal(body.periode, 'saison');
  assert.deepEqual(body.pagination, { page: 1, limite: 20, totalElements: 100, totalPages: 5 });
  assert.deepEqual(body.entrees.map((e) => e.rang), range(1, 20));

  for (const entree of body.entrees) {
    assert.deepEqual(Object.keys(entree), ['rang', 'joueurId', 'pseudo', 'equipe', 'niveau', 'xp']);
    assert.match(entree.joueurId, /^p_[0-9]+$/);
  }
});

test('égalités départagées par date d’obtention, équipe toujours présente', async () => {
  const { entrees } = await (await get('?periode=saison&limite=100')).json();
  assert.equal(entrees.length, 100);

  const dylan = entrees.find((e) => e.pseudo === 'Dylan');
  const dylanTest = entrees.find((e) => e.pseudo === 'Dylan_Test');
  assert.equal(dylan.rang, 99);
  assert.equal(dylanTest.rang, 100);
  assert.equal(dylan.equipe, null);

  for (let i = 1; i < entrees.length; i++) {
    assert.ok(entrees[i - 1].xp >= entrees[i].xp);
  }
});

test('pagination : page 2 avec limite 5', async () => {
  const body = await (await get('?periode=aujourd_hui&page=2&limite=5')).json();
  assert.equal(body.periode, 'aujourd_hui');
  assert.deepEqual(body.pagination, { page: 2, limite: 5, totalElements: 100, totalPages: 20 });
  assert.deepEqual(body.entrees.map((e) => e.rang), [6, 7, 8, 9, 10]);
});

test('pagination : dernière page partielle et page hors limites', async () => {
  const derniere = await (await get('?periode=saison&page=4&limite=30')).json();
  assert.deepEqual(derniere.pagination, { page: 4, limite: 30, totalElements: 100, totalPages: 4 });
  assert.deepEqual(derniere.entrees.map((e) => e.rang), range(91, 100));

  const horsLimites = await get('?periode=saison&page=99');
  assert.equal(horsLimites.status, 200);
  assert.deepEqual((await horsLimites.json()).entrees, []);
});

test('pagination : les pages se suivent sans trou ni doublon', async () => {
  const ids = [];
  for (let page = 1; page <= 7; page++) {
    const { entrees } = await (await get(`?periode=saison&page=${page}&limite=15`)).json();
    ids.push(...entrees.map((e) => e.joueurId));
  }

  const { entrees: tout } = await (await get('?periode=saison&limite=100')).json();
  assert.deepEqual(ids, tout.map((e) => e.joueurId));
});

test('400 : paramètres invalides', async () => {
  for (const query of ['', '?periode=semaine', '?periode=saison&page=0', '?periode=saison&page=-1',
    '?periode=saison&page=abc', '?periode=saison&limite=0', '?periode=saison&limite=101']) {
    const res = await get(query);
    assert.equal(res.status, 400, query);
    const body = await res.json();
    assert.equal(body.code, 'INVALID_QUERY_PARAMETER');
    assert.equal(typeof body.message, 'string');
  }
});

test('401 : jeton manquant, invalide ou expiré', async () => {
  const expired = jwt.sign({ sub: 'p_1042', exp: Math.floor(Date.now() / 1000) - 10 }, secret);
  const cases = [{}, { Authorization: 'Bearer nope' }, { Authorization: `Bearer ${expired}` },
    { Authorization: `Bearer ${jwt.sign({ sub: 'x' }, 'autre-secret')}` }];

  for (const headers of cases) {
    const res = await get('?periode=saison', headers);
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), {
      code: 'INVALID_TOKEN',
      message: "Le jeton d'authentification est manquant ou invalide.",
    });
  }
});

test('429 : limite d’appels atteinte', async () => {
  const app = createApp({ jwtSecret: secret, rateLimit: { max: 2, windowMs: 60_000 } });
  const limited = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const url = `http://localhost:${limited.address().port}/api/v1/classement?periode=saison`;
  const headers = { Authorization: `Bearer ${token}` };

  assert.equal((await fetch(url, { headers })).status, 200);
  assert.equal((await fetch(url, { headers })).status, 200);
  const res = await fetch(url, { headers });
  assert.equal(res.status, 429);
  assert.equal((await res.json()).code, 'RATE_LIMITED');

  limited.close();
});
