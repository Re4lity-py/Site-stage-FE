/* ===========================================================
   ALTONÉO — Module "Éditeur/SC → Plateforme Agréée"
   Logique front-end
   =========================================================== */

const API = '/api/correspondances';
let DONNEES = [];
let EDITION_ID = null;

/* ----------------------------- Menu déroulant — liste complète des correspondances ----------------------------- */
function toggleListeCorrespondances(){
  const panel = document.getElementById('liste-corr-panel');
  const btn   = document.getElementById('select-corr-btn');
  const ouvert = panel.classList.contains('ouvert');
  if(!ouvert){
    document.getElementById('filtre-corr').value = '';
    remplirListeCorrespondances();
  }
  panel.classList.toggle('ouvert', !ouvert);
  btn.classList.toggle('ouvert', !ouvert);
  if(!ouvert) document.getElementById('filtre-corr').focus();
}

function remplirListeCorrespondances(filtre){
  const zone = document.getElementById('liste-corr-lignes');
  const q = (filtre || '').trim().toLowerCase();
  const lignes = DONNEES.slice()
    .sort((a, b) => (a.editeur || a.sc).localeCompare(b.editeur || b.sc))
    .filter(d => !q || (d.editeur || '').toLowerCase().includes(q) || (d.sc || '').toLowerCase().includes(q));

  if(lignes.length === 0){
    zone.innerHTML = '<div class="liste-corr-vide">Aucun éditeur trouvé' + (q ? ' pour « ' + escapeHtml(q) + ' »' : '') + '.</div>';
    return;
  }

  zone.innerHTML = lignes.map(d => `
    <div class="liste-corr-ligne" onclick="selectionner(${d.id})">
      <span class="lc-editeur">${escapeHtml(d.editeur || d.sc)}</span>
    </div>`).join('');
}

function filtrerListeCorrespondances(){
  remplirListeCorrespondances(document.getElementById('filtre-corr').value);
}

// Fermer le menu si clic ailleurs
document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.selecteur-correspondance');
  if(wrapper && !wrapper.contains(e.target)){
    document.getElementById('liste-corr-panel').classList.remove('ouvert');
    document.getElementById('select-corr-btn').classList.remove('ouvert');
  }
});

/* ----------------------------- Onglets ----------------------------- */
function ongletPA(o){
  document.getElementById('tab-conseil').classList.toggle('actif', o === 'conseil');
  document.getElementById('tab-admin').classList.toggle('actif', o === 'admin');
  document.getElementById('pa-conseil').classList.toggle('actif', o === 'conseil');
  document.getElementById('pa-admin').classList.toggle('actif', o === 'admin');
}

/* ----------------------------- Menu : sens de la recherche (SC → PA / PA → SC) ----------------------------- */
function ongletSens(o){
  const tabScVersPa = document.getElementById('tab-sc-vers-pa');
  const tabPaVersSc = document.getElementById('tab-pa-vers-sc');
  const ecranScVersPa = document.getElementById('pa-conseil');
  const ecranPaVersSc = document.getElementById('pa-vers-sc');
  if(!tabScVersPa || !tabPaVersSc || !ecranScVersPa || !ecranPaVersSc) return;
  tabScVersPa.classList.toggle('actif', o === 'sc-vers-pa');
  tabPaVersSc.classList.toggle('actif', o === 'pa-vers-sc');
  ecranScVersPa.classList.toggle('actif', o === 'sc-vers-pa');
  ecranPaVersSc.classList.toggle('actif', o === 'pa-vers-sc');
}

