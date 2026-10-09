# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Site installable (PWA) et applications Android/iOS par Capacitor : même code web. Mobile d'abord.)

## Users
Électeurs haïtiens, surtout sur téléphone Android d'entrée de gamme, en extérieur, souvent avec une connexion lente ou coupée. Ils veulent savoir, en quelques gestes, qui est sur leur bulletin à tous les niveaux (président, sénateur, député, maire, CASEC, ASEC) et ce qui s'est passé aux scrutins précédents chez eux. Audiences secondaires : diaspora, journalistes, observateurs.

## Product Purpose
Outil citoyen indépendant (non affilié au CEP) de suivi des élections haïtiennes 2026 : candidatures publiées par le CEP (rafraîchies toutes les 2 h), résultats 2015-2017 par circonscription et département, calendrier, inscription des électeurs, actualités. Réussite : un électeur trouve sa commune et lit son bulletin complet en moins d'une minute, sans compte, sans publicité, et s'en sert pour discuter et voter en connaissance de cause.

## Positioning
Le seul outil qui part de la commune de l'électeur pour reconstituer son bulletin complet (y compris maires, CASEC et ASEC par section communale) et le rapproche des résultats précédents de sa circonscription. Neutre : candidats toujours en ordre alphabétique, sans mise en avant.

## Operating Context
Candidatures du CEP (API publique), résultats préliminaires/définitifs 2015-2017 (CEP via HaïtiLibre, Wikipédia pour certaines reprises), calendrier officiel du CEP, fond de carte geoBoundaries. La liste n'est pas la liste définitive des candidats agréés. Scrutin prévu le 13 décembre 2026 (1er tour), 21 février 2027 (2e tour). Utilisation hors ligne possible.

## Capabilities and Constraints
Mon bulletin (par commune, GPS ou liste), carte département/commune, liste des candidats avec filtres et favoris, fiches de candidats (bios vérifiées pour les présidentiels seulement), résultats passés, calendrier, électeurs inscrits, actualités. Contraintes : léger, hors ligne, lisible en plein soleil, accessible, 100 % statique côté hébergement. Aucune biographie inventée ; pas de photos de candidats. Langues : français et kreyòl ayisyen (kreyòl à relire avant mise en ligne).

## Brand Commitments
Style demandé par l'utilisateur (10 oct. 2026) : sobre, professionnel, institutionnel. Écarté après essai : le monde « cahier d'école ». Sans imiter les emblèmes, drapeau, armoiries ni couleurs officielles du CEP ou de l'État.
Nom : NapVote (« n ap vote », nous votons). Voix : directe, concrète, comme quelqu'un qui explique les élections à un voisin ; pas de ton marketing. Ne pas imiter le CEP ni un parti : pas de logo, couleur ou emblème officiel.

## Evidence on Hand
Données réelles (3 352 candidatures au 9 oct. 2026, résultats 2015-2017, calendrier CEP). Pas de photos de candidats ; pas de témoignages ; pas de chiffres d'usage.

## Product Principles
1. Partir de la commune de l'électeur, pas des institutions.
2. Neutralité visible : ordre alphabétique, sources citées, limites dites.
3. Lisible vite, dehors, sur petit écran et réseau lent.
4. Dire ce qu'on ne sait pas (résultats provisoires, données manquantes) plutôt que lisser.
5. Le créole n'est pas une option décorative : il a sa place dans l'interface.

## Accessibility & Inclusion
Contraste élevé en plein soleil ; cibles tactiles ≥ 44 px ; faible littératie possible (phrases courtes, icônes sobres, chiffres clairs) ; lecteurs d'écran ; réduction des animations ; fonctionne sans connexion.
