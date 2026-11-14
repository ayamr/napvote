# Page « Enskri » : où est le texte

Le texte de la page n'est plus dans ce fichier : il est dans `www/js/i18n.js`, clés `en.*` (français et kreyòl), pour qu'il ne soit écrit qu'à un seul endroit.
Les chiffres viennent de `www/data/enskri.json` (fabriqué par `scripts/build_enskri.py`) ; les centres du CEP et les bureaux de l'ONI, de `www/data/civ.json` (`scripts/build_civ.py`).

Ton : on parle comme à un ami ou à un voisin, phrases courtes, sans slogan ni vocabulaire administratif. Aucune section « sources et limites » : les sources ne sont citées que lorsqu'elles aident à trouver une information (liste des bureaux de l'ONI, décret, pièces demandées).

À confirmer auprès de l'ONI et du CEP, car aucun texte officiel ne le dit : délai pour recevoir la carte, heures d'ouverture des bureaux de l'ONI et des centres du CEP. La page dit « demande sur place » au lieu de l'inventer.

À faire relire par un locuteur kreyòl avant publication (toutes les clés `en.*` de l'objet `HT`).
