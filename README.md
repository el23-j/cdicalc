# Calculateur d'Indemnités CDI — Droit Marocain

Simulation complète des droits lors d'une rupture de CDI, basée sur le Code du Travail marocain (Loi n° 65-99).

## Couverture légale

- **Indemnité de préavis** — Art. 51 + Décret 2-04-469
- **Indemnité de licenciement** — Art. 52–53
- **Dommages & intérêts (licenciement abusif)** — Art. 41
- **Congés payés non pris** — Art. 238
- **Note fiscale** — Loi de Finances 2023 (exonération IR jusqu'à 1 000 000 MAD)

---

## Structure du projet

```
cdicalc/
├── index.html          # Application principale (structure HTML)
├── css/
│   └── style.css       # Styles complets (responsive, print)
├── js/
│   ├── calculator.js   # Logique de calcul (pur JS, sans dépendances)
│   └── ui.js           # Contrôleur DOM & rendu résultats
└── README.md
```

> **100% statique** — aucun backend, aucune dépendance npm, aucune installation requise.

---

## Lancer localement

### Option 1 — Ouvrir directement
Double-cliquez sur `index.html` dans votre explorateur de fichiers. L'application s'ouvre dans votre navigateur.

### Option 2 — Serveur local (recommandé pour éviter les problèmes CORS éventuels)

**Avec Python :**
```bash
cd cdicalc
python3 -m http.server 3000
# → Ouvrir http://localhost:3000
```

**Avec Node.js / npx :**
```bash
cd cdicalc
npx serve .
# → Ouvrir l'URL affichée
```

**Avec VS Code :**
Installez l'extension *Live Server*, clic droit sur `index.html` → *Open with Live Server*.

---

## Déployer en production

### Netlify (recommandé — gratuit)
1. Créez un compte sur [netlify.com](https://netlify.com)
2. Depuis le dashboard : **Add new site → Deploy manually**
3. Glissez-déposez le dossier `cdicalc/` sur la zone de dépôt
4. Votre site est en ligne en moins d'une minute

**Ou via Netlify CLI :**
```bash
npm install -g netlify-cli
cd cdicalc
netlify deploy --prod --dir .
```

### Vercel
```bash
npm install -g vercel
cd cdicalc
vercel --prod
```

### GitHub Pages
1. Créez un dépôt GitHub (public ou privé avec GitHub Pro)
2. Poussez le contenu du dossier `cdicalc/` à la racine du dépôt
3. Allez dans **Settings → Pages → Source → Deploy from branch → main**
4. Votre site est disponible à `https://votre-pseudo.github.io/nom-du-repo`

### Hébergement classique (cPanel, FTP, etc.)
Uploadez le contenu du dossier `cdicalc/` dans le répertoire `public_html/` ou équivalent.

---

## Formules implémentées

### Taux horaire
```
taux_horaire = salaire_mensuel_brut / 191
```

### Indemnité de préavis
| Catégorie | < 1 an | 1–5 ans | > 5 ans |
|-----------|--------|---------|---------|
| Non-cadre | 8 jours | 1 mois | 2 mois |
| Cadre     | 1 mois  | 2 mois | 3 mois |

```
montant_preavis = salaire * mois_preavis
```

### Indemnité de licenciement (tranches cumulatives)
| Tranche d'ancienneté | Taux annuel |
|----------------------|-------------|
| 0 – 5 ans            | 96 h/an     |
| 6 – 10 ans           | 144 h/an    |
| 11 – 15 ans          | 192 h/an    |
| > 15 ans             | 240 h/an    |

```
heures_totales = Σ (années_tranche × taux_tranche)
montant = heures_totales × taux_horaire
```
Éligibilité minimum : 6 mois d'ancienneté.

### Dommages & intérêts (licenciement abusif)
```
mois_DI = min(ancienneté_en_années × 1.5, 36)
montant_DI = mois_DI × salaire_mensuel
```

### Congés payés
```
salaire_journalier = salaire_mensuel / 26
montant_conges = jours_non_pris × salaire_journalier
```

---

## Avertissement légal

Cette application est fournie **à titre indicatif uniquement** et ne constitue pas un conseil juridique. En cas de litige, consultez un avocat spécialisé en droit du travail ou contactez l'Inspection du Travail marocaine.

**Références légales :**
- Code du Travail marocain — Loi n° 65-99
- Décret n° 2-04-469 (délais de préavis)
- Articles 41, 51, 52, 53, 238
- Loi de Finances 2023 (exonération fiscale)