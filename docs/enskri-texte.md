# Page « Enskri » — texte (brouillon v2, à relire)

Remplace la page « Électeurs inscrits ». Page **militante pour la participation des jeunes** : on parle à la deuxième personne, on dit quoi faire, on garde un ton direct. Jamais un mot sur un candidat ni un parti.
Tous les chiffres entre `{{ }}` viennent de `www/data/enskri.json` (fabriqué par `scripts/build_enskri.py`). Valeurs actuelles entre crochets, pour relecture seulement.

---

## 1. Haut de page

**Titre** : Ton vote commence par ton inscription.

**Sous-titre** : Les 18-28 ans sont près d’un tiers des adultes du pays, mais moins d’un inscrit sur cinq. Ça peut changer, et ça dépend de toi.
`{{jeunes.pct_pop}} % des adultes` [32 %] · `{{jeunes.pct_ins}} % des inscrits` [18,1 %]

**Boutons** : [Trouver mon centre]  [Passer le mot à un ami]

---

## 2. Bandeau « C’est encore possible » (juste sous le titre, bien visible)

> **La liste électorale n’est pas fermée.**
> Le CEP prévoit de fermer le registre électoral le **`{{fermeture.date}}`** [20 mai 2027] : il reste environ **`{{fermeture.jours}}` jours** [187].
> **Tu n’as pas encore ta carte d’identification nationale (CIN) ?** Tu peux encore la demander à l’**Office national d’identification (ONI)**, puis t’inscrire.

*Sous le bandeau, en petit* : Date du calendrier électoral actualisé du CEP (28 octobre 2026). Le CEP peut la modifier.

> Règle : si `fermeture` est vide dans le fichier (registre fermé ou date introuvable), le bandeau n’apparaît pas et on revoit le texte avant de republier. Un faux « c’est encore possible » serait pire que pas de bandeau.

---

## 3. Le chiffre qui frappe

**Environ 1 jeune de 18 à 28 ans sur `{{jeunes.un_sur}}` est inscrit.** [13]

Chez les 69 ans et plus, c’est environ 1 sur 5. Les jeunes sont les plus nombreux. Ils devraient être les plus entendus.

*Source (toujours visible)* : Inscrits : CEP, `{{t}}`. Population adulte : estimations de l’IHSI pour 2024. Calcul NapVote, approximatif.

---

## 4. Une voix, ça pèse : regarde 2016

Mise en perspective avec la dernière présidentielle (20 novembre 2016), résultats du CEP :

- **`{{pres2016.voix_gagnant}}` voix** [595 430] ont suffi pour gagner (`{{pres2016.pct_gagnant}} %` [55,7 %] des `{{pres2016.voix_total}}` [1 069 646] voix comptées).
- Aujourd’hui, **`{{inscrits}}` personnes** [944 603] sont déjà inscrites : environ `{{pres2016.inscrits_vs_gagnant}}` fois [1,6] ce qu’il a fallu de voix pour gagner en 2016.
- Le pays compte environ **2,3 millions de jeunes de 18 à 28 ans** : près de `{{pres2016.jeunes_vs_gagnant}}` fois [3,9] les voix du gagnant de 2016.

**Phrase de conclusion** : En 2016, un peu plus de 595 000 voix ont décidé de la présidentielle. Les jeunes sont plus de 2 millions. Imagine ce que tu peux changer.

> Garde-fous de ce bloc :
> - On ne dit pas que les jeunes voteront tous pareil, ni pour qui. On dit seulement que leur nombre pèse.
> - « Voix comptées » = total des voix du tableau de résultats de 2016 de NapVote. Les inscrits d’aujourd’hui ne sont pas des votants : l’écran doit le dire (« inscrit ≠ votant »).
> - Le nombre de jeunes de 18-28 ans est une estimation de l’IHSI (2024), arrondie.

---

## 5. Âge par âge

Graphique : pour chaque tranche, deux barres — « part des adultes » et « part des inscrits » (`age[].pct_pop`, `age[].pct_ins`).

| Tranche | Part des adultes | Part des inscrits | Adultes inscrits |
|---|---|---|---|
| 18-28 | 32,0 % | 18,1 % | 7,5 % |
| 29-38 | 24,8 % | 22,4 % | 11,9 % |
| 39-48 | 18,3 % | 21,9 % | 15,7 % |
| 49-58 | 12,1 % | 17,1 % | 18,7 % |
| 59-68 | 7,9 % | 12,4 % | 20,7 % |
| 69+ | 4,9 % | 8,1 % | 21,6 % |

**Phrase sous le graphique** : Plus on est jeune, moins on est inscrit. Les 18-38 ans sont `{{jeunes.pct_pop_18_38}} %` [57 %] des adultes, mais `{{jeunes.pct_ins_18_38}} %` [41 %] des inscrits.

---

## 6. La CIN : la première étape, et elle est encore ouverte

Pour s’inscrire, il faut la **carte d’identification nationale (CIN)**. Le CEP ne compte comme électeurs potentiels que les détenteurs de la CIN (plus de 6,5 millions de personnes d’après la presse).

**Pas de CIN ? Ce n’est pas fini pour toi.** Tu peux encore la demander à l’**ONI**, puis t’inscrire avant la fermeture du registre. Le plus tôt est le mieux : les démarches peuvent prendre du temps.

