/* ALTONÉO — Tuile 3 : moteur de fil de réponses du questionnaire
   Le parcours est porté entièrement par l'URL (paramètre "t"),
   chaque étape ajoute son libellé de réponse au fil existant. */

function lireFil() {
  const params = new URLSearchParams(window.location.search);
  const t = params.get('t');
  if (!t) return [];
  return t.split('|').map(decodeURIComponent).filter(Boolean);
}

function urlAvecFil(base, fil, nouvelleReponse) {
  const liste = nouvelleReponse ? [...fil, nouvelleReponse] : [...fil];
  const t = liste.map(encodeURIComponent).join('|');
  if (!t) return base;
  const separateur = base.indexOf('?') === -1 ? '?' : '&';
  return base + separateur + 't=' + t;
}

const ICONES_SECTEUR = {
  'Bâtiment': '🏗️',
  'Agriculture': '🌾',
  'ESS': '🌱',
  'Commerce': '🛍️'
};

function afficherFil(conteneurId) {
  const conteneur = document.getElementById(conteneurId);
  if (!conteneur) return;
  const fil = lireFil();
  conteneur.innerHTML = fil.map((reponse, i) => {
    const estSecteur = i === 0;
    const icone = ICONES_SECTEUR[reponse] || '🏗️';
    return '<span class="puce' + (estSecteur ? ' secteur' : '') + '">' +
      (estSecteur ? icone + ' ' : '<span class="fl">✓</span> ') +
      reponse + '</span>';
  }).join('');
}
