import json
S="src/"
g={x["id"]:x["name"] for x in json.load(open(S+"api_geography.json"))}
summ=json.load(open(S+"api_stats-summary.json"))[0]
dep=[]
NAMES={"ARTIBONITE":"Artibonite","CENTRE":"Centre","GRANDE-ANSE":"Grand'Anse","NIPPES":"Nippes","NORD":"Nord","NORD-EST":"Nord-Est","NORD-OUEST":"Nord-Ouest","OUEST 1":"Ouest","SUD":"Sud","SUD-EST":"Sud-Est"}
for r in json.load(open(S+"api_stats-geography.json")):
    n=g[r["geographyId"]]
    dep.append({"n":NAMES[n],"raw":n,"v":r["registeredVoterCount"],"cap":r["capacity"]})
dep.sort(key=lambda d:-d["v"])
assert abs(sum(d["v"] for d in dep)-summ["registeredVoterCount"])<=0.01*summ["registeredVoterCount"], "départements et total incohérents"  # les deux relevés du CEP peuvent différer de quelques unités

CEP="https://cephaiti.ht/"
# Calendrier électoral actualisé 2026-2027 du CEP (version signée) : étapes numérotées de l'original ; les sous-étapes utiles gardent leur numéro (ex. 14.3)
cal=[
 ("1","Communication, sensibilisation et éducation civique","2026-02-01","2027-10-30"),
 ("2","Renforcement des structures déconcentrées","2026-10-01","2026-12-29"),
 ("3","Gestion des tablettes","2026-10-19","2027-09-03"),
 ("4","Mise en place des bureaux départementaux de tabulation des votes","2026-04-13","2027-07-03"),
 ("5","Mise en place des bases opérationnelles logistiques (BOL)","2026-12-01","2027-03-30"),
 ("6","Mise à jour de la liste des centres de vote","2027-02-16","2027-03-21"),
 ("7","Recrutement des superviseurs de centres de vote","2027-03-22","2027-04-25"),
 ("8","Recrutement des membres de bureaux de vote (MBV)","2027-02-02","2027-06-27"),
 ("9","Mise à jour de la liste des agents de la Direction du registre électoral (ADRE)","2027-03-23","2027-04-22"),
 ("10","Mise à jour de la liste des agents de sécurité électorale (ASE)","2027-03-23","2027-05-02"),
 ("11","Recrutement des opérateurs du CTV et des BDTV","2027-04-01","2027-05-11"),
 ("12","Enregistrement des groupements et regroupements de partis politiques","2026-07-13","2026-08-15"),
 ("13","Inscription des candidats","2026-08-20","2027-02-09"),
 ("13.2","Inscription en ligne des candidats à la présidentielle, au Sénat et à la Chambre des députés","2026-08-20","2026-11-15"),
 ("13.4","Dépôt des pièces requises : présidentielle, sénatoriales, députation","2026-09-01","2026-11-30"),
 ("13.8","Affichage de la liste préliminaire : présidentielle, sénatoriales, députation","2026-12-15","2026-12-15"),
 ("13.21","Publication de la liste définitive : président, sénateurs et députés","2027-01-11","2027-01-11"),
 ("13.35","Publication de la liste définitive : collectivités territoriales","2027-02-08","2027-02-08"),
 ("14","Mise à jour du registre électoral","2026-07-20","2027-06-29"),
 ("14.1","Inscription des électeurs","2026-07-20","2027-05-20"),
 ("14.3","Fermeture du registre électoral","2027-05-20","2027-05-20"),
 ("14.4","Publication des listes électorales","2027-06-19","2027-06-19"),
 ("15","Accréditation des mandataires de partis politiques, groupements et regroupements","2026-10-12","2027-07-14"),
 ("16","Formation du personnel vacataire","2026-06-01","2027-07-15"),
 ("17","Accréditation des observateurs et des journalistes","2026-07-03","2026-12-30"),
 ("18","Acquisition de matériels sensibles et non sensibles","2026-07-02","2027-06-19"),
 ("19","Vérification du matériel","2027-06-20","2027-06-29"),
 ("20","Distribution du matériel","2027-06-30","2027-07-17"),
 ("20.3","Campagne électorale du premier tour","2027-04-15","2027-07-17"),
 ("21","Mise en œuvre du vote des Haïtiens vivant à l'étranger",None,None),
 ("21.1","Accord avec les pays hôtes","2026-12-01","2026-12-30"),
 ("21.2","Recrutement des agents électoraux","2026-12-01","2027-01-14"),
 ("21.3","Formation des agents électoraux","2027-02-01","2027-07-10"),
 ("21.4","Publication et affichage de la liste des centres de vote","2027-06-19","2027-06-19"),
 ("22","Jour du scrutin du premier tour : présidentielle, législatives et ratification populaire","2027-07-18","2027-07-18"),
 ("23","Tabulation des résultats","2027-07-18","2027-07-19"),
 ("24","Publication et affichage des résultats de la ratification populaire","2027-07-20","2027-07-20"),
 ("25","Publication des modifications apportées dans la loi mère dans Le Moniteur","2027-07-21","2027-07-21"),
 ("26","Publication et affichage des résultats préliminaires du premier tour (présidentielle et législatives)","2027-07-22","2027-07-22"),
 ("27","Contentieux des résultats du premier tour (présidentielle et législatives)","2027-07-22","2027-08-08"),
 ("28","Publication et affichage des résultats définitifs du premier tour (présidentielle et législatives)","2027-08-09","2027-08-09"),
 ("29","Acquisition de matériels sensibles pour le second tour","2027-08-10","2027-09-13"),
 ("30","Vérification du matériel sensible","2027-09-14","2027-09-18"),
 ("31","Distribution du matériel sensible","2027-09-19","2027-10-01"),
 ("32","Campagne électorale du second tour (législatives, présidentielle, collectivités territoriales)","2027-09-03","2027-10-02"),
 ("33","Déploiement du personnel vacataire","2027-09-15","2027-09-18"),
 ("34","Simulation dans les centres de vote","2027-09-16","2027-09-18"),
 ("35","Jour du scrutin du second tour : législatives, présidentielle et collectivités territoriales","2027-10-04","2027-10-04"),
 ("36","Tabulation des votes","2027-10-04","2027-10-05"),
 ("37","Publication et affichage des résultats préliminaires du second tour","2027-10-06","2027-10-07"),
 ("38","Contentieux des résultats préliminaires du second tour","2027-10-08","2027-10-22"),
 ("39","Publication et affichage des résultats définitifs du second tour (législatives, présidentielle)","2027-10-20","2027-10-20"),
 ("40","Publication et affichage des résultats définitifs des collectivités territoriales","2027-10-23","2027-10-23"),
]
KEY={"13","14.1","14.3","20.3","22","26","28","32","35","37","39","40"}
reg=[
 ("Inscription en ligne des candidats (présidentielle, sénatoriales, députation)","2026-08-20","2026-11-15"),
 ("Dépôt des pièces requises (présidentielle, sénatoriales, députation)","2026-09-01","2026-11-30"),
 ("Analyse des dossiers","2026-12-01","2026-12-15"),
 ("Affichage de la liste préliminaire","2026-12-15","2026-12-15"),
 ("Contestations, décisions et recours (BCEC, BCED, BCEN)","2026-12-15","2026-12-30"),
 ("Liste définitive des candidats à la présidentielle, au Sénat et à la Chambre","2027-01-11","2027-01-11"),
 ("Fin du délai de renonciation","2027-01-12","2027-01-12"),
 ("Collectivités territoriales : inscription en ligne des candidats","2026-08-20","2026-11-30"),
 ("Collectivités territoriales : dépôt des pièces requises","2026-08-20","2026-12-30"),
 ("Collectivités territoriales : liste définitive des candidats","2027-02-08","2027-02-08"),
]
news=[
 {"src":"CEP","date":"2026-10-28","t":"Publication du calendrier électoral actualisé","s":"Le calendrier résulte du décret électoral du 6 octobre 2026, suivi de consultations avec les forces de sécurité, les acteurs politiques, la société civile et le secteur privé. Premier tour le 18 juillet 2027, second tour le 4 octobre 2027.","u":CEP+"publication-du-calendrier-electoral-actualise/"},
 {"src":"CEP","date":"2026-10-05","t":"Prolongation de l'inscription en ligne des candidats et ajustement de certaines échéances","s":"L'inscription en ligne des candidats et le dépôt des pièces sont prolongés jusqu'au 31 octobre. La campagne électorale est reportée et un calendrier actualisé sera publié. La note fait suite à des modifications du décret électoral adoptées en Conseil des ministres le 5 octobre.","u":CEP+"prolongation-de-la-periode-dinscription-en-ligne-des-candidats-et-ajustement-de-certaines-echeances-du-processus-electoral/"},
 {"src":"CEP","date":"2026-09-29","t":"Visite de la ministre des Affaires étrangères au Conseil électoral provisoire","s":"Rencontre du 28 septembre sur la préparation de l'expérience pilote du vote de la diaspora haïtienne et sur le suivi des missions d'exploration à l'étranger.","u":CEP+"visite-de-travail-de-la-ministre-des-affaires-etrangeres-au-conseil-electoral-provisoire/"},
 {"src":"CEP","date":"2026-09-29","t":"Le CEP intensifie la campagne de sensibilisation autour de l'inscription des électeurs","s":"Lancée le 23 septembre au Lycée national de Pétion-Ville auprès d'élèves du Nouveau secondaire, pour encourager les primo-votants à s'inscrire.","u":CEP+"la-direction-de-communication-du-cep-intensifie-la-campagne-de-sensibilisation-et-de-motivation-autour-de-linscription-des-electeurs/"},
 {"src":"CEP","date":"2026-09-28","t":"Le CEP met en garde contre toute campagne électorale prématurée","s":"La période officielle de campagne n'a pas encore débuté : il revient au CEP de la fixer (article 193 du décret électoral du 2 juin 2026). Partis et candidats sont invités à s'abstenir de toute activité de campagne d'ici là.","u":CEP+"le-conseil-electoral-provisoire-met-en-garde-contre-toute-campagne-electorale-prematuree/"},
 {"src":"CEP","date":"2026-09-28","t":"Une délégation du CEP en France pour préparer le vote de la diaspora","s":"Mission d'exploration dirigée par le vice-président Jaccéus Joseph, en vue de l'expérience pilote du vote de la diaspora haïtienne.","u":CEP+"une-delegation-du-cep-en-france-dans-la-perspective-du-vote-de-la-diaspora-haitienne/"},
 {"src":"CEP","date":"2026-09-27","t":"Deux délégations du CEP au Brésil et au Canada","s":"","u":CEP+"deux-delegations-du-cep-au-bresil-et-au-canada-en-vue-dobserver-le-deroulement-des-elections/"},
 {"src":"CEP","date":"2026-09-25","t":"Installation du nouveau bureau du Conseil électoral","s":"Le Conseil a installé son nouveau bureau le 24 septembre 2026 ; Peterson Pierre-Louis en est le président.","u":CEP+"installation-du-nouveau-bureau-du-conseil-le-jeudi-24-septembre-2026/"},
 {"src":"Le Nouvelliste","date":"2026-09-23","t":"Neuf candidats à la présidence inscrits au 23 septembre","s":"Le journal a obtenu la liste des candidats à la présidence inscrits sur la plateforme en ligne du CEP ; elle reste évolutive.","u":"https://lenouvelliste.com/article/272233/neuf-candidats-a-la-presidence-inscrits-au-23-septembre"},
 {"src":"CEP","date":"2026-09-21","t":"État d'avancement du processus électoral","s":"628 755 électeurs inscrits et 1 285 centres d'inscription et de vote opérationnels. Sur la plateforme : 7 candidatures à la présidence, 162 au Sénat, 419 à la députation.","u":CEP+"etat-davancement-du-processus-electoral-a-date/"},
 {"src":"Le Nouvelliste","date":"2026-09-21","t":"Très peu d'électeurs inscrits après deux mois","s":"637 321 inscrits au 21 septembre, sur plus de 6,5 millions de personnes en âge de voter détentrices de la carte d'identification nationale.","u":"https://lenouvelliste.com/article/272169/voter-registration-remains-very-low-after-two-months"},
 {"src":"Le Nouvelliste","date":"2026-09-16","t":"Sept candidats à la présidence inscrits, le CEP prolonge le délai d'inscription","s":"Deuxième prolongation en deux semaines accordée aux organisations politiques pour inscrire leurs candidats en ligne.","u":"https://lenouvelliste.com/article/272019/seven-presidential-candidates-registered-cep-extends-deadline"},
 {"src":"Le Nouvelliste","date":"2026-09-14","t":"Trois candidats à la présidence, 68 au Sénat et 205 à la députation déjà inscrits","s":"Chiffres au 14 septembre ; le dépôt des pièces par les candidats est ouvert du 13 au 22 septembre.","u":"https://lenouvelliste.com/article/271924/three-for-president-68-for-senate-and-205-for-the-chamber-of-deputies-already-registered-with-the-cep"},
 {"src":"CEP","date":"2026-09-02","t":"Prolongation de la période d'inscription des candidats","s":"Date limite repoussée du 2 au 14 octobre 2026 ; la liste définitive des candidats agréés est annoncée pour le 14 octobre.","u":CEP+"prolongation-de-la-periode-dinscription-des-candidats/"},
 {"src":"CEP","date":"2026-07-27","t":"Publication officielle du calendrier électoral 2026-2027","s":"Premier tour le 13 décembre 2026, second tour le 21 février 2027, sous réserve d'un climat sécuritaire acceptable et des financements nécessaires.","u":CEP+"publication-officielle-du-calendrier-electoral-2026-2027/"},
]
import os
_f=json.load(open(S+"fetched.json")) if os.path.exists(S+"fetched.json") else {"date":"2026-10-07","iso":"2026-10-07T00:00:00"}
E={"collected":_f["date"],"fetchedAt":_f["iso"],
 "voters":{"total":summ["registeredVoterCount"],"applications":summ["applicationCount"],"civActive":summ["activeVotingCenterCount"],"civTotal":summ["votingCenterCount"],"operators":summ["activeOperatorCount"],"dept":dep,
   "refs":[{"date":"2026-09-21","v":628755,"src":"Note d'avancement du CEP"},{"date":_f["date"],"v":summ["registeredVoterCount"],"src":"Statistiques publiques du CEP"}]},
 "cal":[{"n":n,"t":t,"a":a,"b":b,"key":n in KEY} for n,t,a,b in cal],
 "reg":[{"t":t,"a":a,"b":b} for t,a,b in reg],
 "news":news}
os.makedirs("_build",exist_ok=True)
json.dump(E,open("_build/election.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print(len(json.dumps(E)),E["voters"]["total"],[ (d["n"],d["v"]) for d in dep][:3])
