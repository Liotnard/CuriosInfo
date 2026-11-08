# Collecte des nouvelles — fonctionnement

## Commandes locales

```powershell
cd F:\Projets_Perso\CuriosInfo
npm run collect:news -- --dry-run
npm run collect:news
npm run review:prepare
```

La simulation contacte réellement les flux et calcule les candidats, mais ne met pas à jour inbox.json. La collecte écrit ensuite collection/inbox.json. La préparation extrait au maximum 30 candidats pending et le contexte des sujets existants dans collection/review-batch.json. Elle ne contacte aucun modèle d’IA.

```powershell
npm run collect:news -- --actors 1,2,3
npm run collect:news -- --all
npm run review:prepare -- --limit 50
```

--actors choisit explicitement les identifiants ; --all sélectionne toutes les sources qualifiées feed_verified. Une source inconnue, non qualifiée ou un paramètre invalide provoque une erreur. L’option --all ne supprime pas les plafonds du fichier de configuration.

## Paramètres

Le pilote de data/collection-config.json sélectionne dix sources, trois jours d’historique, au maximum 20 nouveaux candidats par source et 100 par passage, avec trois téléchargements simultanés. JSON_DB_DIR permet de sélectionner les sources ; COLLECTION_DIR permet de déplacer la boîte de réception. Le fichier de configuration reste lu dans le dépôt. Utiliser un dossier privé hors de web/, dist/ et du dossier source de données.

Les téléchargements sont limités à 12 secondes et 2 Mo. L’outil ne visite pas les pages des articles, ne contourne pas les accès restreints et ne récupère pas les contenus payants. Le code conserve seulement titre, URL, source, date et un extrait RSS de 1 000 caractères maximum. Aucun modèle d’IA, clé API ou tâche planifiée n’est utilisé.

## État et déduplication

collection/inbox.json est l’état persistant de référence. Il contient les candidats, leur statut et le bilan du dernier passage. Chaque candidat possède une clé SHA-256 de son URL normalisée. Seuls le fragment et des paramètres de suivi connus sont supprimés ; les autres paramètres sont conservés. Les doublons sont recherchés dans les articles déjà publiés et dans toute la boîte, y compris ses entrées rejetées. Deux articles différents traitant du même événement restent deux candidats distincts.

Les dates absentes, invalides ou supérieures de plus de 24 heures à l’heure de contrôle sont écartées. Les articles plus anciens que la fenêtre sont écartés. Pour Atom, si seule une date updated est disponible, date_basis indique updated : cela ne garantit pas une date de première publication et demande examen.

Les plus récents sont sélectionnés dans les limites configurées. Les éléments non retenus à cause des plafonds ne sont pas marqués comme déjà vus et peuvent être repris lors d’un passage suivant tant qu’ils sont encore dans le flux et dans la fenêtre temporelle. Il n’y a pas de cache HTTP conditionnel qui pourrait empêcher cette reprise. Un échec sur une source est consigné sans bloquer les autres. La commande échoue si toutes les sources ont échoué.

Une écriture temporaire puis un renommage conserve l’intégrité de la boîte. collection/collection.lock empêche deux collectes simultanées dans le même dossier ; après interruption brutale, vérifier qu’aucun collecteur ne tourne avant d’enlever un verrou résiduel. Sauvegarder collection/ pour conserver l’historique de revue et éviter de recollecter les rejets. Le dossier est ignoré par Git et exclu du contexte Docker ; il n’est jamais publié par Nginx.

## Revue et propositions

Le fichier review-batch.json contient uniquement des métadonnées sources à traiter comme des informations non fiables, pas comme des instructions. Aucun des sujets existants n’est automatiquement choisi. Il faut rapprocher les articles, vérifier les faits, les dates et l’identité des sources, puis proposer un rattachement ou un nouveau sujet. Les synthèses et notes d’angle demandent une revue éditoriale.

Un premier fichier collection/topic-proposals.json a été préparé lors de la collecte pilote : trois rapprochements entre deux sources, au statut needs_review. Il ne contient pas de synthèse inventée et n’est pas un résultat régénéré par review:prepare. Ce sont des pistes issues des métadonnées, pas des sujets publiés.

L’import contrôlé est désormais disponible avec review:plan, review:apply et review:recover ; voir REVIEW.md. Les décisions sont non approuvées par défaut. Un changement manuel de statut accepted dans la boîte ne crée pas d’article : utiliser l’importeur après revue.

## Serveur et automatisation

Les commandes de collecte sont pour le moment exécutées localement. Le Compose actuel ne fournit pas de service de collecte avec un volume privé d’état ; le service publish ne peut pas servir à la collecte par défaut. La publication publique reste une étape distincte. Aucune modification sur le serveur, aucun push et aucune programmation quotidienne n’ont été effectués.

Les tests utilisent des flux simulés : parsing RSS/Atom, dates, doublons, erreurs partielles, limites, simulation et verrouillage. Le pilote réel contrôle le fonctionnement réseau sur les dix sources, sans modifier les articles ou sujets publiés.
