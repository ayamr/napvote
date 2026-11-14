# Page « Enskri » — texte (brouillon v3, ton direct)

Remplace la page « Électeurs inscrits ». Page **militante pour la participation des jeunes** : on tutoie, phrases courtes, on dit quoi faire. Jamais un mot sur un candidat ni un parti.
Tous les chiffres entre `{{ }}` viennent de `www/data/enskri.json` (fabriqué par `scripts/build_enskri.py`). Valeurs actuelles entre crochets, pour relecture seulement.

---

## 1. Haut de page

**Titre** : Si tu ne t’inscris pas, d’autres décident à ta place.

**Sous-titre** : Les 18-28 ans sont **`{{jeunes.pct_pop}} %`** [32 %] des adultes. Ils ne sont que **`{{jeunes.pct_ins}} %`** [18 %] des inscrits. Il te reste **`{{fermeture.jours}}` jours** [187] pour changer ça.

**Boutons** : [Je trouve mon centre]  [J’y emmène un ami]

---

## 2. Bandeau « La liste n’est pas fermée » (juste sous le titre)

> **LA LISTE ÉLECTORALE N’EST PAS FERMÉE.**
> Tu peux encore t’inscrire jusqu’au **`{{fermeture.date}}`** [20 mai 2027].
> **Pas de CIN ?** Tu peux encore la demander à l’**ONI** (Office national d’identification), gratuitement. Commence par là, puis inscris-toi.

*Petit, dessous* : Date du calendrier électoral actualisé du CEP (28 octobre 2026). Le CEP peut la modifier.

> Règle : si `fermeture` est vide dans le fichier (registre fermé ou date introuvable), le bandeau disparaît et on revoit le texte avant de republier. Un faux « c’est encore possible » est pire que pas de bandeau.

---

## 3. Le chiffre

# 1 jeune sur `{{jeunes.un_sur}}`  [13]
**C’est tout ce qui est inscrit parmi les 18-28 ans.** Chez les 69 ans et plus, c’est 1 sur 5.

Les jeunes sont les plus nombreux. Ils devraient être les plus entendus.

*Source (toujours visible)* : Inscrits : CEP, `{{t}}`. Population adulte : estimations de l’IHSI pour 2024. Calcul NapVote, approximatif (« environ »).

---

## 4. Fais le calcul : 2016

> **`{{pres2016.voix_gagnant}}` voix.** [595 430]
> C’est ce qui a suffi pour gagner la présidentielle du 20 novembre 2016 : Jovenel Moïse, élu avec `{{pres2016.pct_gagnant}} %` [55,7 %] des `{{pres2016.voix_total}}` [1 069 646] voix comptées.

> **Aujourd’hui : `{{inscrits}}` inscrits** [944 603] — environ `{{pres2016.inscrits_vs_gagnant}}` fois [1,6] ce score.
> **Et environ 2,3 millions de jeunes de 18 à 28 ans** — près de `{{pres2016.jeunes_vs_gagnant}}` fois [3,9] ce score.

**Conclusion** : Quelques centaines de milliers de voix ont décidé en 2016. Les jeunes sont plus de deux millions. **Fais le calcul.**

> Garde-fous : on ne dit pas pour qui les jeunes voteraient, ni qu’ils voteraient tous pareil. On dit que leur nombre pèse. « Voix comptées » = total du tableau de résultats 2016 de NapVote. **Inscrit ≠ votant** : l’écran le dit. Les jeunes de 18-28 ans = estimation IHSI, arrondie.

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

**Sous le graphique** : Plus on est jeune, moins on est inscrit. Les 18-38 ans : `{{jeunes.pct_pop_18_38}} %` [57 %] des adultes, `{{jeunes.pct_ins_18_38}} %` [41 %] des inscrits.

---

## 6. Pas de CIN ? Ça commence à l’ONI

**Sans CIN, pas de vote.** L’ONI le dit lui-même : la carte d’identification nationale est obligatoire pour voter. Le CEP ne compte comme électeurs potentiels que ceux qui l’ont (plus de 6,5 millions de personnes d’après la presse).

**Tu n’en as pas ? Va la demander. C’est gratuit.** L’ONI a **`{{oni.bureaux}}` bureaux** [155] dans **`{{oni.communes}}` communes** [144] (liste de l’ONI du `{{oni.maj}}`). Trouve celui de ta commune : [Voir les bureaux ONI].

**Ce que demande l’ONI** :
- une **pièce valide** : acte de naissance, certificat de baptême authentifié et légalisé, acte d’adoption ou extrait des archives ;
- te **présenter toi-même** à un bureau d’enregistrement de l’ONI ;
- **porter un vêtement à col** ;
- on enregistre sur place tes données personnelles et biométriques (photo, signature, empreintes).

**Tu n’as aucun de ces papiers ?** Le décret du 1er juin 2005 publié par l’ONI prévoit une solution : une carte d’identité fiscale, un permis de conduire ou un passeport, **ou deux témoins** qui te connaissent, habitent ta commune ou ta section communale, ont **déjà leur CIN** et jurent de ton identité. *(Demande au bureau si cette règle s’applique toujours : c’est le texte de 2005.)*

*Sources : ONI, « Les pièces requises au moment de produire la demande de CIN », « La liste des bureaux » et « Décret » (oni.gouv.ht, articles 3, 5, 6, 8 à 10 du décret du 1er juin 2005), consultées le 14 novembre 2026.*

