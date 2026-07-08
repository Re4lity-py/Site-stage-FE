/**
 * ALTONÉO — Serveur unifié
 * Sert l'ensemble du site : menu, tuile_1 (offres), tuile_2 (PA) + API REST.
 *
 * Structure des fichiers statiques :
 *   public/
 *     index.html            → menu principal
 *     styles.css            → feuille de style commune
 *     tuile_1/
 *       index.html          → panorama des offres
 *       secteurs/batiment.html, agriculture.html, commerce.html, services.html
 *       fiches/pdf/*.pdf
 *     tuile_2/
 *       index.html          → PA (Plateforme Agréée)
 *       app.js
 *       module2.css
 *   data/
 *     db.json               → base de données PA
 *
 * Démarrage : node server.js
 * Par défaut  : http://localhost:3000
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');

const PORT       = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR   = path.join(__dirname, 'data');
const DB_FILE    = path.join(DATA_DIR, 'db.json');

/* ================================================================
   BASE DE DONNÉES (db.json)
   ================================================================ */

const CHAMPS = [
  'pa', 'sc', 'editeur', 'segment', 'natureLien',
  'perimetre', 'sourcePrincipale', 'niveauConfiance',
  'commentaire', 'urlSource', 'dateConsultation'
];

const ALIAS_COLONNES = {
  pa:               ['pa', 'pa associee', 'pa associée', 'plateforme agreee', 'plateforme agréée', 'plateforme'],
  sc:               ['sc', 'sc / solution', 'sc/solution', 'solution', 'logiciel'],
  editeur:          ['editeur / groupe', 'éditeur / groupe', 'editeur', 'éditeur', 'groupe'],
  segment:          ['segment'],
  natureLien:       ['nature du lien pa-sc', 'nature du lien', 'nature'],
  perimetre:        ['perimetre annonce', 'périmètre annoncé', 'perimetre', 'périmètre'],
  sourcePrincipale: ['source principale', 'source'],
  niveauConfiance:  ['niveau de confiance', 'confiance'],
  commentaire:      ['commentaire / verification', 'commentaire / vérification', 'commentaire', 'detail', 'détail'],
  urlSource:        ['url source', 'url', 'lien source', 'lien'],
  dateConsultation: ['date consultation', 'date de consultation', 'date']
};

function normaliser(txt) {
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function lireDB() {
  if (!fs.existsSync(DB_FILE)) {
    const vide = { correspondances: [], nextId: 1 };
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(vide, null, 2), 'utf-8');
    return vide;
  }
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); }
  catch (e) { throw new Error('db.json corrompu : ' + e.message); }
}

function ecrireDB(db) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_FILE);
}

function nettoyerEntree(input) {
  const obj = {};
  CHAMPS.forEach(c => { obj[c] = (input[c] != null) ? String(input[c]).trim() : ''; });
  return obj;
}

function mapperColonnes(ligneBrute) {
  const sortie = {};
  Object.keys(ligneBrute || {}).forEach(cle => {
    const cleNorm = normaliser(cle);
    for (const champ of CHAMPS) {
      if (sortie[champ]) continue;
      if ((ALIAS_COLONNES[champ] || []).includes(cleNorm)) sortie[champ] = ligneBrute[cle];
    }
  });
  CHAMPS.forEach(c => { if (!sortie[c] && ligneBrute[c] !== undefined) sortie[c] = ligneBrute[c]; });
  return sortie;
}

/* ================================================================
   HELPERS HTTP
   ================================================================ */

