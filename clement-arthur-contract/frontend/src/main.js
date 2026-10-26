import { fetchClassement } from './api.js';

const LIBELLES = { saison: 'Saison', aujourd_hui: "Aujourd'hui" };
const TOP = 3;

const state = { periode: 'saison', page: 1 };
let controller = null;
let hasRows = false;
let typing = null;

const $ = (id) => document.getElementById(id);
const els = {
  tabs: [...document.querySelectorAll('[role="tab"]')],
  board: $('board'),
  label: $('board-label'),
  table: $('table'),
  rows: $('rows'),
  dialog: $('dialog'),
  dialogCode: $('dialog-code'),
  dialogText: $('dialog-text'),
  prev: $('prev'),
  next: $('next'),
  pageIndicator: $('page-indicator'),
  status: $('status'),
};

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const nombre = new Intl.NumberFormat('fr-FR');
const pad = (n) => String(n).padStart(2, '0');

function h(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((c) => c != null));
  return node;
}

/* ---------- Chargement ---------- */

async function load() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  setBusy(true);
  if (!hasRows) renderSkeleton();

  try {
    renderBoard(await fetchClassement(state, signal));
  } catch (err) {
    if (err.name === 'AbortError') return;
    renderError(err);
  } finally {
    if (!signal.aborted) setBusy(false);
  }
}

function setBusy(busy) {
  els.board.setAttribute('aria-busy', String(busy));
}

/* ---------- Rendu ---------- */

function renderBoard({ periode, pagination, entrees }) {
  const libelle = LIBELLES[periode];
  els.label.textContent = libelle;

  renderPager(pagination);

  if (entrees.length === 0) {
    hasRows = false;
    showDialog({ code: 'Classement', text: 'Aucun joueur classé pour cette période.', tone: 'info' });
    announce(`${libelle} : aucun joueur classé.`);
    return;
  }

  hideDialog();
  els.rows.replaceChildren(...entrees.map(createRow));
  hasRows = true;
  announce(`${libelle}, page ${pagination.page} sur ${pagination.totalPages}.`);
}

function createRow(entree, index) {
  const isTop = entree.rang <= TOP;

  const row = h('tr', { className: isTop ? 'row is-top' : 'row' });
  row.setAttribute('role', 'row');
  row.dataset.joueurId = entree.joueurId;
  row.style.setProperty('--i', index);

  // Joueur sans équipe : `equipe` vaut null, le Front affiche « — ».
  const equipe =
    entree.equipe !== null
      ? [entree.equipe]
      : [h('span', { className: 'none', ariaHidden: 'true', textContent: '—' }), h('span', { className: 'sr-only', textContent: 'Sans équipe' })];

  row.append(
    cell('c-rank', h('span', { className: 'rank', textContent: pad(entree.rang) })),
    cell('c-name', h('span', { className: 'name', textContent: entree.pseudo })),
    cell('c-team', ...equipe),
    cell('c-level', h('span', { className: 'lv' }, h('small', { textContent: 'Nv' }), String(entree.niveau))),
    cell('c-xp', h('span', { className: 'xp', textContent: nombre.format(entree.xp).replace(/\s/g, ' ') }), h('small', { className: 'xp-unit', textContent: 'XP' })),
  );

  return row;
}

function cell(className, ...children) {
  const td = h('td', { className }, ...children);
  td.setAttribute('role', 'cell');
  return td;
}

function renderSkeleton() {
  hideDialog();
  const rows = Array.from({ length: 6 }, (_, i) => {
    const row = h('tr', { className: 'row skeleton' });
    row.style.setProperty('--i', i);
    row.append(
      h('td', { className: 'c-rank' }, h('span', { className: 'rank' })),
      h('td', { className: 'c-name' }, h('span', { className: 'sk sk-name' })),
      h('td', { className: 'c-team' }, h('span', { className: 'sk sk-team' })),
      h('td', { className: 'c-level' }, h('span', { className: 'sk sk-lv' })),
      h('td', { className: 'c-xp' }, h('span', { className: 'sk sk-xp' })),
    );
    return row;
  });
  els.rows.replaceChildren(...rows);
}

// Erreur au format unique ApiError : on affiche son code et son message.
function renderError(err) {
  hasRows = false;
  renderPager(null);
  showDialog({ code: err.code, text: err.message, tone: 'error' });
  announce(`Erreur ${err.code} : ${err.message}`);
}

// Pagination pilotée par PaginationMeta : bouton désactivé et nombre de pages.
function renderPager(pagination) {
  const page = pagination?.page;
  const total = pagination?.totalPages;

  els.pageIndicator.replaceChildren('Page ', h('b', { textContent: page ? pad(page) : '--' }), ' / ', h('b', { textContent: total ? pad(total) : '--' }));
  els.prev.disabled = !pagination || page <= 1;
  els.next.disabled = !pagination || page >= total;
}

function showDialog({ code, text, tone }) {
  els.table.hidden = true;
  els.dialog.hidden = false;
  els.dialog.dataset.tone = tone;
  els.dialogCode.textContent = code;
  typeText(els.dialogText, text);
}

function hideDialog() {
  clearInterval(typing);
  els.dialog.hidden = true;
  els.table.hidden = false;
}

// Effet « boîte de dialogue » : le message s'écrit lettre par lettre.
function typeText(node, text) {
  clearInterval(typing);
  if (reducedMotion.matches) {
    node.textContent = text;
    return;
  }
  let i = 0;
  node.textContent = '';
  typing = setInterval(() => {
    node.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(typing);
  }, 24);
}

function announce(message) {
  els.status.textContent = message;
}

/* ---------- Interactions ---------- */

function selectTab(tab, { focus = false } = {}) {
  for (const t of els.tabs) {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
  }
  if (focus) tab.focus();
  els.board.setAttribute('aria-labelledby', tab.id);

  if (state.periode === tab.dataset.periode) return;
  state.periode = tab.dataset.periode;
  state.page = 1;
  load();
}

for (const tab of els.tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    const i = els.tabs.indexOf(tab);
    const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: els.tabs.length - 1 - i };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const target = els.tabs[(i + moves[event.key] + els.tabs.length) % els.tabs.length];
    selectTab(target, { focus: true });
  });
}

function goToPage(page) {
  state.page = page;
  load();
  if (els.board.getBoundingClientRect().top < 0) {
    els.board.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
}

els.prev.addEventListener('click', () => goToPage(state.page - 1));
els.next.addEventListener('click', () => goToPage(state.page + 1));

load();
