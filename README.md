# HuquqPro — Simulations RH Maroc

HuquqPro est maintenant organise comme une application statique securisee avec livraison privee par email :

- `index.html` : landing page lead-gen
- `app.html` : shell des 5 calculateurs
- `js/calculator.js` : logique de calcul
- `js/ui.js` : parcours email-only
- `js/email.js` : generation PDF + preparation de l'email
- `netlify/functions/send-simulation.mjs` : proxy securise Brevo + Airtable

## Modules couverts

- Rupture CDI
- Rupture CDD
- Depart volontaire
- Cotisations CNSS
- Calcul IGR / IR

## Architecture

- Frontend statique : HTML, CSS, vanilla JS
- Proxy securise : Netlify Functions
- Secrets : variables d'environnement uniquement
- Delivery : aucun detail chiffre n'est affiche a l'ecran, le PDF part par email

## Variables d'environnement

Copiez `.env.example` puis renseignez les valeurs cote Netlify :

```dotenv
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=HuquqPro
AIRTABLE_TOKEN=
AIRTABLE_BASE_ID=
AIRTABLE_TABLE=HuquqPro
APP_ORIGIN=http://localhost:8888
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Important : les anciennes cles exposees dans `js/config.js` doivent etre considerees comme compromises et doivent etre regenerees chez Brevo et Airtable.

## Lancer en local

Pour tester aussi la fonction serverless, utilisez Netlify Dev :

```bash
npm install -g netlify-cli
cd /home/el23j/cdicalc
netlify dev
```

Puis ouvrez l'URL locale fournie par Netlify, en general `http://localhost:8888`.

### Contournement si `netlify dev` plante sur Edge Functions

Certaines versions de Netlify CLI plantent pendant la preparation de l'environnement Edge Functions. Dans ce cas, utilisez deux terminaux :

```bash
# terminal 1
cd /home/el23j/cdicalc
python3 -m http.server 4174
```

```bash
# terminal 2
cd /home/el23j/cdicalc
set -a
source .env
set +a
npx netlify-cli functions:serve --port 9999
```

Puis ouvrez `http://127.0.0.1:4174/app.html?module=cdi`.

Important : dans ce mode, reglez `APP_ORIGIN` sur l'origine exacte du navigateur, par exemple `http://127.0.0.1:4174`.
L'application cible alors explicitement `http://127.0.0.1:9999/.netlify/functions/send-simulation`.

## Deploiement Netlify

1. Connectez ou importez le dossier sur Netlify.
2. Definissez toutes les variables d'environnement du fichier `.env.example`.
3. Verifiez que `netlify.toml` est pris en compte.
4. Deployez en production.

## Points de securite inclus

- suppression des secrets cote client
- fonction serverless same-origin
- sanitization de l'email et du nom
- honeypot anti-bot
- rate limiting compatible Upstash Redis
- CSP stricte via `netlify.toml`
- suppression des handlers inline dans l'application

## Limites actuelles

- la generation du PDF est faite dans le navigateur puis envoyee a la fonction
- pour une signature plus forte cote conformite, une phase 2 peut deplacer la generation PDF cote serveur

## Avertissement

Simulation indicative uniquement. Ne remplace pas un avis juridique, social ou fiscal professionnel.
