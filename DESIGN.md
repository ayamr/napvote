# Design : le cahier

Papier clair, lignes bleues, double trait de marge rouge, encre bleu-noir, stylo bleu. Le mode nuit est un tableau noir. Une seule famille de caractères : Andika (SIL), conçue pour apprendre à lire, avec les accents du kreyòl.

## Principes
- La liste de l'électeur est une page de cahier : les listes sont des lignes, jamais des cartes. Un candidat = une ligne bleue.
- Les choix de l'électeur se marquent au stylo : coche dans la marge et cercle tracé à la main autour du nom (favori). C'est le seul moment animé (le trait se dessine, 0,3 s).
- Le tampon rouge dit ce qui est provisoire ou non confirmé. Le surligneur jaune dit « élu ». Rien d'autre n'a de couleur.
- Un titre n'a qu'une couleur. Pas de surtitre, pas de chiffre géant, pas de pastille.
- Français et kreyòl à égalité : `js/i18n.js` est le seul fichier à relire pour le kreyòl.

## Jetons (css/napvote.css)
- Papier `--paper #FBFBF8` · bureau `--desk #E6E9EE` · encre `--ink #0F1B4C` · stylo `--pen #1B3FBF` · marge/tampon `--red #C2283A` · lignes `--rule #BCCEEA` · surligneur `--hl #FFE45C`.
- Nuit (tableau) : `--paper #12171F`, `--ink #EEF1F6`, `--pen #93B2FF`, `--red #FF8794`.
- Texte 16 px, interligne 1,55. Échelle : 0,8125 / 0,9375 / 1 / 1,125 / 1,5 / 1,75 / 2,1–3 rem. Gras = hiérarchie.
- Rayon 3 px. Filets : 1 px bleu pour les lignes, 2 px encre pour les séparations fortes, double filet sous les titres de section.
- Marge : trait fixe à 46 px ; le texte commence à 60 px ; la zone de marge porte les coches.

## Composants
`.cc` ligne de candidat (coche `.mk`, nom `.nm`, parti en gras, « fiche »), `.tkc` liste d'une même équipe (maire, CASEC, ASEC), `.rows` listes simples, `.label` étiquette de couverture (sélecteur commune), `.hbox` rappel des scrutins passés, `.stamp`, `.hl`, `.pillrow` onglets en texte soulignés d'un trait rouge.

## À refaire si le produit évolue
Pas de photos de candidats (aucune donnée). Les icônes (`scripts/make_icons.py`) reprennent la page, la marge et la coche.
