import { joueurs, scoresPour } from './data/joueurs.js';

const joueursParId = new Map(joueurs.map((j) => [j.joueurId, j]));

// Tri stable garanti côté serveur : XP décroissant, puis dateAtteinte croissante.
// Rangs stricts et continus (1, 2, 3...), pas d'ex æquo.
export function classer(periode) {
  return scoresPour(periode)
    .sort((a, b) => b.xp - a.xp || a.dateAtteinte - b.dateAtteinte)
    .map((score, index) => {
      const joueur = joueursParId.get(score.joueurId);
      return {
        rang: index + 1,
        joueurId: joueur.joueurId,
        pseudo: joueur.pseudo,
        equipe: joueur.equipe,
        niveau: joueur.niveau,
        xp: score.xp,
      };
    });
}

export function paginer(entrees, page, limite) {
  const totalElements = entrees.length;
  const debut = (page - 1) * limite;

  return {
    pagination: {
      page,
      limite,
      totalElements,
      totalPages: Math.max(1, Math.ceil(totalElements / limite)),
    },
    entrees: entrees.slice(debut, debut + limite),
  };
}