function envoyerJSON(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type':  'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function lireCorpsJSON(req, callback) {
  const chunks = []; let taille = 0;
  req.on('data', d => {
    taille += d.length;
    if (taille > 25 * 1024 * 1024) { req.destroy(); return; }
    chunks.push(d);
  });
  req.on('end', () => {
    const brut = Buffer.concat(chunks).toString('utf-8');
    if (!brut) return callback(null, {});
    try { callback(null, JSON.parse(brut)); } catch (e) { callback(e); }
  });
}

/* ================================================================
   ROUTES API  /api/*
   ================================================================ */

function gererAPI(req, res, urlObj) {
  const segments = urlObj.pathname.split('/').filter(Boolean); // ['api','correspondances','12']
  const ressource = segments[1];
  const id = segments[2] ? Number(segments[2]) : null;

  // GET /api/correspondances
  if (ressource === 'correspondances' && req.method === 'GET' && !id)
    return envoyerJSON(res, 200, lireDB().correspondances);

  // POST /api/correspondances
  if (ressource === 'correspondances' && req.method === 'POST' && !id)
    return lireCorpsJSON(req, (err, corps) => {
      if (err) return envoyerJSON(res, 400, { erreur: 'JSON invalide' });
      if (!corps.pa || !corps.sc) return envoyerJSON(res, 400, { erreur: 'Les champs "pa" et "sc" sont obligatoires.' });
      const db = lireDB();
      const entree = Object.assign({ id: db.nextId++ }, nettoyerEntree(corps));
      db.correspondances.push(entree);
      ecrireDB(db);
      envoyerJSON(res, 201, entree);
    });

  // PUT /api/correspondances/:id
  if (ressource === 'correspondances' && req.method === 'PUT' && id)
    return lireCorpsJSON(req, (err, corps) => {
      if (err) return envoyerJSON(res, 400, { erreur: 'JSON invalide' });
      const db = lireDB();
      const idx = db.correspondances.findIndex(c => c.id === id);
      if (idx === -1) return envoyerJSON(res, 404, { erreur: 'Correspondance introuvable.' });
      if (!corps.pa || !corps.sc) return envoyerJSON(res, 400, { erreur: 'Les champs "pa" et "sc" sont obligatoires.' });
      db.correspondances[idx] = Object.assign({ id }, nettoyerEntree(corps));
      ecrireDB(db);
      envoyerJSON(res, 200, db.correspondances[idx]);
    });

  // DELETE /api/correspondances/:id
  if (ressource === 'correspondances' && req.method === 'DELETE' && id) {
    const db = lireDB();
    const avant = db.correspondances.length;
    db.correspondances = db.correspondances.filter(c => c.id !== id);
    if (db.correspondances.length === avant) return envoyerJSON(res, 404, { erreur: 'Introuvable.' });
    ecrireDB(db);
    return envoyerJSON(res, 200, { ok: true });
  }

  // DELETE /api/correspondances  (vider la table)
  if (ressource === 'correspondances' && req.method === 'DELETE' && !id) {
    const db = lireDB(); db.correspondances = []; ecrireDB(db);
    return envoyerJSON(res, 200, { ok: true });
  }

  // POST /api/import
  if (ressource === 'import' && req.method === 'POST')
    return lireCorpsJSON(req, (err, corps) => {
      if (err) return envoyerJSON(res, 400, { erreur: 'JSON invalide' });
      const lignes = Array.isArray(corps.lignes) ? corps.lignes : [];
      const mode   = corps.mode === 'remplacer' ? 'remplacer' : 'fusion';
      const db = lireDB();
      if (mode === 'remplacer') db.correspondances = [];
      let ajoutees = 0, miseAjour = 0, ignorees = 0;
      lignes.forEach(ligne => {
        const e = nettoyerEntree(mapperColonnes(ligne));
        // La colonne SC peut être vide (ex. la PA est elle-même la solution) :
        // dans ce cas on retombe sur l'Éditeur pour ne pas perdre la ligne.
        if (!e.sc && e.editeur) e.sc = e.editeur;
        // Seule la colonne PA est réellement indispensable.
        if (!e.pa) { ignorees++; return; }
        if (!e.sc) e.sc = e.pa;
        const idx = db.correspondances.findIndex(c =>
          normaliser(c.pa) === normaliser(e.pa) && normaliser(c.sc) === normaliser(e.sc));
        if (idx >= 0) { db.correspondances[idx] = Object.assign({ id: db.correspondances[idx].id }, e); miseAjour++; }
        else { db.correspondances.push(Object.assign({ id: db.nextId++ }, e)); ajoutees++; }
      });
      ecrireDB(db);
      envoyerJSON(res, 200, { ajoutees, miseAjour, ignorees, total: db.correspondances.length });
    });

  envoyerJSON(res, 404, { erreur: 'Route API inconnue.' });
}

/* ================================================================
   FICHIERS STATIQUES
   ================================================================ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function servirStatique(req, res, urlObj) {
  let chemin = decodeURIComponent(urlObj.pathname);
  if (chemin === '/' || chemin.endsWith('/')) chemin = chemin + 'index.html';
  const cheminAbsolu = path.normalize(path.join(PUBLIC_DIR, chemin));
  if (!cheminAbsolu.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Accès interdit'); }

  // Essaie d'abord le chemin tel quel, puis ajoute .html si absent d'extension
  function lireFichier(cible, cb) {
    fs.readFile(cible, (err, data) => {
      if (!err) return cb(null, cible, data);
      // Pas d'extension ? essaie avec .html
      if (!path.extname(cible)) {
        fs.readFile(cible + '.html', (err2, data2) => {
          if (!err2) return cb(null, cible + '.html', data2);
          cb(err);
        });
      } else {
        cb(err);
      }
    });
  }

  lireFichier(cheminAbsolu, (err, fichierFinal, contenu) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 — Page non trouvée'); }
    const ext = path.extname(fichierFinal).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(contenu);
  });
}

/* ================================================================
   SERVEUR
   ================================================================ */

http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (urlObj.pathname.startsWith('/api/')) {
    try { gererAPI(req, res, urlObj); }
    catch (e) { envoyerJSON(res, 500, { erreur: 'Erreur serveur : ' + e.message }); }
    return;
  }

  servirStatique(req, res, urlObj);

}).listen(PORT, () => {
  console.log('');
  console.log('  ALTONÉO — Serveur unifié');
  console.log('  http://localhost:' + PORT);
  console.log('  Base de données : ' + DB_FILE);
  console.log('  (Ctrl+C pour arrêter)');
  console.log('');
});
