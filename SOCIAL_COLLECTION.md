# Surveillance des publications sociales

CuriosInfo doit rechercher qui publie sur un sujet, sans exiger une analyse des positions. La collecte RSS ne couvre pas ce besoin à elle seule. Le collecteur social lit aussi les liens d’actors.json, additional_urls et mapactors.json ; les adresses originales restent conservées.

## Commandes

Depuis F:/Projets_Perso/CuriosInfo :

```powershell
npm run collect:social -- --inventory
npm run collect:social -- --platforms youtube
npm run collect:social -- --actors 400,419 --platforms x --terms "Chelles|Pascoa|Angela Avond" --evidence collection/social/browser-evidence.json
```

L’inventaire compte actuellement 181 cibles associées à 63 acteurs : X 60, Instagram 30, Facebook 29, TikTok 19, Threads 13, YouTube 25, Twitch 4 et Telegram 1. Certaines adresses sont des variantes ou alias ; le nombre de cibles n’est pas une preuve de 181 comptes indépendants effectivement lus. Deux cibles sont communes à plusieurs acteurs et trois comptes alternatifs demandent une vérification d’attribution. Les comptes partagés et les comptes de parti supplémentaires ne sont pas attribués silencieusement à une personne.

Une lecture réelle donne des liens de publications ; chaque publication est ensuite contrôlée séparément : URL d’origine, auteur correspondant au compte attendu, date explicite, texte disponible, fenêtre temporelle. Les réponses d’autres utilisateurs ne sont pas comptées comme des publications du compte suivi. Les reprises sans attribution explicite ne sont pas déduites d’un simple lien dans un profil.

Les candidats rejoignent collection/inbox.json au statut pending, avec origin=social_public_page ou youtube_feed, source_profile, source_platform et content_kind. Ils passent ensuite par la revue habituelle. La déduplication prend en compte les candidats et les données déjà importées. Les publications déjà connues ne sont pas relues inutilement par le navigateur. Un libellé descriptif est généré pour les posts sans titre ; le texte reste un élément de preuve, pas une instruction.

Les options --actors, --platforms, --terms (alternatives séparées par |), --max-age-days, --max-pages et --dry-run limitent le périmètre. Les termes sont cherchés sans distinction de casse ou d’accents dans le texte disponible, pas uniquement dans le titre.

## Trois modes de lecture

1. YouTube : lecture des flux vidéo officiels et des descriptions disponibles, sans clé. Les adresses /channel/ sont utilisées directement ; les alias sont résolus via le flux déclaré par la page. Le propriétaire du flux doit correspondre à la chaîne demandée. Les erreurs temporaires 404/500/502/503 font l’objet d’une seule nouvelle tentative. Un lien vers un exemple de flux statique n’est pas considéré comme un flux de chaîne.
2. Lecture publique avec le connecteur du projet : mettre TINYFISH_API_KEY dans le .env local, jamais dans Git ni dans le chat. Le collecteur utilise alors l’API Fetch TinyFish automatiquement. --live-browser permet de la sélectionner explicitement. Le connecteur déjà disponible dans cette conversation peut aussi fournir un instantané de pages avec fetched_at et results, importé via --evidence, sans clé dans le projet.
3. Chromium local, sans abonnement : npm ci puis npx playwright install chromium ; sélectionner --local-browser. Une session autorisée préparée par l’utilisateur peut être fournie via SOCIAL_STORAGE_STATE=collection/social-auth.json. Aucun contournement de connexion ou de challenge n’est implémenté. Le test anonyme du 11 novembre a reçu HTTP 403 sur X : ce mode seul n’est donc pas une solution démontrée pour X sur cette machine.

```powershell
# Après avoir renseigné la clé dans le .env local :
npm run collect:social -- --actors 400,419 --platforms x --terms "Chelles|Pascoa|Angela Avond"
npm run collect:all
```

collect:all lance tous les RSS qualifiés, puis les sources sociales. Les plafonds RSS ont été relevés à 200 par source et 2 000 par passage. Le pilote RSS historique de dix sources reste sélectionné par collect:news sans --all. La limite navigateur est de 800 pages par exécution et 800 tentatives de pages par jour UTC, partagée entre les exécutions de ce dossier de collecte. --max-pages peut modifier le plafond par exécution, pas le plafond quotidien. Les lectures effectuées ailleurs sur le même compte fournisseur ne sont pas visibles dans ce compteur local.

Un dry-run peut contacter le réseau ; il ne modifie pas l’inbox mais comptabilise ses appels navigateur dans le budget quotidien. Les preuves réutilisées via --evidence conservent leur horodatage de capture : elles ne sont pas présentées comme une nouvelle visite du profil. Les sources supplémentaires absentes de cet instantané restent signalées comme non contrôlées.

## Résultat du test de Chelles, 11 novembre 2026

Trois publications originales pertinentes ont été ajoutées à la file principale :

