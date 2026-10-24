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

-- 5) Groupes dont la répartition des choix s'écarte des autres répondants DU MÊME DÉPARTEMENT (président, sénateur, député).
--    ecart  = 100 × (1 − somme des parts communes avec la moyenne du département) : 0 = identique, 100 = totalement différent.
--    bruit  = écart attendu par pur hasard pour un groupe de cette taille (les petits groupes s'écartent toujours un peu).
--    exces  = ecart − bruit : c'est lui qui compte. Moins de 15 : normal ; 15 à 30 : à surveiller ; plus de 30 : très net.
--    Seuls les groupes de 30 envois ou plus sur un scrutin et un département sont montrés ; aucun nom de candidat n'est affiché.
WITH moy AS (
  SELECT scope, dept, choice, n * 1.0 / SUM(n) OVER (PARTITION BY scope, dept) AS p, SUM(n) OVER (PARTITION BY scope, dept) AS base_n FROM tally
), g AS (
  SELECT k, day, scope, dept, choice, n, SUM(n) OVER (PARTITION BY k, day, scope, dept) AS tot FROM group_choice
), obs AS (
  SELECT g.k, g.day, g.scope, g.dept, MAX(g.tot) AS envois, 1 - SUM(MIN(g.n * 1.0 / g.tot, COALESCE(moy.p, 0))) AS tvd, MAX(COALESCE(moy.base_n, 0)) AS base_n
  FROM g LEFT JOIN moy ON moy.scope = g.scope AND moy.dept = g.dept AND moy.choice = g.choice WHERE g.tot >= 30 GROUP BY g.k, g.day, g.scope, g.dept
), bruit AS (
  SELECT o.k, o.day, o.scope, o.dept, 0.5 * SUM(sqrt(2.0 * m.p * (1 - m.p) / (3.14159265 * o.envois))) AS b FROM obs o JOIN moy m ON m.scope = o.scope AND m.dept = o.dept GROUP BY o.k, o.day, o.scope, o.dept
), e AS (
  SELECT o.k, o.day, o.scope, o.dept, o.envois, ROUND(100 * o.tvd, 0) AS ecart, ROUND(100 * b.b, 0) AS bruit, ROUND(100 * (o.tvd - b.b), 0) AS exces
  FROM obs o JOIN bruit b ON b.k = o.k AND b.day = o.day AND b.scope = o.scope AND b.dept = o.dept WHERE o.base_n >= 200
)
SELECT substr(k, 1, 8) AS groupe, day, CASE WHEN scope = 'pres' THEN 'président' WHEN scope LIKE 'sen|%' THEN 'sénat' ELSE 'députés' END AS scrutin, CASE WHEN dept = '' THEN '(non déclaré)' ELSE dept END AS departement, envois, ecart, bruit, exces FROM e ORDER BY exces DESC LIMIT 25;
-- 6) Groupes en excès (>= 25) sur au moins 2 des 3 scrutins : le signal le plus net
WITH moy AS (
  SELECT scope, dept, choice, n * 1.0 / SUM(n) OVER (PARTITION BY scope, dept) AS p, SUM(n) OVER (PARTITION BY scope, dept) AS base_n FROM tally
), g AS (
  SELECT k, day, scope, dept, choice, n, SUM(n) OVER (PARTITION BY k, day, scope, dept) AS tot FROM group_choice
), obs AS (
  SELECT g.k, g.day, g.scope, g.dept, MAX(g.tot) AS envois, 1 - SUM(MIN(g.n * 1.0 / g.tot, COALESCE(moy.p, 0))) AS tvd, MAX(COALESCE(moy.base_n, 0)) AS base_n
  FROM g LEFT JOIN moy ON moy.scope = g.scope AND moy.dept = g.dept AND moy.choice = g.choice WHERE g.tot >= 30 GROUP BY g.k, g.day, g.scope, g.dept
), bruit AS (
  SELECT o.k, o.day, o.scope, o.dept, 0.5 * SUM(sqrt(2.0 * m.p * (1 - m.p) / (3.14159265 * o.envois))) AS b FROM obs o JOIN moy m ON m.scope = o.scope AND m.dept = o.dept GROUP BY o.k, o.day, o.scope, o.dept
), e AS (
  SELECT o.k, o.day, o.scope, o.dept, o.envois, 100 * (o.tvd - b.b) AS exces
  FROM obs o JOIN bruit b ON b.k = o.k AND b.day = o.day AND b.scope = o.scope AND b.dept = o.dept WHERE o.base_n >= 200
)
SELECT substr(k, 1, 8) AS groupe, day, COUNT(DISTINCT CASE WHEN scope = 'pres' THEN 'p' WHEN scope LIKE 'sen|%' THEN 's' ELSE 'd' END) AS scrutins_en_exces, ROUND(AVG(exces), 0) AS exces_moyen, SUM(envois) AS envois FROM e WHERE exces >= 25 GROUP BY k, day HAVING scrutins_en_exces >= 2 ORDER BY exces_moyen DESC LIMIT 25;