Une partie de l’écart entre jeunes et aînés vient peut-être du manque de CIN chez les jeunes : on ne sait pas dans quelle mesure, ce chiffre n’est pas publié.

> À CONFIRMER avant publication (ne rien écrire de plus sans source officielle ONI/CEP) : où se rendre à l’ONI, pièces demandées, coût éventuel, délais.

*Le CEP lui-même cible les jeunes : sa campagne pour les primo-votants a été lancée le 23 septembre au Lycée national de Pétion-Ville.*

---

## 7. Trois étapes

1. **Prends ta CIN** — valide, et tu as 18 ans ou plus. Pas encore de CIN : demande-la à l’ONI. *(documents exigés à confirmer)*
2. **Trouve ton centre** — choisis ta commune, vois les centres près de chez toi. → [Trouver mon centre]
3. **Inscris-toi sur place** — un agent du CEP t’enregistre. *(durée et heures d’ouverture à confirmer)*

Bloc « centre » (données `civ.json`) : nom du centre, section communale, adresse, nombre de bureaux, lien d’itinéraire. Mention : « Liste du CEP du `{{civ.maj}}`. Vérifie l’adresse avant de te déplacer. » Les centres sans bureau actif sont marqués « à confirmer ».

---

## 8. Où en est ton département

Liste classée (`dept[]`) : part des adultes inscrits, de `{{dept[0].taux}} %` [Grand’Anse, 32 %] à `{{dept[-1].taux}} %` [Ouest, 6 %].

**Phrase** : Dans l’Ouest et l’Artibonite, environ 6 adultes sur 100 sont inscrits. Il y a de la place.

> Limite à afficher : populations IHSI de 2024, sans les déplacements de population : taux très approximatifs. Pas de cause affirmée (insécurité, etc.). **Section à valider par vous** (peut être mal reçue dans les départements en bas de liste).

---

## 9. Passe le mot (viral)

**Message prêt pour WhatsApp** (kreyòl d’abord) :

> *Mwen jwenn sant enskripsyon m. Ou menm ? Enskri anvan 20 me 2027 : napvote-ht.com/enskri*
> *J’ai trouvé mon centre d’inscription. Et toi ? Inscris-toi avant le 20 mai 2027 : napvote-ht.com/enskri*

*(La date dans le message doit venir de `fermeture.date`, pas être écrite en dur.)*

**Défi** : « Mennen 3 zanmi » — voir la conception de la carte à partager et du compteur anonyme par commune.

---

## 10. Ce qu’on ne dit pas

- NapVote ne dit pas pour qui voter, ni quel parti rejoindre.
- NapVote ne peut pas dire si **toi** tu es inscrit : seul le CEP le sait.
- Être inscrit ne veut pas dire avoir voté ; ce n’est pas non plus un résultat du sondage.

---

## 11. Sources et limites (bas de page, toujours visibles)

- **Inscrits** : CEP, tableau de bord public des inscriptions, relevé du `{{t}}`. Total par âge `{{inscrits_age}}` [946 887] ; total affiché par le CEP `{{inscrits}}` [944 603] : deux relevés de moments différents.
- **Population** : IHSI, Direction des statistiques démographiques et sociales, estimations 2024 (publiées le 1er juin 2024), projections à partir du recensement de 2003.
- **Tranches d’âge** : l’IHSI publie des groupes de 5 ans, le CEP des tranches de 10 ans. NapVote répartit les groupes de façon uniforme : les pourcentages sont des **ordres de grandeur**.
- **Présidentielle 2016** : résultats du CEP du 20 novembre 2016, tels que repris dans la section « Résultats passés » de NapVote.
- **Date de fermeture du registre** : calendrier électoral actualisé du CEP, publié le 28 octobre 2026 ; elle peut changer.
- **Diaspora** : non comptée.
- **Centres** : liste du CEP ; certains n’ont pas de coordonnées et ne figurent pas sur la carte.

---

## Brouillon kreyòl (à faire relire par un locuteur avant publication)

- **Titre** : Vòt ou kòmanse ak enskripsyon w.
- **Bandeau** : Lis elektoral la poko fèmen. Ou pa gen CIN ankò ? Ou ka toujou mande l nan ONI (Biwo Nasyonal Idantifikasyon), epi enskri.
- **Chiffre** : Anviwon 1 jèn 18-28 an sou `{{jeunes.un_sur}}` enskri.
- **Perspective** : An 2016, yon ti kras plis pase 595 000 vwa te ase pou genyen prezidansyèl la. Jèn yo plis pase 2 milyon.
- **Bouton** : Jwenn sant mwen
- **Étapes** : 1. Pran CIN ou · 2. Jwenn sant ou · 3. Enskri sou plas

---

## À valider par vous

1. Le ton militant (deuxième personne, « Imagine ce que tu peux changer ») : assez fort, ou plus direct encore ?
2. Les informations ONI (où, pièces, coût, délais) : à me donner ou à confirmer auprès de l’ONI avant que je les écrive.
3. Le classement par département (section 8) : on le garde ?
4. Le bloc 2016 : êtes-vous à l’aise pour citer le nom du gagnant (Jovenel Moïse) dans la page ? Je l’ai mis dans les données, mais la page peut dire seulement « le gagnant ».
