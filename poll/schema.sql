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
