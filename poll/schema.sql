-- Un choix par appareil et par scrutin (empreinte salée), modifiable. Aucune adresse IP, aucun nom.
CREATE TABLE IF NOT EXISTS ballots (
  device  TEXT NOT NULL,         -- sha-256(identifiant d'appareil + sel secret)
  scope   TEXT NOT NULL,         -- scrutin : pres | sen|<dép.> | dep|<circo> | may|<commune> | cas|<commune>|<section> | asec|…
  choice  TEXT NOT NULL,         -- clé du candidat ou de la liste, ou ~aucun | ~indecis | ~abstention
  dept    TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  PRIMARY KEY (device, scope)
);
CREATE INDEX IF NOT EXISTS ballots_scope ON ballots(scope, choice);
CREATE INDEX IF NOT EXISTS ballots_dept ON ballots(scope, dept);
-- limitation de débit : empreinte (IP + jour + sel), purgée chaque jour
CREATE TABLE IF NOT EXISTS rl (k TEXT PRIMARY KEY, n INTEGER NOT NULL, day TEXT NOT NULL);
