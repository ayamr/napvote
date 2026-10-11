-- Un vote par appareil (empreinte salée), modifiable. Aucune adresse IP, aucun nom.
CREATE TABLE IF NOT EXISTS votes (
  device  TEXT PRIMARY KEY,      -- sha-256(identifiant d'appareil + sel secret)
  choice  TEXT NOT NULL,         -- clé du candidat, « indecis » ou « abstention »
  dept    TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS votes_choice ON votes(choice);
CREATE INDEX IF NOT EXISTS votes_dept ON votes(dept);
-- limitation de débit : empreinte (IP + jour + sel), purgée chaque jour
CREATE TABLE IF NOT EXISTS rl (k TEXT PRIMARY KEY, n INTEGER NOT NULL, day TEXT NOT NULL);
