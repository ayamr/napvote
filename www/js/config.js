/* Configuration de déploiement.
   liveUrl : adresse publique de data/live.json (ex. https://VOTRE-COMPTE.github.io/napvote/data/live.json).
   Dans les applications Android/iOS, les données sont rafraîchies depuis cette adresse sans republication sur les stores. */
/* pollUrl : adresse du service du sondage (Cloudflare Worker), vide = sondage masqué. turnstileKey : clé publique Turnstile (facultatif). */
window.NAPVOTE = { liveUrl: 'https://napvote-ht.com/data/live.json', pollUrl: 'https://napvote-poll.chilllive969.workers.dev', turnstileKey: '0x4AAAAAAFTrjrskfDoj28GS' };