-- 7) Département « Ouest » : part des envois par opérateur réseau et par bloc de 6 heures (pour voir si une vague vient d'un seul opérateur)
SELECT substr(hour, 6, 5) || ' ' || CASE WHEN CAST(substr(hour, 12, 2) AS INTEGER) < 6 THEN '00-05h' WHEN CAST(substr(hour, 12, 2) AS INTEGER) < 12 THEN '06-11h' WHEN CAST(substr(hour, 12, 2) AS INTEGER) < 18 THEN '12-17h' ELSE '18-23h' END AS bloc_utc, org AS operateur, SUM(sends) AS envois, SUM(new_dev) AS nouveaux_appareils FROM asn_hour WHERE dept = 'Ouest' GROUP BY bloc_utc, asn ORDER BY bloc_utc DESC, envois DESC LIMIT 40;
-- 8) Opérateurs dont les choix de président s'écartent des autres répondants du même département (excès = écart − bruit, voir 5) ; aucun nom de candidat affiché
WITH moy AS (
  SELECT scope, dept, choice, n * 1.0 / SUM(n) OVER (PARTITION BY scope, dept) AS p, SUM(n) OVER (PARTITION BY scope, dept) AS base_n FROM tally WHERE scope = 'pres'
), g AS (
  SELECT asn, dept, choice, SUM(n) AS n, SUM(SUM(n)) OVER (PARTITION BY asn, dept) AS tot FROM asn_choice GROUP BY asn, dept, choice
), obs AS (
  SELECT g.asn, g.dept, MAX(g.tot) AS envois, 1 - SUM(MIN(g.n * 1.0 / g.tot, COALESCE(moy.p, 0))) AS tvd, MAX(COALESCE(moy.base_n, 0)) AS base_n
  FROM g LEFT JOIN moy ON moy.dept = g.dept AND moy.choice = g.choice WHERE g.tot >= 100 GROUP BY g.asn, g.dept
), bruit AS (
  SELECT o.asn, o.dept, 0.5 * SUM(sqrt(2.0 * m.p * (1 - m.p) / (3.14159265 * o.envois))) AS b FROM obs o JOIN moy m ON m.dept = o.dept GROUP BY o.asn, o.dept
)
SELECT o.asn, (SELECT org FROM asn_daily d WHERE d.asn = o.asn ORDER BY day DESC LIMIT 1) AS operateur, CASE WHEN o.dept = '' THEN '(non déclaré)' ELSE o.dept END AS departement, o.envois, ROUND(100 * o.tvd, 0) AS ecart, ROUND(100 * b.b, 0) AS bruit, ROUND(100 * (o.tvd - b.b), 0) AS exces FROM obs o JOIN bruit b ON b.asn = o.asn AND b.dept = o.dept WHERE o.base_n >= 200 ORDER BY exces DESC LIMIT 25;
