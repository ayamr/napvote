-- ÉDITION 2 (20 novembre 2026) : fin du retrait « opérateur + heure » (excluded_cells) pour la présidentielle.
--
-- Pourquoi : les vagues sont déjà retirées appareil par appareil (ballot_risk : réseau en bloc, rafale, même navigateur). La cellule retirait ensuite un « excédent »
-- calculé sur les envois bruts de la même heure, soit les mêmes votes une seconde fois : total publié (1 010) inférieur à la somme des choix (1 114), et des votes
-- restants retirés par effet de bord (Jude : 124 -> 84).
--
-- Ordre : 1. redéployer le Worker avec AUTO_CELLS = "0" (npx wrangler deploy) ; 2. exécuter CE fichier une seule fois :
--   npx wrangler d1 execute napvote-poll --remote --file=disable-cells-ed2.sql
-- Rien n'est perdu : les 4 cellules sont copiées dans « excluded_cells_ed2_arret » avant d'être supprimées. Pour les rétablir :
--   INSERT INTO excluded_cells SELECT * FROM excluded_cells_ed2_arret;  (puis AUTO_CELLS = "1" si on veut aussi la validation automatique)

CREATE TABLE excluded_cells_ed2_arret AS SELECT * FROM excluded_cells;
DELETE FROM excluded_cells;
-- le tableau d'affichage est recalculé à chaque heure (storeExcl) à partir des cellules ; on le vide tout de suite pour que le site suive sans attendre la passe de la minute 17
DELETE FROM excl_pub;
UPDATE proposals SET status = 'refusé', note = 'retrait par cellule arrêté le 20 novembre 2026 (doublon avec le retrait par appareil)' WHERE status = 'validé' AND created >= '2026-11-17T15:42';