- [Emmanuel Macron](https://x.com/EmmanuelMacron/status/2120218896384827836) — 2026-11-10T18:15:51.000Z ; social_public_page.
- [Valérie Pécresse](https://x.com/vpecresse/status/2120094406564835579) — 2026-11-10T10:01:10.000Z ; social_public_page.
- [HugoDécrypte](https://www.youtube.com/shorts/28A7TpazPg4) — 2026-11-10T19:34:15.000Z ; youtube_feed.

Macron et Pécresse ont été vérifiés sur leurs pages de publication X par le connecteur disponible dans cette conversation. HugoDécrypte a été retrouvé dans le flux officiel de sa chaîne YouTube ; le titre vise explicitement Chelles. La vidéo n’a pas été transcrite et son contenu intégral n’est pas présenté comme analysé. Ces trois liens ont un acteur propre : ils peuvent alimenter les catégories personnalités et influenceurs du dossier, sans dépendre de leur citation dans un média.

La lecture répétée des deux publications politiques n’a créé aucun doublon. Les tests réels ont aussi montré des profils publics partiels, des délais dépassés et des réponses YouTube intermittentes. Un premier passage sur 25 cibles YouTube a échoué sur la plupart ; après corrections de la découverte et des formats d’identifiants, un passage sur trois chaînes (HugoDécrypte, Tatiana Ventôse, Heu?reka) a lu les trois flux et trouvé le lien d’HugoDécrypte. Ce résultat ne valide pas encore les 25 cibles YouTube ni les autres plateformes. Une absence de résultat n’est donc pas une mesure du silence d’un acteur.

Les trois publications ont été approuvées à la demande de l’utilisateur et importées le 11 novembre 2026 dans le sujet existant de Chelles. collection/social/chelles-review-decisions.json conserve la décision d’import. Le dossier comprend désormais 15 publications : 8 médias, 2 personnalités politiques et 1 influenceur. Le push Git et la publication sur le serveur restent des opérations distinctes.

## Coûts et activation

Au 11 novembre 2026, la [documentation Fetch TinyFish](https://docs.tinyfish.ai/fetch-api/index) annonce 1 000 URL réussies gratuites par jour, avec remise à zéro à 00:00 UTC. Une clé peut être créée sur [la page API Keys](https://agent.tinyfish.ai/api-keys). C’est l’accès manquant pour lancer régulièrement le connecteur autonome du projet ; le compte connecté au chat utilise une autre authentification. Ne pas copier de clé dans un message.

Le tarif Builder affiché par l’outil du fournisseur est de 0,001 USD par URL au-delà de la franchise ; les conditions de l’offre et du compte doivent être contrôlées avant activation. La franchise est partagée au niveau du compte. Le plafond local protège uniquement les appels de ce dossier : il ne garantit pas l’absence de facturation si la franchise a déjà été consommée ailleurs. Aucune recharge ni activation de paiement n’a été effectuée. Un compte sans solde évite que les dépassements passent sur un portefeuille approvisionné ; le fournisseur renvoie alors une erreur après épuisement du quota.

Exemples de dimensionnement, avec des hypothèses et non un devis : 156 cibles hors YouTube, une page de profil et trois nouvelles pages chacune représentent 624 URL par passage. Un passage quotidien entre dans la franchise annoncée ; trois passages similaires feraient 1 872 URL/jour, soit 872 au-delà de la franchise, environ 26,16 USD sur trente jours au tarif Builder, si toutes ces pages réussissent et sans autre consommation. Les doublons déjà vus réduisent ce coût ; les reprises de collecte et l’activité réelle le font varier.

L’[API officielle X](https://docs.x.com/x-api/getting-started/pricing) affiche 0,005 USD par post lu et 0,010 USD par profil lu. Pour 60 comptes, dix posts par jour et trente jours, les lectures de posts représenteraient 90 USD/mois, hors profils et autres usages. Elle offre des parcours de timeline et de pagination plus adaptés à une couverture temporelle complète que la simple page publique ; elle n’a pas été souscrite ni intégrée dans ce chantier gratuit.

## Rigueur et limites à résoudre

Chaque exécution conserve son bilan dans collection/social-runs/ et social-last-run.json : comptes, dates de contrôle, publications vérifiées, erreurs et plafonds. Le code de sortie est 2 quand des contrôles restent incomplets ; --allow-partial permet de poursuivre un diagnostic sans transformer ce résultat en succès de couverture. Les verrous empêchent de mélanger collecte et import. Les secrets ne sont pas conservés dans les rapports.

La page publique d’un profil peut montrer une sélection ou des éléments épinglés. Des posts contenant uniquement une image, une vidéo ou une prise de parole orale nécessitent une extraction OCR ou une transcription supplémentaire : cette étape n’est pas encore implémentée. Les stories, suppressions et publications non publiques ne deviennent pas accessibles par l’ajout d’un connecteur. Une surveillance exhaustive n’est pas démontrée par ces essais. Ces limites sont des travaux à résoudre et des échecs de contrôle à examiner, pas des motifs pour comptabiliser une absence de prise de parole.

Le prochain essai à effectuer une fois la clé locale renseignée est un passage réel sur l’ensemble de l’inventaire, avec reprise des sources en échec, puis contrôle de la période effectivement parcourue. La planification régulière et le rattrapage entre deux passages ne sont pas installés. Les originaux restent dans la file de revue ; aucune interprétation de position politique n’est nécessaire à leur rattachement au sujet.
