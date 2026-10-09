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
cal=[
 (1,"Communication, sensibilisation et éducation civique","2026-02-01","2027-03-17"),
 (2,"Mise en place des bureaux de tabulation de vote départementaux","2026-04-14","2026-11-30"),
 (3,"Accréditation des observateurs et des journalistes","2026-07-03","2026-08-18"),
 (4,"Enregistrement des groupements et regroupements de partis politiques","2026-07-13","2026-08-14"),
 (5,"Inscription des électeurs","2026-07-20","2026-10-13"),
 (6,"Inscription des candidats","2026-08-20","2026-10-31"),
 (7,"Recrutement des superviseurs de centres de vote","2026-08-31","2026-09-26"),
 (8,"Recrutement des membres de bureau de vote","2026-09-01","2026-11-21"),
 (9,"Accréditation des mandataires de partis politiques","2026-10-03","2026-12-04"),
 (10,"Campagne électorale du premier tour (législatives et présidentielle)","2026-10-05","2026-12-12"),
 (11,"Publication des listes électorales (J-30)","2026-11-13","2026-11-13"),
 (12,"Acquisition et distribution du matériel sensible et non sensible","2026-10-18","2026-12-12"),
 (13,"Scrutin du premier tour : législatives, présidentielle et ratification populaire","2026-12-13","2026-12-13"),
 (14,"Tabulation des votes","2026-12-13","2026-12-15"),
 (15,"Résultats de la ratification populaire","2026-12-16","2026-12-16"),
 (16,"Résultats préliminaires du premier tour (présidentielle et législatives)","2026-12-19","2026-12-19"),
 (17,"Contestations des résultats préliminaires du premier tour","2026-12-22","2027-01-09"),
 (18,"Résultats définitifs du premier tour (présidentielle et législatives)","2027-01-09","2027-01-09"),
 (19,"Acquisition et distribution du matériel pour le second tour","2027-01-11","2027-02-20"),
 (20,"Campagne électorale du second tour (législatives, présidentielle, collectivités territoriales)","2027-01-10","2027-02-20"),
 (21,"Scrutin du second tour : législatives, présidentielle et collectivités territoriales","2027-02-21","2027-02-21"),
 (22,"Tabulation des votes du second tour","2027-02-21","2027-02-23"),
 (23,"Résultats préliminaires du second tour (présidentielle et législatives)","2027-02-22","2027-02-22"),
 (24,"Résultats des collectivités territoriales","2027-02-23","2027-02-23"),
 (25,"Contestations des résultats préliminaires du second tour","2027-02-23","2027-03-06"),
 (26,"Contestations des résultats des collectivités territoriales","2027-02-24","2027-03-11"),
 (27,"Résultats définitifs du second tour (présidentielle et législatives)","2027-03-07","2027-03-07"),
 (28,"Résultats définitifs des collectivités territoriales","2027-03-12","2027-03-12"),
]
KEY={5,6,10,13,16,18,20,21,27,28}
reg=[
 ("Inscription en ligne des candidats","2026-08-20","2026-10-31"),
 ("Dépôt des pièces requises","2026-09-13","2026-10-31"),
 ("Liste définitive des candidats agréés",None,None),
]
news=[
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
 "cal":[{"n":n,"t":t,"a":a,"b":b,"key":n in KEY,"pp":n==10} for n,t,a,b in cal],
 "reg":[{"t":t,"a":a,"b":b} for t,a,b in reg],
 "news":news}
os.makedirs("_build",exist_ok=True)
json.dump(E,open("_build/election.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print(len(json.dumps(E)),E["voters"]["total"],[ (d["n"],d["v"]) for d in dep][:3])