/* ----------------------------- Menu déroulant — liste des Plateformes Agréées (mode PA → SC) ----------------------------- */
function togglePaListeUnique(){
  return [...new Set(DONNEES.map(d => d.pa).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function toggleListePA(){
  const panel = document.getElementById('liste-pa-panel');
  const btn   = document.getElementById('select-pa-btn');
  const ouvert = panel.classList.contains('ouvert');
  if(!ouvert){
    document.getElementById('filtre-pa').value = '';
    remplirListePA();
  }
  panel.classList.toggle('ouvert', !ouvert);
  btn.classList.toggle('ouvert', !ouvert);
  if(!ouvert) document.getElementById('filtre-pa').focus();
}

function remplirListePA(filtre){
  const zone = document.getElementById('liste-pa-lignes');
  const q = (filtre || '').trim().toLowerCase();
  const listePa = togglePaListeUnique().filter(pa => !q || pa.toLowerCase().includes(q));

  if(listePa.length === 0){
    zone.innerHTML = '<div class="liste-corr-vide">Aucune plateforme trouvée' + (q ? ' pour « ' + escapeHtml(q) + ' »' : '') + '.</div>';
    return;
  }

  zone.innerHTML = listePa.map(pa => `
    <div class="liste-corr-ligne" onclick="selectionnerPA('${pa.replace(/'/g, "\\'")}')">
      <span class="lc-editeur">${escapeHtml(pa)}</span>
    </div>`).join('');
}

function filtrerListePA(){
  remplirListePA(document.getElementById('filtre-pa').value);
}

// Fermer le menu PA si clic ailleurs
document.addEventListener('click', (e) => {
  const wrapper = document.querySelectorAll('.selecteur-correspondance')[1];
  if(wrapper && !wrapper.contains(e.target)){
    const panel = document.getElementById('liste-pa-panel');
    const btn = document.getElementById('select-pa-btn');
    if(panel) panel.classList.remove('ouvert');
    if(btn) btn.classList.remove('ouvert');
  }
});

function selectionnerPA(pa){
  document.getElementById('select-pa-label').textContent = pa;
  document.getElementById('select-pa-btn').classList.add('rempli');
  document.getElementById('liste-pa-panel').classList.remove('ouvert');
  document.getElementById('select-pa-btn').classList.remove('ouvert');

  const correspondances = DONNEES.filter(d => d.pa === pa)
    .sort((a, b) => (a.editeur || a.sc).localeCompare(b.editeur || b.sc));

  const zone = document.getElementById('res-sc-lignes');
  if(correspondances.length === 0){
    zone.innerHTML = '<div class="pa">—</div><div class="sous-ligne">Aucune solution compatible connue pour cette plateforme.</div>';
  } else {
    zone.innerHTML = correspondances.map(d => `
      <div style="margin-top:10px">
        <div class="pa" style="font-size:18px">${escapeHtml(d.sc)}</div>
        <div class="sous-ligne">${d.editeur ? 'Éditeur : ' + escapeHtml(d.editeur) : 'Via partenaire agréé'}</div>
      </div>`).join('');
  }
  document.getElementById('res-sc-liste').classList.add('on');
}

/* ----------------------------- Chargement des données ----------------------------- */
async function chargerDonnees(){
  try{
    const res = await fetch(API);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    DONNEES = await res.json();
  }catch(e){
    afficherStatutGlobal('erreur', '❌ Impossible de joindre le serveur (' + e.message + '). Vérifiez que "node server.js" est bien démarré.');
    DONNEES = [];
  }
  rafraichirTableAdmin();
  document.getElementById('nb-pa').textContent = DONNEES.length;
}

function afficherStatutGlobal(type, msg){
  const el = document.getElementById('statut-global');
  el.className = 'bandeau-statut on ' + type;
  el.textContent = msg;
  clearTimeout(window._tStatut);
  window._tStatut = setTimeout(() => el.classList.remove('on'), 6000);
}

/* ----------------------------- Consultation : sélection d'une correspondance ----------------------------- */

function selectionner(id){
  const d = DONNEES.find(x => x.id === id);
  if(!d) return;

  document.getElementById('select-corr-label').textContent = d.editeur || d.sc;
  document.getElementById('select-corr-btn').classList.add('rempli');
  document.getElementById('liste-corr-panel').classList.remove('ouvert');
  document.getElementById('select-corr-btn').classList.remove('ouvert');

  document.getElementById('res-pa-nom').textContent = d.pa || '—';
  document.getElementById('res-sousligne').textContent =
    'Via partenaire agréé' + (d.editeur ? ' · Éditeur : ' + d.editeur : '');
  document.getElementById('res-pa').classList.add('on');
}

function badgeConfiance(niveau){
  const n = (niveau || '').toLowerCase();
  let classe = 'tag';
  if(n.startsWith('élev') || n.startsWith('elev')) classe += ' niv-eleve';
  else if(n.startsWith('moyen')) classe += ' niv-moyen';
  else if(n.startsWith('faible')) classe += ' niv-faible';
  return '<span class="' + classe + '">' + escapeHtml(niveau) + '</span>';
}

/* ----------------------------- Table d'administration ----------------------------- */
function rafraichirTableAdmin(){
  const zone = document.getElementById('zone-table');
  if(DONNEES.length === 0){
    zone.innerHTML = '<p style="color:var(--texte-doux);font-size:13.5px">Aucune correspondance enregistrée. Ajoutez-en une ou importez un fichier Excel.</p>';
    return;
  }
  const lignes = DONNEES.slice().sort((a,b) => (a.pa+a.sc).localeCompare(b.pa+b.sc));
  zone.innerHTML = `
    <table class="tbl-admin">
      <thead><tr><th>PA</th><th>SC / Solution</th><th>Éditeur</th><th>Segment</th><th>Confiance</th><th></th></tr></thead>
      <tbody>
        ${lignes.map(d => `
          <tr>
            <td><b>${escapeHtml(d.pa)}</b></td>
            <td>${escapeHtml(d.sc)}</td>
            <td>${escapeHtml(d.editeur || '—')}</td>
            <td>${escapeHtml(d.segment || '—')}</td>
            <td>${d.niveauConfiance ? badgeConfiance(d.niveauConfiance) : '—'}</td>
            <td class="actions-ligne">
              <button class="edit" title="Modifier" onclick="ouvrirModale(${d.id})">✎</button>
              <button class="del" title="Supprimer" onclick="supprimerCorrespondance(${d.id})">✕</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  document.getElementById('nb-pa').textContent = DONNEES.length;
}

/* ----------------------------- Modale Ajout / Modification ----------------------------- */
function ouvrirModale(id){
  EDITION_ID = id || null;
  const champs = ['pa','sc','editeur','segment','nature','perimetre','source','confiance','date','url','commentaire'];
  const map = { nature:'natureLien', source:'sourcePrincipale', confiance:'niveauConfiance', date:'dateConsultation', url:'urlSource' };
  if(id){
    const d = DONNEES.find(x => x.id === id);
    document.getElementById('modale-titre').textContent = 'Modifier la correspondance';
    champs.forEach(c => { const cle = map[c] || c; document.getElementById('f-' + c).value = d[cle] || ''; });
  } else {
    document.getElementById('modale-titre').textContent = 'Ajouter une correspondance';
    document.getElementById('form-corr').reset();
  }
  document.getElementById('modale-fond').classList.add('on');
}

function fermerModale(){
  document.getElementById('modale-fond').classList.remove('on');
  EDITION_ID = null;
}

async function enregistrerCorrespondance(ev){
  ev.preventDefault();
  const corps = {
    pa: document.getElementById('f-pa').value.trim(),
    sc: document.getElementById('f-sc').value.trim(),
    editeur: document.getElementById('f-editeur').value.trim(),
    segment: document.getElementById('f-segment').value.trim(),
    natureLien: document.getElementById('f-nature').value.trim(),
    perimetre: document.getElementById('f-perimetre').value.trim(),
    sourcePrincipale: document.getElementById('f-source').value.trim(),
    niveauConfiance: document.getElementById('f-confiance').value.trim(),
    dateConsultation: document.getElementById('f-date').value.trim(),
    urlSource: document.getElementById('f-url').value.trim(),
    commentaire: document.getElementById('f-commentaire').value.trim()
  };
  try{
    const url = EDITION_ID ? (API + '/' + EDITION_ID) : API;
    const methode = EDITION_ID ? 'PUT' : 'POST';
    const res = await fetch(url, { method: methode, headers: {'Content-Type':'application/json'}, body: JSON.stringify(corps) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.erreur || ('HTTP ' + res.status));
    fermerModale();
    await chargerDonnees();
    afficherStatutGlobal('succes', '✅ Correspondance enregistrée.');
  }catch(e){
    alert('Erreur : ' + e.message);
  }
  return false;
}

async function supprimerCorrespondance(id){
  const d = DONNEES.find(x => x.id === id);
  if(!confirm('Supprimer la correspondance « ' + (d ? d.sc : id) + ' » ?')) return;
  try{
    const res = await fetch(API + '/' + id, { method: 'DELETE' });
    if(!res.ok){ const data = await res.json(); throw new Error(data.erreur || ('HTTP ' + res.status)); }
    await chargerDonnees();
    afficherStatutGlobal('succes', '🗑️ Correspondance supprimée.');
  }catch(e){
    alert('Erreur : ' + e.message);
  }
}

/* ----------------------------- Import Excel ----------------------------- */
function importerExcel(ev){
  const f = ev.target.files[0];
  if(!f) return;
  const info = document.getElementById('import-info');
  const mode = document.getElementById('mode-import').value;
  const reader = new FileReader();
  reader.onload = async function(e){
    try{
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const nomFeuille = wb.SheetNames.find(n => /cartographie/i.test(n)) || wb.SheetNames[0];
      const ws = wb.Sheets[nomFeuille];
      const lignes = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if(lignes.length === 0){ info.textContent = '⚠️ Le fichier ne contient aucune ligne de données.'; info.style.color = 'var(--rose)'; ev.target.value = ''; return; }
      const res = await fetch('/api/import', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ lignes, mode }) });
      const data = await res.json();
      if(!res.ok) throw new Error(data.erreur || ('HTTP ' + res.status));
      info.textContent = `✅ ${data.ajoutees} ajoutée(s), ${data.miseAjour} mise(s) à jour` +
        (data.ignorees ? `, ${data.ignorees} ignorée(s)` : '') + ` — total : ${data.total}.`;
      info.style.color = 'var(--vert)';
      await chargerDonnees();
    }catch(err){
      info.textContent = '❌ ' + err.message;
      info.style.color = 'var(--rose)';
    }
    ev.target.value = '';
  };
  reader.readAsArrayBuffer(f);
}

function telechargerModele(){
  const donnees = [
    { 'PA':'Pennylane', 'SC':'Nom du logiciel', 'Éditeur':'Nom de l\'éditeur' },
    { 'PA':'Pennylane', 'SC':'', 'Éditeur':'Pennylane' }
  ];
  const ws = XLSX.utils.json_to_sheet(donnees);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PA-SC-Editeur');
  XLSX.writeFile(wb, 'modele-import-PA-SC.xlsx');
}

/* ----------------------------- Utilitaires ----------------------------- */
function escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ----------------------------- Init ----------------------------- */
chargerDonnees();
