// Jeu de données en mémoire : 100 joueurs. `dateAtteinte` = moment où l'XP de la période a été obtenue,
// utilisé pour départager les égalités (premier arrivé, premier servi).

const joueursFixes = [
  { joueurId: 'p_1001', pseudo: 'Clément', equipe: 'Lisnard', niveau: 7 },
  { joueurId: 'p_1002', pseudo: 'Arthur', equipe: 'Lisnard', niveau: 6 },
  { joueurId: 'p_1013', pseudo: 'Sora_42', equipe: 'Null Pointers', niveau: 6 },
  { joueurId: 'p_1042', pseudo: 'Ishak MESSAOUDI', equipe: null, niveau: 3 },
  { joueurId: 'p_1008', pseudo: 'Maëlle', equipe: 'Pixel Brigade', niveau: 4 },
  { joueurId: 'p_1021', pseudo: 'Kenji.exe', equipe: 'Null Pointers', niveau: 3 },
  { joueurId: 'p_1017', pseudo: 'Lou', equipe: null, niveau: 2 },
  { joueurId: 'p_1030', pseudo: 'Baptiste', equipe: 'Pixel Brigade', niveau: 2 },
  { joueurId: 'p_1033', pseudo: 'Noa', equipe: 'Lisnard', niveau: 1 },
  { joueurId: 'p_1050', pseudo: 'Dylan', equipe: null, niveau: 1 },
  { joueurId: 'p_1051', pseudo: 'Dylan_Test', equipe: null, niveau: 1 },
];

const saison = [
  ['p_1001', 1240, '2026-10-21T18:02:00Z'],
  ['p_1002', 1105, '2026-10-24T09:41:00Z'],
  ['p_1013', 980, '2026-10-23T21:15:00Z'],
  ['p_1042', 533, '2026-10-19T14:30:00Z'],
  ['p_1008', 533, '2026-10-22T11:05:00Z'],
  ['p_1021', 410, '2026-10-20T16:48:00Z'],
  ['p_1017', 275, '2026-10-18T08:12:00Z'],
  ['p_1030', 190, '2026-10-17T19:33:00Z'],
  ['p_1033', 60, '2026-10-16T10:00:00Z'],
  ['p_1050', 0, '2026-10-01T08:00:00Z'],
  ['p_1051', 0, '2026-10-02T08:00:00Z'],
];

// Minutes écoulées depuis minuit, recalculées sur la date du jour.
const aujourdHui = [
  ['p_1002', 120, 9 * 60 + 12],
  ['p_1042', 120, 10 * 60 + 47],
  ['p_1021', 95, 8 * 60 + 30],
  ['p_1001', 80, 11 * 60 + 2],
  ['p_1017', 45, 7 * 60 + 55],
  ['p_1013', 30, 12 * 60 + 20],
  ['p_1008', 15, 9 * 60 + 3],
  ['p_1033', 10, 13 * 60 + 41],
  ['p_1030', 0, 0],
  ['p_1050', 0, 1],
  ['p_1051', 0, 2],
];

// --- 89 joueurs supplémentaires pour exercer la pagination ---
// Valeurs tirées d'un générateur pseudo-aléatoire à graine fixe : identiques à chaque démarrage.
// XP en multiples de 5 pour provoquer des égalités ; XP saison toujours > 0, donc Dylan et
// Dylan_Test (0 XP) restent les deux derniers (99ᵉ et 100ᵉ).

const PSEUDOS = [
  'Zoé_K', 'Hugo.dev', 'Inès', 'LéoLeLion', 'Jade_99', 'Nathan', 'Lina.exe', 'TomTom', 'Chloé_B', 'Enzo404',
  'Manon', 'Yanis_Rx', 'Camille', 'Mathis', 'SarahPx', 'Rayan_7', 'Emma', 'AdamZ', 'Léa_M', 'Malo',
  'Nora', 'Gabin', 'Alice_42', 'Louis.js', 'Romane', 'Timéo', 'Anaïs', 'Sacha', 'Elsa_V', 'Noé',
  'Clara', 'Ethan_X', 'Lucie', 'Axel', 'Mila', 'Paul_P', 'Ambre', 'Victor', 'Julia', 'Robin_H',
  'Margaux', 'Hélio', 'Rose', 'Liam_2B', 'Agathe', 'Nils', 'Iris', 'Oscar', 'Capucine', 'Marius',
  'Lola_Pix', 'Kylian', 'Héloïse', 'Eliott', 'Juliette', 'Gaspard', 'Zélie', 'Bastien', 'Océane', 'Thibault',
  'Pixel_Pam', 'NullCat', 'ByteMe', 'Glitchy', 'Sprite_Sam', 'Bit_Bob', 'Cache_Miss', 'Seg_Fault', 'Ctrl_Z', 'Ping_Pong',
  'Lag_Lucas', 'Respawn', 'Noob_Master', 'Combo_x3', 'Headshot_H', 'Speedrunner', 'Boss_Final', 'Checkpoint', 'Loot_Louise', 'Quest_Quentin',
  'Mana_Max', 'Crit_Chris', 'Tank_Théo', 'Healer_Hana', 'Mage_Marc', 'Rogue_Rémi', 'Bard_Béa', 'Paladin_Pia', 'Druid_Dan',
];

const EQUIPES = ['Lisnard', 'Null Pointers', 'Pixel Brigade', 'Les Respawns', 'Team Glitch', null, null];
const DEBUT_SAISON = Date.UTC(2026, 9, 1);

// mulberry32 : petit PRNG déterministe.
function prng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = prng(1042);
const entier = (max) => Math.floor(rand() * max);

const joueursGeneres = PSEUDOS.map((pseudo, i) => {
  const joueurId = `p_${1100 + i}`;
  const xpSaison = 5 * (2 + entier(230)); // 10 à 1155
  saison.push([joueurId, xpSaison, DEBUT_SAISON + entier(25 * 24 * 60) * 60_000]);
  aujourdHui.push([joueurId, 5 * entier(31), entier(14 * 60)]); // 0 à 150 XP, avant 14 h

  return {
    joueurId,
    pseudo,
    equipe: EQUIPES[entier(EQUIPES.length)],
    niveau: 1 + Math.floor(xpSaison / 200),
  };
});

export const joueurs = [...joueursFixes, ...joueursGeneres];

export function scoresPour(periode, now = new Date()) {
  if (periode === 'saison') {
    return saison.map(([joueurId, xp, date]) => ({ joueurId, xp, dateAtteinte: new Date(date) }));
  }

  const minuit = new Date(now);
  minuit.setHours(0, 0, 0, 0);
  return aujourdHui.map(([joueurId, xp, minutes]) => ({
    joueurId,
    xp,
    dateAtteinte: new Date(minuit.getTime() + minutes * 60_000),
  }));
}
