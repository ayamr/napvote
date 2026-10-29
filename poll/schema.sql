-- Choix par appareil et par scrutin (empreinte salée), modifiables. Aucune adresse IP, aucun nom.
-- Sénat : jusqu'à 3 choix par appareil ; les autres scrutins : 1 choix.
CREATE TABLE IF NOT EXISTS ballots (
  device  TEXT NOT NULL,         -- sha-256(identifiant d'appareil + sel secret)
  scope   TEXT NOT NULL,         -- scrutin : pres | sen|<dép.> | dep|<circo> | may|<commune> | cas|<commune>|<section> | asec|…
  choice  TEXT NOT NULL,         -- clé du candidat ou de la liste, ou ~aucun | ~indecis | ~abstention
  dept    TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  PRIMARY KEY (device, scope, choice)
);
CREATE INDEX IF NOT EXISTS ballots_scope ON ballots(scope, choice);
CREATE INDEX IF NOT EXISTS ballots_dept ON ballots(scope, dept);
-- limitation de débit : empreinte (IP + jour + sel), purgée chaque jour
CREATE TABLE IF NOT EXISTS rl (k TEXT PRIMARY KEY, n INTEGER NOT NULL, day TEXT NOT NULL);

-- Totaux déjà calculés (v4) : mis à jour à chaque vote, recalés chaque heure. L'affichage des résultats ne lit que ces tables.
CREATE TABLE IF NOT EXISTS tally (scope TEXT NOT NULL, dept TEXT NOT NULL, choice TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (scope, dept, choice));
CREATE TABLE IF NOT EXISTS tally_tot (scope TEXT NOT NULL, dept TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (scope, dept));  -- électeurs ayant répondu

-- Statistique anonyme (v5) : envois par jour, pays et région approximatifs de la requête, et département déclaré. Aucune adresse IP, aucun identifiant.
CREATE TABLE IF NOT EXISTS geo_daily (day TEXT NOT NULL, country TEXT NOT NULL, region TEXT NOT NULL, dept TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, country, region, dept));

-- Détection d'envois en masse (v6). Aucun lien avec les bulletins.
-- cluster : empreinte secrète (réseau + signature technique grossière + sel + semaine), gardée 7 jours.
CREATE TABLE IF NOT EXISTS cluster (k TEXT NOT NULL, day TEXT NOT NULL, new_dev INTEGER NOT NULL, sends INTEGER NOT NULL, PRIMARY KEY (k, day));
-- asn_daily : envois par jour et par opérateur réseau (hébergeurs, VPN, opérateurs mobiles), statistique agrégée.
CREATE TABLE IF NOT EXISTS asn_daily (day TEXT NOT NULL, asn INTEGER NOT NULL, org TEXT NOT NULL, sends INTEGER NOT NULL, new_dev INTEGER NOT NULL, PRIMARY KEY (day, asn));

-- Répartition des choix par groupe et par département déclaré (v8), pour repérer un groupe qui vote très différemment des autres répondants du même département :
-- président, sénateur et député seulement, gardée 7 jours, uniquement pour les groupes déjà actifs (à partir du CLUSTER_TRACK-ième envoi du jour), jamais pour un appareil isolé.
CREATE TABLE IF NOT EXISTS group_choice (k TEXT NOT NULL, day TEXT NOT NULL, scope TEXT NOT NULL, dept TEXT NOT NULL, choice TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (k, day, scope, dept, choice));

-- Suivi par opérateur réseau (v9), conservé 14 jours. asn_hour : envois par heure, opérateur et département déclaré.
-- asn_choice : choix de président par heure, opérateur et département, seulement pour les opérateurs déjà actifs (ASN_TRACK envois dans la journée) ; aucun lien avec un appareil.
CREATE TABLE IF NOT EXISTS asn_hour (hour TEXT NOT NULL, asn INTEGER NOT NULL, org TEXT NOT NULL, dept TEXT NOT NULL, sends INTEGER NOT NULL, new_dev INTEGER NOT NULL, PRIMARY KEY (hour, asn, dept));
CREATE TABLE IF NOT EXISTS asn_choice (hour TEXT NOT NULL, asn INTEGER NOT NULL, dept TEXT NOT NULL, choice TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (hour, asn, dept, choice));

-- Envois refusés parce qu'ils venaient d'un hébergeur de serveurs, d'un VPN ou d'un relais privé (v10) : compte par jour et par opérateur, sans autre information.
CREATE TABLE IF NOT EXISTS blocked_daily (day TEXT NOT NULL, asn INTEGER NOT NULL, org TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, asn));

-- Envois anormaux retirés de l'affichage de la présidentielle (v11) : une ligne par opérateur réseau et plage d'heures UTC (dept = '*' pour tous les départements).
-- Seul l'excédent par rapport au département est retiré ; aucun bulletin n'est modifié.
CREATE TABLE IF NOT EXISTS excluded_cells (asn INTEGER NOT NULL, hour_from TEXT NOT NULL, hour_to TEXT NOT NULL, dept TEXT NOT NULL DEFAULT '*', reason TEXT, created TEXT);

