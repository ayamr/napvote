# Sondage NapVote (Cloudflare Worker + D1)

Service minuscule qui reçoit les votes du sondage « pour qui comptez-vous voter ? » et renvoie les résultats.
Gratuit : le plan gratuit de Cloudflare couvre largement ce volume (100 000 requêtes par jour).

## Règles du sondage
- Anonyme : aucun nom, e-mail, téléphone. L'adresse IP n'est jamais stockée (seulement une empreinte salée, supprimée le lendemain, pour limiter le nombre de votes par réseau, 400 par jour). Seules des statistiques par pays et région approximatifs (table `geo_daily`, sans identifiant) sont comptées.
- Détection d'envois en masse : une signature technique grossière (navigateur, écran arrondi, fuseau, langue) est mélangée à l'adresse réseau et à un secret (table `cluster`, 7 jours, aucun lien avec les bulletins), et les envois sont comptés par opérateur réseau (`asn_daily`). `CLUSTER_MAX` (0 par défaut) permet de plafonner les nouveaux appareils par groupe et par jour. Pour le président, le Sénat et les députés, la répartition des choix d'un groupe est comptée (`cluster_choice`, 7 jours) seulement à partir du `CLUSTER_TRACK`-ième envoi du jour (10) : un appareil ou un petit groupe ne laisse aucune trace. Le rapport `anomalies.sql` n'affiche que l'écart à la moyenne, jamais un nom de candidat. Les envois sont aussi comptés par heure, opérateur réseau et département déclaré (`asn_hour`, 14 jours), et les choix de président par opérateur déjà actif (`asn_choice`, `ASN_TRACK`).
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

## Réseaux refusés
Les envois venant d'hébergeurs de serveurs, de VPN grand public et de relais privés (liste `HOSTING` dans `src/worker.js`, détectée d'après le nom de l'opérateur réseau) sont refusés avec le message `poll.net`. `BLOCK_HOSTING = "0"` désactive la règle. Les refus sont comptés par jour et par opérateur dans `blocked_daily`.

## Adresse protégée
Le service est rattaché à `poll.napvote-ht.com` (route `custom_domain` dans `wrangler.toml`), ce qui permet d'appliquer les règles de sécurité de Cloudflare (WAF, limite de débit, analyse de sécurité). Quand tous les clients utilisent cette adresse, renseigner `VOTE_HOST = "poll.napvote-ht.com"` pour refuser les envois arrivant par `workers.dev`.

## Retrait des envois anormaux
La table `excluded_cells` (opérateur réseau `asn`, heures UTC `hour_from` à `hour_to` au format `2026-10-24T03`, `dept` ou `*`) désigne des cellules dont l'excédent de choix de président par rapport au département est retiré **à l'affichage** (aucun bulletin n'est modifié). Pour annuler : `DELETE FROM excluded_cells WHERE ...`. Le service renvoie le nombre d'envois retirés dans `scopes.pres.adj`, que le site signale sous les résultats.

## Sécurité du sondage (v12)
- **Résultats publiés chaque heure** : la tâche planifiée (17 min après l'heure) copie les totaux dans `tally_pub` / `tally_tot_pub` ; `/results` lit cet instantané et renvoie `asof`. Le site affiche des pourcentages entiers et un total arrondi.
- **Défi signé** : `POST /challenge {device}` renvoie `{t, n, s, min}` ; `/vote` doit présenter ce jeton (`ch`) entre 5 s et 30 min après sa création, une seule fois (`challenge_used`). Avec `REQUIRE_CHALLENGE = "1"`, le jeton Turnstile doit aussi porter `cdata = device` et `action = vote`. Activer `"1"` seulement une fois le site à jour publié.
- **Empreinte du navigateur** (web uniquement, jamais dans les applications) : le site envoie `fp` (SHA-256), le service ne garde que `sha256(fp | SALT | semaine)` dans `fp_week` (8 jours). `FP_MAX = "0"` : détection seulement ; une valeur > 0 refuse un nouvel appareil au-delà de ce nombre sur la même empreinte dans la semaine.
- **Propositions automatiques** : chaque heure, `propose()` écrit dans `proposals` les cellules « opérateur + heures » dont les choix de président s'écartent de la référence (reste des répondants, sans les opérateurs déjà signalés) d'au moins `PROPOSE_MIN` points.
  - Voir : `SELECT id, org, hour_from, hour_to, choices, excess, top2, new_pct FROM proposals WHERE status = 'proposé';`
  - Valider : `INSERT INTO excluded_cells(asn,hour_from,hour_to,dept,reason,created) SELECT asn,hour_from,hour_to,'*','Proposition #'||id||' validée',date('now') FROM proposals WHERE id = ?; UPDATE proposals SET status = 'validé' WHERE id = ?;`
  - Refuser : `UPDATE proposals SET status = 'refusé' WHERE id = ?;`

## Retrait d'une période
`excluded_windows(scope, from_ts, to_ts, reason, created)` (secondes Unix) retire des résultats publiés d'un scrutin tous les bulletins dont le dernier choix date de la période. Ils restent en base (réversible : supprimer la ligne, puis attendre la publication de l'heure suivante). Un appareil qui confirme son choix après `to_ts` est compté. Exemple (présidentielle, 48 dernières heures) :
`INSERT INTO excluded_windows(scope,from_ts,to_ts,reason,created) VALUES ('pres', CAST(strftime('%s','now') AS INTEGER) - 172800, CAST(strftime('%s','now') AS INTEGER), 'Tentatives de manipulation', date('now'));`

## Mesure « même matériel, même réseau » (v15)
La page envoie `hw` (SHA-256 de l'écran, du processeur graphique, du nombre de cœurs, du fuseau horaire… : stable d'un navigateur à l'autre). Le service garde `sha256(hw | IP | SALT | jour)` dans `hw_day` (nouveaux appareils, envois) et les empreintes de navigateur différentes vues dans `hw_fp` (8 jours). Mesure seulement : rapports 9 et 10 de `anomalies.sql`. Aucun blocage.

## Dossier de preuves et retrait par score (v16)
- Chaque envoi accepté ajoute une ligne à `evidence` (14 jours) : opérateur (`asn`), pays, région, point de présence Cloudflare, protocole, version TLS, délai réseau, codes mélangés au secret (réseau `net`, navigateur `fp`, matériel `hw`, navigateur complet `uah`), en-têtes présents (`hdr`, masque de bits), âge du défi (`chal`), délai du contrôle anti-robot (`tsage`), choix de président, département, signaux de comportement `sg` (temps sur la page, interactions, indices d'automatisation, événements fiables, ancienneté de l'appareil) et signature technique grossière. Ni adresse, ni identifiant en clair.
- `score.py` calcule pour chaque bulletin de président un score de suspicion avec les **mêmes règles pour tous les candidats** (aucun poids selon le candidat choisi, sauf la règle d'uniformité d'un groupe réseau, appliquée identiquement), et produit un tableau par candidat pour le contrôle. `--apply 100` inscrit dans `ballot_risk` les bulletins de score >= 100 (`retire`) et 60 à 99 (`suspect`) ; la publication horaire retire les `retire` de l'instantané (les bulletins ne sont jamais supprimés). `UPDATE ballot_risk SET status='garde' WHERE dh=...` ou `DELETE FROM ballot_risk` rétablit.
- Les appareils déjà couverts par un retrait par opérateur (`excluded_cells`) sont ignorés par `score.py` pour ne pas être retirés deux fois.
