-- REMISE À ZÉRO DU SONDAGE : édition 2 (17 novembre 2026)
--
-- Ce qui est remis à zéro : la présidentielle, le Sénat et les députés (scopes « pres », « sen|… », « dep|… »).
-- Ce qui n'est PAS touché : maires, CASEC, ASEC (« may|… », « cas|… », « asec|… ») et toutes les statistiques de détection.
--
-- Rien n'est détruit : les bulletins de la première édition sont gardés dans « ballots_ed1 » (la table est renommée, pas copiée),
-- les compteurs, l'historique et les retraits dans les tables « *_ed1 ».
-- Filet de sécurité en plus : « wrangler d1 time-travel info napvote-poll » (notez le « bookmark » avant de commencer).
--
-- Ordre (voir poll/README.md, « Remise à zéro ») :
--   1. déployer le Worker v30 (npx wrangler deploy) ;
--   2. suspendre les envois :  UPDATE/INSERT pub_meta maintenance = '1' (commande donnée dans le README) ;
--   3. relancer scripts/build_bilan.py (dernier instantané publié), publier le site avec la page du bilan ;
--   4. exécuter CE fichier ; il rouvre les envois à la fin (maintenance = '0').
--
-- Ne pas relancer ce fichier une seconde fois : « CREATE TABLE … _ed1 » échouerait, ce qui est voulu (protège l'archive).

-- ---------- 1. copie des compteurs, de l'historique et des retraits de la première édition ----------
CREATE TABLE tally_ed1 AS SELECT * FROM tally WHERE scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%';
CREATE TABLE tally_tot_ed1 AS SELECT * FROM tally_tot WHERE scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%';
CREATE TABLE tally_pub_ed1 AS SELECT * FROM tally_pub WHERE scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%';
CREATE TABLE tally_tot_pub_ed1 AS SELECT * FROM tally_tot_pub WHERE scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%';
CREATE TABLE tally_day_ed1 AS SELECT * FROM tally_day WHERE scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%';
CREATE TABLE excluded_cells_ed1 AS SELECT * FROM excluded_cells;
CREATE TABLE excluded_windows_ed1 AS SELECT * FROM excluded_windows;
CREATE TABLE proposals_ed1 AS SELECT * FROM proposals;
CREATE TABLE asn_choice_ed1 AS SELECT * FROM asn_choice;
CREATE TABLE excl_pub_ed1 AS SELECT * FROM excl_pub;

-- ---------- 2. nouvelle table des bulletins : seulement les scrutins locaux, qui continuent ----------
CREATE TABLE ballots_new (
  device  TEXT NOT NULL,
  scope   TEXT NOT NULL,
  choice  TEXT NOT NULL,
  dept    TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  PRIMARY KEY (device, scope, choice)
);
INSERT INTO ballots_new SELECT device, scope, choice, dept, created, updated FROM ballots
  WHERE NOT (scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%');

-- ---------- 3. échange des tables : « ballots » devient l'archive « ballots_ed1 » ----------
ALTER TABLE ballots RENAME TO ballots_ed1;
ALTER TABLE ballots_new RENAME TO ballots;
DROP INDEX IF EXISTS ballots_scope;
DROP INDEX IF EXISTS ballots_dept;
CREATE INDEX ballots_scope ON ballots(scope, choice);
CREATE INDEX ballots_dept ON ballots(scope, dept);

-- ---------- 4. compteurs et résultats publiés : à zéro pour les trois scrutins nationaux ----------
DELETE FROM tally WHERE scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%';
DELETE FROM tally_tot WHERE scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%';
DELETE FROM tally_pub WHERE scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%';
DELETE FROM tally_tot_pub WHERE scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%';
DELETE FROM tally_day WHERE scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%';

-- ---------- 5. retraits propres à la première édition : sinon ils effaceraient de vrais votes de la deuxième ----------
-- excluded_cells / excl_pub : retirent un « excédent » par département et candidat à partir des heures de la première édition.
-- Appliqués à des compteurs presque vides, ils feraient disparaître les premiers votes de ces candidats.
DELETE FROM excluded_cells;
DELETE FROM excl_pub;
DELETE FROM excluded_windows WHERE scope = 'pres' OR scope LIKE 'sen|%' OR scope LIKE 'dep|%';
-- la détection des vagues compare les heures récentes aux compteurs : les heures de la première édition n'ont plus de référence
DELETE FROM asn_choice;
UPDATE proposals SET status = 'refusé', note = 'avant la remise à zéro du 17 novembre 2026' WHERE status = 'proposé';
-- les appareils déjà retirés (ballot_risk, statut « retire ») le restent : un réseau en bloc qui revote est de nouveau retiré, comme avant.

-- ---------- 6. édition 2, et réouverture des envois ----------
INSERT INTO pub_meta(k, v) VALUES ('edition', '2') ON CONFLICT(k) DO UPDATE SET v = excluded.v;
INSERT INTO pub_meta(k, v) VALUES ('edition_at', strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) ON CONFLICT(k) DO UPDATE SET v = excluded.v;
INSERT INTO pub_meta(k, v) VALUES ('risk_pres', '0') ON CONFLICT(k) DO UPDATE SET v = excluded.v;
INSERT INTO pub_meta(k, v) VALUES ('maintenance', '0') ON CONFLICT(k) DO UPDATE SET v = excluded.v;
