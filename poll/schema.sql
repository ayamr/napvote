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
