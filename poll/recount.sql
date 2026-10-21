-- Recalcul exact des totaux à partir des bulletins (migration v4 et recalage horaire). N'écrit que les lignes qui changent.
INSERT INTO tally(scope, dept, choice, n) SELECT scope, dept, choice, COUNT(*) FROM ballots WHERE 1 GROUP BY scope, dept, choice ON CONFLICT(scope, dept, choice) DO UPDATE SET n = excluded.n WHERE n <> excluded.n;
INSERT INTO tally_tot(scope, dept, n) SELECT scope, dept, COUNT(DISTINCT device) FROM ballots WHERE 1 GROUP BY scope, dept ON CONFLICT(scope, dept) DO UPDATE SET n = excluded.n WHERE n <> excluded.n;
DELETE FROM tally WHERE n <= 0;
DELETE FROM tally_tot WHERE n <= 0;