**C’est gratuit : ne paie personne.** Le décret de l’ONI le dit : *« La première délivrance de la Carte d’identification nationale est gratuite »* (article 3). La carte est délivrée à tout Haïtien de 18 ans accomplis et se renouvelle tous les 10 ans. Si quelqu’un te demande de l’argent pour « aller plus vite » ou « faire ton dossier », méfie-toi : passe directement par un bureau officiel de l’ONI.

> **Ce que nous ne savons pas** : le délai pour recevoir la carte et les heures d’ouverture ne sont pas publiés sur les pages de l’ONI que nous avons lues. La page dit : « Passe au bureau de ta commune et demande l’horaire sur place. » Ne rien écrire de plus sans source.
>
> **Limites de la gratuité** : elle vaut pour la **première** carte. Remplacement d’une carte perdue ou abîmée : ne rien affirmer sur le prix. Le décret date de 2005 ; la page « pièces requises » de l’ONI, plus récente, a la priorité en cas de différence.

Une partie de l’écart entre jeunes et aînés vient peut-être du manque de CIN chez les jeunes : on ne sait pas dans quelle mesure, ce chiffre n’est pas publié.

*Le CEP cible lui aussi les jeunes : sa campagne pour les primo-votants a été lancée le 23 septembre au Lycée national de Pétion-Ville.*

---

## 7. Trois étapes

1. **Prends ta CIN.** Pas encore de CIN : demande-la à l’ONI, avec une pièce valide. C’est gratuit. Tu as 18 ans ou plus.
2. **Trouve ton centre.** Choisis ta commune, vois les centres près de chez toi. → [Je trouve mon centre]
3. **Inscris-toi sur place.** Un agent du CEP t’enregistre. *(durée et heures d’ouverture à confirmer auprès du CEP)*

Bloc « centre » (données `civ.json`) : nom du centre, section communale, adresse, nombre de bureaux, lien d’itinéraire. Mention : « Liste du CEP du `{{civ.maj}}`. Vérifie l’adresse avant de te déplacer. » Centres sans bureau actif marqués « à confirmer ».

---

## 8. Où en est ton département (on le garde)

Liste classée (`dept[]`) : part des adultes inscrits, de `{{dept[0].taux}} %` [Grand’Anse, 32 %] à `{{dept[-1].taux}} %` [Ouest, 6 %].

**Phrase** : Dans l’Ouest et l’Artibonite, environ 6 adultes sur 100 sont inscrits. **Tout reste à faire.**

> Limite affichée : populations IHSI 2024, sans les déplacements de population : taux très approximatifs. Pas de cause affirmée (insécurité ou autre) : nous n’avons pas de données pour l’affirmer.

---

## 9. Passe le mot (viral)

**Message prêt pour WhatsApp** (kreyòl d’abord) :

> *Mwen jwenn sant enskripsyon m. Ou menm ? Lis la poko fèmen, enskri anvan `{{fermeture.date}}` : napvote-ht.com/enskri*
> *J’ai trouvé mon centre. Et toi ? La liste n’est pas fermée, inscris-toi avant le `{{fermeture.date}}` : napvote-ht.com/enskri*

*(La date vient de `fermeture.date`, jamais écrite en dur.)*

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
- **Date de fermeture du registre** : calendrier électoral actualisé du CEP (28 octobre 2026) ; elle peut changer.
- **CIN** : Office national d’identification (oni.gouv.ht) : « Les pièces requises… », « À quoi sert la carte d’identification nationale ? », « La liste des bureaux » et le « Décret » du 1er juin 2005 (https://oni.gouv.ht/580-2/), consultés le 14 novembre 2026.
- **Diaspora** : non comptée.
- **Centres d’inscription** : liste du CEP ; certains n’ont pas de coordonnées et ne figurent pas sur la carte.

---

## Brouillon kreyòl (à faire relire par un locuteur avant publication)

- **Titre** : Si ou pa enskri, lòt moun ap deside pou ou.
- **Bandeau** : LIS ELEKTORAL LA POKO FÈMEN. Ou pa gen CIN ankò ? Ale mande l nan ONI (Biwo Nasyonal Idantifikasyon), se gratis, epi enskri.
- **Chiffre** : 1 jèn sou `{{jeunes.un_sur}}`. Se sa ki enskri nan jèn 18-28 an yo.
- **Calcul** : An 2016, 595 430 vwa te ase pou genyen prezidansyèl la. Jèn yo plis pase 2 milyon. Fè kalkil la.
- **Bouton** : Mwen jwenn sant mwen
- **Étapes** : 1. Pran CIN ou · 2. Jwenn sant ou · 3. Enskri sou plas

---

## À confirmer avant de publier

1. **Témoins** (décret de 2005, articles 8 à 10) : la règle s’applique-t-elle toujours à l’ONI ? À demander à un bureau avant de la présenter comme sûre.
2. Délai de remise de la carte et heures d’ouverture de l’ONI : inconnus, la page renvoie vers le bureau.
3. Heures d’ouverture et durée de l’inscription dans les centres du CEP : à confirmer.
4. Relecture du kreyòl par un locuteur.

*Gratuité : confirmée par l’article 3 du décret du 1er juin 2005 sur le site de l’ONI (première délivrance gratuite).*
