-- Rapport d'anomalies (lecture seule). Usage :
--   npx wrangler d1 execute napvote-poll --remote --file=anomalies.sql
-- 1) Groupes (réseau + signature) qui créent le plus de nouveaux appareils aujourd'hui (clé secrète, non réversible)
SELECT substr(k,1,8) AS groupe, new_dev AS nouveaux_appareils, sends AS envois FROM cluster WHERE day = date('now') ORDER BY new_dev DESC LIMIT 15;
-- 2) Nombre de groupes par tranche de nouveaux appareils aujourd'hui
SELECT CASE WHEN new_dev < 5 THEN '1-4' WHEN new_dev < 20 THEN '5-19' WHEN new_dev < 50 THEN '20-49' ELSE '50+' END AS tranche, COUNT(*) AS groupes, SUM(new_dev) AS nouveaux_appareils FROM cluster WHERE day = date('now') GROUP BY tranche ORDER BY MIN(new_dev);
-- 3) Opérateurs réseau les plus actifs aujourd'hui (hébergeurs et VPN = suspects ; opérateurs mobiles = normaux)
SELECT asn, org AS operateur, sends AS envois, new_dev AS nouveaux_appareils FROM asn_daily WHERE day = date('now') ORDER BY sends DESC LIMIT 20;
-- 4) Même chose sur la semaine, par jour
SELECT day, COUNT(*) AS groupes, SUM(new_dev) AS nouveaux_appareils, MAX(new_dev) AS plus_gros_groupe FROM cluster GROUP BY day ORDER BY day;

-- 5) Groupes dont la répartition des choix s'écarte de la moyenne du sondage (président, sénateur, député).
--    écart = 100 × (1 − somme des parts communes avec la moyenne) : 0 = identique à la moyenne, 100 = totalement différent.
--    Seuls les groupes de 30 envois ou plus sur ce scrutin sont montrés ; aucun nom de candidat n'est affiché.
WITH moy AS (
  SELECT t.scope, t.choice, t.n * 1.0 / (SELECT SUM(n) FROM tally x WHERE x.scope = t.scope) AS p FROM (SELECT scope, choice, SUM(n) AS n FROM tally GROUP BY scope, choice) t
), g AS (
  SELECT k, day, scope, choice, n, SUM(n) OVER (PARTITION BY k, day, scope) AS tot FROM cluster_choice
), e AS (
  SELECT g.k, g.day, g.scope, MAX(g.tot) AS envois, ROUND(100 * (1 - SUM(MIN(g.n * 1.0 / g.tot, COALESCE(moy.p, 0)))), 0) AS ecart
  FROM g LEFT JOIN moy ON moy.scope = g.scope AND moy.choice = g.choice WHERE g.tot >= 30 GROUP BY g.k, g.day, g.scope
)
SELECT substr(k, 1, 8) AS groupe, day, CASE WHEN scope = 'pres' THEN 'président' WHEN scope LIKE 'sen|%' THEN 'sénat' ELSE 'députés' END AS scrutin, envois, ecart AS ecart_a_la_moyenne FROM e ORDER BY ecart DESC LIMIT 25;
-- 6) Groupes qui s'écartent de la moyenne sur au moins 2 des 3 scrutins (le signal le plus net)
WITH moy AS (
  SELECT t.scope, t.choice, t.n * 1.0 / (SELECT SUM(n) FROM tally x WHERE x.scope = t.scope) AS p FROM (SELECT scope, choice, SUM(n) AS n FROM tally GROUP BY scope, choice) t
), g AS (
  SELECT k, day, scope, choice, n, SUM(n) OVER (PARTITION BY k, day, scope) AS tot FROM cluster_choice
), e AS (
  SELECT g.k, g.day, g.scope, MAX(g.tot) AS envois, 100 * (1 - SUM(MIN(g.n * 1.0 / g.tot, COALESCE(moy.p, 0)))) AS ecart
  FROM g LEFT JOIN moy ON moy.scope = g.scope AND moy.choice = g.choice WHERE g.tot >= 30 GROUP BY g.k, g.day, g.scope
)
SELECT substr(k, 1, 8) AS groupe, day, COUNT(DISTINCT CASE WHEN scope = 'pres' THEN 'p' WHEN scope LIKE 'sen|%' THEN 's' ELSE 'd' END) AS scrutins_en_ecart, ROUND(AVG(ecart), 0) AS ecart_moyen, SUM(envois) AS envois FROM e WHERE ecart >= 40 GROUP BY k, day HAVING scrutins_en_ecart >= 2 ORDER BY ecart_moyen DESC LIMIT 25;
