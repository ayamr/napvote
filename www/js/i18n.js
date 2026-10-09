/* Langues : français et kreyòl ayisyen.
   Les textes d'interface (menus, boutons, titres, phrases clés) sont traduits ici.
   Les contenus longs (notes du CEP, biographies, actualités) restent dans la langue de leur source.
   Le kreyòl est à faire relire par un locuteur avant la mise en ligne : un seul fichier à relire, celui-ci. */
(function () {
  'use strict';
  var FR = {
    'nav.home': 'Accueil', 'nav.bulletin': 'Mon bulletin', 'nav.map': 'Carte', 'nav.cand': 'Candidats', 'nav.res': 'Résultats passés',
    'nav.cal': 'Calendrier', 'nav.elec': 'Électeurs', 'nav.news': 'Actualités', 'nav.res.s': 'Résultats', 'nav.about': 'À propos',
    'menu': 'Menu', 'menu.cal': 'Calendrier', 'menu.cal.s': 'Les dates du processus', 'menu.elec': 'Électeurs inscrits', 'menu.elec.s': 'Inscription par département',
    'menu.news': 'Actualités', 'menu.news.s': 'CEP et presse', 'menu.about': 'À propos, sources, installer l’appli', 'menu.about.s': 'Données, limites, apparence',
    'lang.fr': 'Français', 'lang.ht': 'Kreyòl',
    'gov.indep': 'Initiative citoyenne indépendante', 'gov.notcep': '· non affiliée au Conseil Électoral Provisoire (CEP)', 'gov.tag': 'Suivi des élections haïtiennes 2026', 'brand.tag': 'Suivi citoyen des élections en Haïti',

    'home.h1': 'Qui est sur votre bulletin ?',
    'home.lede': 'Dites-nous où vous votez. Vous verrez la liste complète, du président jusqu’à l’ASEC de votre section.',
    'home.indep': 'Initiative citoyenne, non affiliée au CEP.',
    'home.search.ph': 'Candidat, parti ou commune',
    'home.who': 'Qui se présente', 'home.who.all': 'Tous les candidats ›', 'home.fem': '{n} % de femmes parmi les candidats.',
    'home.changes': 'Nouveautés du CEP', 'home.changes.at': 'au {d} à {h}', 'home.changes.add': '+{n} candidats', 'home.changes.rem': '−{n} retirés', 'home.changes.more': 'et {n} autres.',
    'home.dates': 'Les dates', 'home.dates.all': 'Tout le calendrier ›',
    'home.pres': 'Les candidats à la présidence', 'home.pres.hint': 'Touchez un nom pour lire sa fiche. Liste publique du CEP ({n} candidats au {d}). Selon HaïtiLibre (24 sept.), l’ancien président Michel Martelly a aussi déposé une candidature, qui ne figure pas dans cette liste à ce jour.',
    'home.before': 'Avant 2026', 'home.before.all': 'Tous les résultats ›',
    'home.map': 'Où ils se présentent', 'home.map.cap': 'Candidats à la députation par département', 'home.map.go': 'Ouvrir la carte ›',
    'home.news': 'Nouvelles du CEP', 'home.news.all': 'Toutes les actualités ›',
    'home.saved': 'Mon bulletin', 'home.saved.go': 'Ouvrir ›', 'home.saved.n': '{n} candidats sur votre bulletin',

    'post.0': 'Président', 'post.1': 'Sénat', 'post.2': 'Députés', 'post.3': 'Maires', 'post.4': 'CASEC', 'post.5': 'ASEC',
    'postl.0': 'Présidentielle', 'postl.1': 'Sénat', 'postl.2': 'Députés', 'postl.3': 'Maires', 'postl.4': 'CASEC', 'postl.5': 'ASEC',

    'pk.dept': 'Département', 'pk.commune': 'Commune', 'pk.choose': 'Choisir…', 'pk.chooseCommune': 'Choisir votre commune…', 'pk.deptFirst': 'Choisir un département d’abord',
    'pk.go': 'Voir mon bulletin', 'pk.gps': 'Me localiser', 'pk.clear': 'Effacer', 'pk.change': 'Changer', 'pk.locating': 'Localisation en cours…',
    'pk.noCand': 'Aucun candidat inscrit pour {c} pour le moment.',
    'gps.none': 'Localisation indisponible sur cet appareil.', 'gps.out': 'Vous semblez hors d’Haïti ou d’une commune connue.', 'gps.denied': 'Localisation refusée ou indisponible. Choisissez votre commune dans la liste.',

    'b.title': 'Mon bulletin', 'b.sub': 'Les candidats de votre commune, et ce qui s’est passé chez vous de 2015 à 2017.',
    'b.pres': 'Président de la République', 'b.pres.h': 'Un seul vote pour tout le pays. Ordre alphabétique.',
    'b.sen': 'Sénateurs du département {d}', 'b.sen.h': 'Les candidats au Sénat pour le département {d}. Ordre alphabétique.',
    'b.dep': 'Députés', 'b.dep.h': 'Les candidats à la députation de la circonscription qui couvre votre commune.',
    'b.dep.multi': '{c} compte plusieurs circonscriptions. Cherchez la vôtre ci-dessous ; elle est indiquée sur votre carte d’électeur.',
    'b.circo': 'Circonscription de {c}',
    'b.may': 'Maire et adjoints à {c}', 'b.may.h': 'Chaque liste présente un titulaire et ses adjoints, rangés par parti.',
    'b.cas': 'CASEC', 'b.cas.h': 'Conseil d’administration de la section communale.', 'b.cas.pick': 'Choisissez votre section pour voir les listes.',
    'b.asec': 'ASEC', 'b.asec.h': 'Assemblée de la section communale.',
    'b.sec': 'Votre section communale', 'b.sec.choose': 'Choisir ma section…', 'b.sec.note': 'La section communale figure sur votre carte d’électeur. {n} sections ont des candidats dans cette commune.',
    'b.sec.none': 'Le CEP n’a pas encore enregistré de candidat CASEC ou ASEC pour cette commune.',
    'b.n.pres': '{n} à la présidence', 'b.n.sen': '{n} au Sénat', 'b.n.dep': '{n} à la députation', 'b.n.may': '{n} à la mairie', 'b.n.cas': '{n} CASEC', 'b.n.asec': '{n} ASEC',
    'b.share': 'Partager mon bulletin', 'b.map': 'Voir sur la carte', 'b.print': 'Imprimer',
    'b.empty': 'Choisissez votre commune', 'b.empty.p': 'Votre bulletin montre, dans l’ordre : la présidence, le Sénat de votre département, les députés de votre circonscription, puis les maires, CASEC et ASEC de votre commune.',
    'b.empty.n': 'Votre choix reste sur votre appareil.',
    'b.nolist': 'Aucune liste inscrite pour le moment.', 'b.nocand': 'Aucun candidat inscrit pour le moment.',
    'b.foot': 'Liste publique du CEP au {d}, pas encore la liste définitive des candidats agréés. Des candidatures peuvent changer ou être retirées jusqu’au scrutin.',
    'b.favs': 'Mes favoris', 'b.before.may': 'Avant 2026', 'b.before.may.p': 'Les résultats des municipales passées ne sont pas encore dans NapVote.',
    'h.here': 'Résultats précédents chez vous (2015-2017)', 'h.sen': 'Au Sénat ({d}), 2015-2017', 'h.pres': 'En 2016, dans le département {d}', 'h.sen.all': 'Tous les sénateurs ›', 'h.pres.all': 'Détail national ›',

    'c.title': 'Tous les candidats', 'c.sub': 'Les candidatures inscrites au CEP, poste par poste. Filtrez par département, parti ou nom.',
    'c.alld': 'Tous les départements', 'c.allp': 'Tous partis', 'c.name': 'Chercher par nom', 'c.hist': 'Déjà candidats en 2015-2017', 'c.fav': 'Mes favoris', 'c.reset': 'Réinitialiser',
    'c.count.1': '{n} candidat', 'c.count.n': '{n} candidats', 'c.of': '{n} sur {t}', 'c.more': 'Afficher plus ({n} restants)', 'c.none': 'Aucun candidat ne correspond. Élargissez la recherche ou touchez « Réinitialiser ».',
    'c.map': 'Carte ›', 'c.national': 'Candidature nationale',

    'm.title': 'Carte des candidats', 'm.sub': 'Touchez un département pour zoomer, puis une commune pour voir ses candidats.', 'm.search': 'Candidat, commune', 'm.party': 'Parti',

    'r.title': 'Résultats passés', 'r.sub': 'Présidentielle de 2016, sénatoriales et législatives de 2015 et de leurs reprises jusqu’en janvier 2017 : qui a gagné, avec combien de voix, dans chaque département et circonscription.',
    'r.t.pres': 'Présidentielle 2016', 'r.t.sen': 'Sénat 2015-17', 'r.t.dep': 'Députés 2015-17', 'r.t.fait': 'Faits marquants',
    'st.r1': 'Élu au 1er tour', 'st.r2': 'Élu au 2e tour', 'st.late': 'Élu à la reprise', 'st.qualif': '2e tour sans résultat', 'st.annule': 'Scrutin annulé', 'st.reprise1': 'À reprendre', 'st.reprise2': '2e tour à reprendre', 'st.inconnu': 'Résultat non publié',
    'hx.last': 'Dernier élu', 'hx.votes': 'Voix · part', 'hx.decisive': 'Scrutin décisif', 'hx.valid': 'Votes valides', 'hx.c15': 'candidats en 2015', 'hx.c26': 'inscrits en 2026',
    'hx.prov': 'Provisoire', 'hx.wiki': 'Non confirmé par le CEP',

    'cal.title': 'Calendrier électoral', 'cal.sub': 'Le calendrier officiel 2026-2027 publié par le CEP, en cours d’actualisation.',
    'cal.first': 'Premier tour', 'cal.second': 'Second tour', 'cal.keys': 'Étapes clés', 'cal.reg': 'Inscription des candidats', 'cal.all': 'Voir les 28 étapes du calendrier officiel',
    'el.title': 'Électeurs inscrits', 'el.dept': 'Par département',
    'news.title': 'Actualités et communiqués', 'news.sub': 'Communiqués du CEP et titres de la presse. Les articles s’ouvrent sur le site du média.',
    'about.title': 'À propos de NapVote', 'about.sub': 'Un outil citoyen et indépendant pour savoir qui se présente et ce qui s’est passé aux élections précédentes.',
    'about.theme': 'Apparence', 'theme.auto': 'Auto', 'theme.light': 'Clair', 'theme.dark': 'Sombre',
    'about.install': 'Installer l’application',

    'f.fav.add': 'Ajouter aux favoris', 'f.fav.on': 'Dans mes favoris', 'f.share': 'Partager', 'f.facts': 'Repères', 'f.sources': 'Sources', 'f.hist': 'Parcours électoral',
    'f.map': 'Voir sur la carte ›', 'f.bul': 'Voir le bulletin de cette commune ›', 'f.peers.dep': 'Autres candidats de la circonscription', 'f.peers.list': 'Colistiers (même parti, même liste)',
    'fav.on': 'Ajouté aux favoris', 'fav.off': 'Retiré des favoris', 'copied': 'Copié dans le presse-papiers', 'copy.fail': 'Copie impossible', 'share.none': 'Partage non disponible sur cet appareil',
    'mark.aria': 'Mettre en favori : {n}',
    'days.0': 'aujourd’hui', 'days.1': 'demain', 'days.n': 'dans {n} jours', 'days.past': 'passée',
    'date.1': 'Fin de l’inscription des électeurs', 'date.2': 'Fin de l’inscription des candidats', 'date.3': 'Premier tour : présidentielle et législatives', 'date.4': 'Second tour et collectivités territoriales',
    'foot': 'NapVote est une initiative citoyenne indépendante, non affiliée au Conseil Électoral Provisoire (CEP). Candidats : CEP ({d}). Résultats 2015-2017 : CEP (via HaïtiLibre) et Wikipédia.', 'foot.more': 'Sources et limites ›',
    'err.boot': 'NapVote ne peut pas démarrer', 'err.reload': 'Recharger', 'update': 'NapVote a été mis à jour. Rechargez pour en profiter.'
  };

  var HT = {
    'nav.home': 'Akèy', 'nav.bulletin': 'Bilten mwen', 'nav.map': 'Kat', 'nav.cand': 'Kandida', 'nav.res': 'Rezilta ansyen eleksyon', 'nav.cal': 'Kalandriye', 'nav.elec': 'Elektè', 'nav.news': 'Nouvèl',
    'nav.res.s': 'Rezilta', 'nav.about': 'Konsènan NapVote',
    'menu': 'Meni', 'menu.cal': 'Kalandriye', 'menu.cal.s': 'Dat pwosesis la', 'menu.elec': 'Elektè ki enskri', 'menu.elec.s': 'Enskripsyon pa depatman', 'menu.news': 'Nouvèl', 'menu.news.s': 'CEP ak laprès',
    'menu.about': 'Konsènan NapVote, sous, enstale aplikasyon an', 'menu.about.s': 'Done, limit, aparans',
    'lang.fr': 'Français', 'lang.ht': 'Kreyòl',
    'gov.indep': 'Inisyativ sitwayen ki endepandan', 'gov.notcep': '· ki pa gen anyen pou wè ak Konsèy Elektoral Pwovizwa (CEP)', 'gov.tag': 'Swivi eleksyon ayisyen 2026', 'brand.tag': 'Swivi sitwayen eleksyon yo an Ayiti',

    'home.h1': 'Ki moun ki sou bilten w lan ?',
    'home.lede': 'Di nou kote w ap vote. W ap wè lis konplè a, depi prezidan rive nan ASEC seksyon w lan.',
    'home.indep': 'Inisyativ sitwayen. Pa gen anyen pou wè ak CEP la.',
    'home.search.ph': 'Kandida, pati oswa komin',
    'home.who': 'Ki moun k ap kandida', 'home.who.all': 'Tout kandida yo ›', 'home.fem': '{n} % nan kandida yo se fanm.',
    'home.changes': 'Nouvo bagay nan CEP la', 'home.changes.at': 'nan {d} a {h}', 'home.changes.add': '+{n} kandida', 'home.changes.rem': '−{n} retire', 'home.changes.more': 'ak {n} lòt.',
    'home.dates': 'Dat yo', 'home.dates.all': 'Tout kalandriye a ›',
    'home.pres': 'Kandida pou prezidan yo', 'home.pres.hint': 'Peze sou yon non pou li fich li. Lis piblik CEP la ({n} kandida nan {d}).',
    'home.before': 'Anvan 2026', 'home.before.all': 'Tout rezilta yo ›',
    'home.map': 'Ki kote yo kandida', 'home.map.cap': 'Kandida pou depite pa depatman', 'home.map.go': 'Louvri kat la ›',
    'home.news': 'Nouvèl CEP la', 'home.news.all': 'Tout nouvèl yo ›',
    'home.saved': 'Bilten mwen', 'home.saved.go': 'Louvri ›', 'home.saved.n': '{n} kandida sou bilten ou',

    'post.0': 'Prezidan', 'post.1': 'Senatè', 'post.2': 'Depite', 'post.3': 'Majistra', 'post.4': 'CASEC', 'post.5': 'ASEC',
    'postl.0': 'Prezidansyèl', 'postl.1': 'Sena', 'postl.2': 'Depite', 'postl.3': 'Majistra', 'postl.4': 'CASEC', 'postl.5': 'ASEC',

    'pk.dept': 'Depatman', 'pk.commune': 'Komin', 'pk.choose': 'Chwazi…', 'pk.chooseCommune': 'Chwazi komin ou…', 'pk.deptFirst': 'Chwazi yon depatman anvan',
    'pk.go': 'Wè bilten mwen', 'pk.gps': 'Jwenn kote m ye', 'pk.clear': 'Efase', 'pk.change': 'Chanje', 'pk.locating': 'N ap chèche kote w ye…',
    'pk.noCand': 'Poko gen kandida ki enskri pou {c}.',
    'gps.none': 'Telefòn sa a pa kapab jwenn kote w ye.', 'gps.out': 'Sanble w pa nan Ayiti, oswa nan yon komin nou konnen.', 'gps.denied': 'Nou pa jwenn kote w ye. Chwazi komin ou nan lis la.',

    'b.title': 'Bilten mwen', 'b.sub': 'Kandida komin ou yo, ak sa ki te pase lakay ou ant 2015 ak 2017.',
    'b.pres': 'Prezidan Repiblik la', 'b.pres.h': 'Yon sèl vòt pou tout peyi a. Nan lòd alfabetik.',
    'b.sen': 'Senatè depatman {d}', 'b.sen.h': 'Kandida pou Sena nan depatman {d}. Nan lòd alfabetik.',
    'b.dep': 'Depite', 'b.dep.h': 'Kandida pou depite nan sikonskripsyon ki kouvri komin ou an.',
    'b.dep.multi': '{c} gen plizyè sikonskripsyon. Chèche pa w la anba a ; ou jwenn li sou kat elektè w.',
    'b.circo': 'Sikonskripsyon {c}',
    'b.may': 'Majistra ak adjwen nan {c}', 'b.may.h': 'Chak lis gen yon titilè ak adjwen li yo, ranje pa pati.',
    'b.cas': 'CASEC', 'b.cas.h': 'Konsèy administrasyon seksyon kominal la.', 'b.cas.pick': 'Chwazi seksyon w pou w wè lis yo.',
    'b.asec': 'ASEC', 'b.asec.h': 'Asanble seksyon kominal la.',
    'b.sec': 'Seksyon kominal ou', 'b.sec.choose': 'Chwazi seksyon m…', 'b.sec.note': 'Ou jwenn seksyon kominal ou sou kat elektè w. {n} seksyon gen kandida nan komin sa a.',
    'b.sec.none': 'CEP la poko enskri kandida CASEC oswa ASEC pou komin sa a.',
    'b.n.pres': '{n} pou prezidan', 'b.n.sen': '{n} pou Sena', 'b.n.dep': '{n} pou depite', 'b.n.may': '{n} pou majistra', 'b.n.cas': '{n} CASEC', 'b.n.asec': '{n} ASEC',
    'b.share': 'Pataje bilten mwen', 'b.map': 'Gade sou kat la', 'b.print': 'Enprime',
    'b.empty': 'Chwazi komin ou', 'b.empty.p': 'Bilten ou montre nan lòd sa a : prezidan, Sena depatman w lan, depite sikonskripsyon w lan, answit majistra, CASEC ak ASEC komin ou an.',
    'b.empty.n': 'Chwa w la rete sou telefòn ou.',
    'b.nolist': 'Poko gen lis ki enskri.', 'b.nocand': 'Poko gen kandida ki enskri.',
    'b.foot': 'Lis piblik CEP la nan dat {d}. Se poko lis final kandida yo aksepte. Kandidati kapab chanje oswa yo kapab retire jiska jou eleksyon an.',
    'b.favs': 'Favori mwen', 'b.before.may': 'Anvan 2026', 'b.before.may.p': 'Rezilta ansyen eleksyon minisipal yo poko nan NapVote.',
    'h.here': 'Rezilta anvan yo lakay ou (2015-2017)', 'h.sen': 'Nan Sena a ({d}), 2015-2017', 'h.pres': 'An 2016, nan depatman {d}', 'h.sen.all': 'Tout senatè yo ›', 'h.pres.all': 'Rezilta nasyonal ›',

    'c.title': 'Tout kandida yo', 'c.sub': 'Kandida ki enskri nan CEP la, pa pòs. Filtre pa depatman, pa pati oswa pa non.',
    'c.alld': 'Tout depatman', 'c.allp': 'Tout pati', 'c.name': 'Chèche pa non', 'c.hist': 'Te deja kandida an 2015-2017', 'c.fav': 'Favori mwen', 'c.reset': 'Retabli',
    'c.count.1': '{n} kandida', 'c.count.n': '{n} kandida', 'c.of': '{n} sou {t}', 'c.more': 'Wè plis ({n} ki rete)', 'c.none': 'Pa gen kandida ki koresponn. Chèche pi laj oswa peze « Retabli ».',
    'c.map': 'Kat ›', 'c.national': 'Kandidati nasyonal',

    'm.title': 'Kat kandida yo', 'm.sub': 'Peze sou yon depatman pou w grosi l, answit sou yon komin pou w wè kandida li yo.', 'm.search': 'Kandida, komin', 'm.party': 'Pati',

    'r.title': 'Rezilta ansyen eleksyon yo', 'r.sub': 'Prezidansyèl 2016, senatoryal ak lejislativ 2015 ak refè yo jiska janvye 2017 : ki moun ki genyen, ak konbyen vòt, nan chak depatman ak sikonskripsyon.',
    'r.t.pres': 'Prezidansyèl 2016', 'r.t.sen': 'Sena 2015-17', 'r.t.dep': 'Depite 2015-17', 'r.t.fait': 'Fè enpòtan',
    'st.r1': 'Eli nan premye tou', 'st.r2': 'Eli nan dezyèm tou', 'st.late': 'Eli apre refè eleksyon an', 'st.qualif': 'Dezyèm tou san rezilta', 'st.annule': 'Eleksyon an anile', 'st.reprise1': 'Pou refè', 'st.reprise2': 'Dezyèm tou pou refè', 'st.inconnu': 'Rezilta pa pibliye',
    'hx.last': 'Dènye eli a', 'hx.votes': 'Vòt · pousantaj', 'hx.decisive': 'Eleksyon ki deside a', 'hx.valid': 'Vòt ki valab', 'hx.c15': 'kandida an 2015', 'hx.c26': 'enskri an 2026',
    'hx.prov': 'Pwovizwa', 'hx.wiki': 'CEP pa konfime l',

    'cal.title': 'Kalandriye elektoral', 'cal.sub': 'Kalandriye ofisyèl 2026-2027 CEP la pibliye, k ap mete ajou.',
    'cal.first': 'Premye tou', 'cal.second': 'Dezyèm tou', 'cal.keys': 'Etap prensipal yo', 'cal.reg': 'Enskripsyon kandida yo', 'cal.all': 'Gade 28 etap kalandriye ofisyèl la',
    'el.title': 'Elektè ki enskri', 'el.dept': 'Pa depatman',
    'news.title': 'Nouvèl ak kominike', 'news.sub': 'Kominike CEP la ak tit jounal yo. Atik yo louvri sou sit medya a.',
    'about.title': 'Konsènan NapVote', 'about.sub': 'Yon zouti sitwayen ki endepandan pou konnen ki moun k ap kandida ak sa ki te pase nan eleksyon anvan yo.',
    'about.theme': 'Aparans', 'theme.auto': 'Otomatik', 'theme.light': 'Klè', 'theme.dark': 'Fonse',
    'about.install': 'Enstale aplikasyon an',

    'f.fav.add': 'Mete nan favori', 'f.fav.on': 'Nan favori m', 'f.share': 'Pataje', 'f.facts': 'Repè', 'f.sources': 'Sous', 'f.hist': 'Pakou elektoral',
    'f.map': 'Gade sou kat la ›', 'f.bul': 'Wè bilten komin sa a ›', 'f.peers.dep': 'Lòt kandida nan sikonskripsyon an', 'f.peers.list': 'Kolistye (menm pati, menm lis)',
    'fav.on': 'Mete nan favori', 'fav.off': 'Retire nan favori', 'copied': 'Kopye', 'copy.fail': 'Pa kapab kopye', 'share.none': 'Telefòn sa a pa kapab pataje',
    'mark.aria': 'Mete nan favori : {n}',
    'days.0': 'jodi a', 'days.1': 'demen', 'days.n': 'nan {n} jou', 'days.past': 'pase',
    'date.1': 'Dènye jou pou enskri elektè', 'date.2': 'Dènye jou pou enskri kandida', 'date.3': 'Premye tou : prezidansyèl ak lejislativ', 'date.4': 'Dezyèm tou ak kolektivite teritoryal',
    'foot': 'NapVote se yon inisyativ sitwayen ki endepandan. Li pa gen anyen pou wè ak Konsèy Elektoral Pwovizwa (CEP). Kandida : CEP ({d}). Rezilta 2015-2017 : CEP (atravè HaïtiLibre) ak Wikipédia.', 'foot.more': 'Sous ak limit ›',
    'err.boot': 'NapVote pa kapab pati', 'err.reload': 'Rechaje', 'update': 'NapVote mete ajou. Rechaje paj la pou w itilize l.'
  };

  var lang = 'fr';
  try {
    var s = window.localStorage.getItem('vv.lang');
    if (s) { lang = JSON.parse(s); }
    else { var nl = (navigator.languages || [navigator.language || '']).join(',').toLowerCase(); lang = /(^|,)(ht|hat)/.test(nl) ? 'ht' : 'fr'; }
  } catch (e) { /* stockage indisponible */ }
  if (lang !== 'ht') { lang = 'fr'; }

  window.NVLang = lang;
  window.t = function (k, v) {
    var s = (lang === 'ht' && HT[k]) || FR[k] || k;
    if (v) { Object.keys(v).forEach(function (n) { s = s.split('{' + n + '}').join(v[n]); }); }
    return s;
  };
  window.NVSetLang = function (l) {
    try { window.localStorage.setItem('vv.lang', JSON.stringify(l)); } catch (e) { /* ignore */ }
    window.location.reload();
  };

  document.documentElement.setAttribute('lang', lang === 'ht' ? 'ht' : 'fr');
  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = window.t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', window.t(el.getAttribute('data-i18n-ph'))); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', window.t(el.getAttribute('data-i18n-aria'))); });
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
  }
  window.NVApplyLang = apply;
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', apply); } else { apply(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.lang button[data-lang]');
    if (b && b.getAttribute('data-lang') !== lang) { window.NVSetLang(b.getAttribute('data-lang')); }
  });
})();