-- v12 : résultats publiés une fois par heure, défi signé, empreinte du navigateur, propositions de retrait.
CREATE TABLE IF NOT EXISTS tally_pub (scope TEXT NOT NULL, dept TEXT NOT NULL, choice TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (scope, dept, choice));
CREATE TABLE IF NOT EXISTS tally_tot_pub (scope TEXT NOT NULL, dept TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (scope, dept));
CREATE TABLE IF NOT EXISTS pub_meta (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS challenge_used (n TEXT PRIMARY KEY, t INTEGER NOT NULL);
-- empreinte du navigateur : code mélangé à un secret et à la semaine (8 jours), compte les nouveaux appareils créés ; aucun lien avec les bulletins.
CREATE TABLE IF NOT EXISTS fp_week (k TEXT NOT NULL, week INTEGER NOT NULL, new_dev INTEGER NOT NULL, sends INTEGER NOT NULL, PRIMARY KEY (k, week));
-- propositions de retrait, produites chaque heure et à valider à la main (statut : proposé, validé, refusé).
CREATE TABLE IF NOT EXISTS proposals (id INTEGER PRIMARY KEY AUTOINCREMENT, created TEXT, asn INTEGER, org TEXT, hour_from TEXT, hour_to TEXT, choices INTEGER, excess INTEGER, top2 INTEGER, new_pct INTEGER, status TEXT NOT NULL DEFAULT 'proposé', note TEXT);

-- v13 : périodes retirées des résultats d'un scrutin (dates en secondes Unix). Les bulletins dont le dernier choix date de la période ne sont pas comptés dans l'instantané publié ;
-- ils restent en base et reviennent si la ligne est supprimée. Un appareil qui confirme son choix après la période est compté normalement.
CREATE TABLE IF NOT EXISTS excluded_windows (id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT NOT NULL, from_ts INTEGER NOT NULL, to_ts INTEGER NOT NULL, reason TEXT, created TEXT);

-- v15 : mesure « même matériel, même réseau, plusieurs navigateurs » (8 jours, aucun lien avec les bulletins).
-- hw_day : code mélangé (matériel + réseau + secret + jour) -> nouveaux appareils et envois ; hw_fp : empreintes de navigateur différentes vues sur ce couple.
CREATE TABLE IF NOT EXISTS hw_day (k TEXT NOT NULL, day TEXT NOT NULL, new_dev INTEGER NOT NULL, sends INTEGER NOT NULL, PRIMARY KEY (k, day));
CREATE TABLE IF NOT EXISTS hw_fp (k TEXT NOT NULL, day TEXT NOT NULL, fpk TEXT NOT NULL, PRIMARY KEY (k, day, fpk));

-- v16 : dossier de preuves par envoi accepté (14 jours), pour calculer après coup un score de suspicion par bulletin, de la même façon pour tous les candidats.
-- Tous les codes sont mélangés à un secret (dh = empreinte de l'appareil comme dans ballots ; net, fp, hw, uah = 16 caractères de SHA-256 avec secret). Aucune adresse, aucun identifiant en clair.
CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER NOT NULL, dh TEXT NOT NULL, isnew INTEGER NOT NULL,
  asn INTEGER, country TEXT, region TEXT, colo TEXT, http TEXT, tls TEXT, rtt INTEGER,
  net TEXT, fp TEXT, hw TEXT, ua TEXT, uah TEXT, lang TEXT, hdr INTEGER, chal INTEGER, tsage INTEGER,
  scopes INTEGER, pres TEXT, dept TEXT, sg TEXT, tech TEXT
);
CREATE INDEX IF NOT EXISTS evidence_t ON evidence(t);
CREATE INDEX IF NOT EXISTS evidence_dh ON evidence(dh);
-- décisions après examen des preuves : status = 'suspect' (à voir), 'retire' (retiré de l'instantané publié), 'garde' (confirmé honnête).
CREATE TABLE IF NOT EXISTS ballot_risk (dh TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'pres', score INTEGER, reasons TEXT, status TEXT NOT NULL DEFAULT 'suspect', decided TEXT, PRIMARY KEY (dh, scope));

-- v17 : envois refusés (14 jours) avec le candidat de président visé, pour mesurer où va la manipulation même quand elle est bloquée. Aucun identifiant : code réseau mélangé au secret.
CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER NOT NULL, reason TEXT, asn INTEGER, country TEXT, net TEXT, pres TEXT, dept TEXT, scopes INTEGER);
CREATE INDEX IF NOT EXISTS attempts_t ON attempts(t);

-- v22 : signalements des scrutins locaux (réseaux en bloc observés ou retirés, vagues de la journée à examiner). Créée aussi par la tâche horaire si elle manque.
CREATE TABLE IF NOT EXISTS review_flags (id INTEGER PRIMARY KEY AUTOINCREMENT, created TEXT, kind TEXT NOT NULL, scope TEXT NOT NULL, day TEXT NOT NULL, choice TEXT NOT NULL, net TEXT NOT NULL DEFAULT '', n INTEGER, share INTEGER, base INTEGER, nets INTEGER, asns INTEGER, status TEXT NOT NULL, note TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS review_flags_u ON review_flags(kind, scope, day, choice, net);
