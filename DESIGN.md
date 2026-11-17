# Design : sobre et institutionnel

Site d'information civique au ton d'un service public (références : GOV.UK, service-public.fr, Elections Canada), sans emblème ni couleur officiels : NapVote est indépendant du CEP et le dit dans un bandeau permanent.

## Principes
- Hiérarchie par la typographie, les filets et les tableaux. Pas de cartes en série, pas de pastilles, pas de chiffres géants, pas de surtitres, pas de décoration.
- Une couleur d'action (bleu), une couleur d'alerte (ambre pour « provisoire », rouge pour les erreurs), un vert pour « élu ».
- Une page = un titre serif, une phrase, puis des sections séparées par un filet épais.
- Français et kreyòl à égalité (`js/i18n.js`, à faire relire).

## Jetons (css/napvote.css)
- Fond `--bg #FFFFFF`, panneau `--surface #F2F5F9`, filets `--line #D3DAE4`, texte `--ink #14243B`, bleu d'action `--brand #0F3D8A`, bandeau et pied de page `--band #0B2447`, focus `--focus #F5B400`.
- Nuit : fond `#0E1624`, `--brand #8DB4FF`.
- Titres Source Serif 4 (700), texte Source Sans 3 (400/600/700), 17 px, interligne 1,55. Rayon 4 px.

## Composants
Bandeau d'indépendance + en-tête + barre de navigation bleu marine (grand écran) ou barre d'onglets en bas (téléphone) ; panneau gris de sélection de commune (`.label`) ; lignes de candidat `.cc` avec marque-page (favori) ; listes d'équipes `.tkc` ; accordéons `.hbox` pour les scrutins passés ; tableaux et barres de résultats `.rk` ; étiquette ambre `.stamp` pour « provisoire / non confirmé ».

## Page « Résultats du sondage » : le bilan (exception assumée)
Demandé le 17 novembre 2026 : une page qui se défile et qui donne le message clé du sondage, plus le résultat de sa commune. Elle déroge aux principes ci-dessus (grandes phrases serif, bandeau d'ouverture et de clôture en bleu marine `--band`, chapitres en gris/blanc alternés) mais garde les jetons, les polices, le filet et le vocabulaire du site.
- Un seul parti pris de mouvement : les marques de données (barres, jauge de participation, sièges de l'hémicycle) se dessinent au fil du défilement (`animation-timeline: view()` / `scroll()`, css/bilan.css). Sans prise en charge ou avec « réduire les animations », la page s'affiche complète et immobile.
- Pas de chiffres géants ni de tuiles : le chiffre clé est dans la phrase d'ouverture. Couleurs des partis attribuées par rang (jamais celles d'un parti réel), avec légende et tableau en alternative.
- Les données (`www/data/bilan.json`) sont figées par `scripts/build_bilan.py` ; le texte fixe est dans index.html (`data-i18n`), les phrases à chiffres dans `js/i18n.js` (clés `bl.*`).
