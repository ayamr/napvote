# Sondage NapVote (Cloudflare Worker + D1)

Service minuscule qui reçoit les votes du sondage « pour qui comptez-vous voter ? » et renvoie les résultats.
Gratuit : le plan gratuit de Cloudflare couvre largement ce volume (100 000 requêtes par jour).

## Règles du sondage
- Anonyme : aucun nom, e-mail, téléphone. L'adresse IP n'est jamais stockée (seulement une empreinte salée, supprimée le lendemain, pour limiter le nombre de votes par réseau).
- Un choix par appareil, modifiable (empreinte salée de l'identifiant de l'appareil).
- Choix autorisés : les candidats à la présidence de la liste du CEP (fichier `https://napvote-ht.com/data/poll-options.json`, régénéré toutes les 2 h), « je ne sais pas encore », « je ne voterai pas ».
- Limite de 60 votes par jour et par réseau (réseaux mobiles partagés). Anti-robot facultatif : Cloudflare Turnstile.
- Sénat : jusqu'à 3 candidats par électeur (les pourcentages ne s'additionnent donc pas à 100 %) ; chaque scrutin propose aussi « Aucun candidat », « Je ne sais pas encore » et « Je ne voterai pas » (exclusifs).
- Anti-robot Cloudflare Turnstile actif (clé secrète dans les secrets du service, clé publique dans `www/js/config.js`). Mention « non scientifique » affichée partout.

## Déploiement (une fois)
```bash
cd poll
npm install
npx wrangler login                      # ouvre le navigateur : autoriser
npx wrangler d1 create napvote-poll     # copier le database_id affiché dans wrangler.toml
npm run db:remote                       # crée les tables
openssl rand -hex 32 | npx wrangler secret put SALT
npx wrangler deploy                     # affiche l'adresse https://napvote-poll.XXXX.workers.dev
```
Puis mettre cette adresse dans `www/js/config.js` (`pollUrl`), pousser sur GitHub : l'onglet « Sondage » apparaît.

## Anti-robot (recommandé avant de communiquer largement)
1. Cloudflare → Turnstile → Add site → domaine `napvote-ht.com` → mode « Managed ».
2. `npx wrangler secret put TURNSTILE_SECRET` (clé secrète) puis `npx wrangler deploy`.
3. Mettre la clé publique dans `www/js/config.js` (`turnstileKey`).

## Test en local
```bash
cp /dev/null .dev.vars && printf 'SALT=essai\nOPTIONS_URL=http://localhost:8766/data/poll-options.json\n' > .dev.vars
npm run db:local && npm run dev         # http://localhost:8787
# dans un autre terminal : npm run serve (à la racine), puis http://localhost:8766/?poll=http://localhost:8787#poll
```

## Remise à zéro des votes
`npx wrangler d1 execute napvote-poll --remote --command "DELETE FROM votes"`
