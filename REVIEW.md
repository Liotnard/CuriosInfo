# Revue éditoriale et import contrôlé

## État actuel

Les trois propositions du pilote sont préparées dans collection/review-decisions.json avec approved=false. Elles ne sont pas publiées. Les essais de création, liaison, rejet et récupération utilisent des données synthétiques dans des dossiers temporaires. Les fichiers data/articles.json et data/topics.json de travail n’ont pas été modifiés par ces essais.

## Parcours local

```powershell
npm run collect:news
npm run review:prepare
npm run review:plan
```

review:prepare produit un lot de contexte. review:plan utilise le fichier de propositions collection/topic-proposals.json pour créer un fichier de décisions ; il ne génère pas sémantiquement de nouveaux regroupements. Pour le pilote, le fichier des décisions est déjà créé : ne pas relancer cette commande pour l’écraser. Elle refuse de remplacer un fichier existant.

Pour un autre fichier :

```powershell
npm run review:plan -- --file collection/decisions-second-lot.json
```

## Éditer les décisions

Ouvrir collection/review-decisions.json avec l’éditeur de son choix. Le document contient version=1, reviewer et une liste decisions. Chaque décision a un identifiant stable id, une action et des candidate_keys qui référencent les candidats de la boîte.

Ne passer approved à true qu’après examen. Pour un import, sources_verified=true est une confirmation éditoriale explicite : l’outil ne peut pas établir à lui seul que les articles ont été lus ou les faits vérifiés. Renseigner reviewer avec la personne ou le processus responsable.

Actions disponibles :

- create_topic : crée un sujet à partir de topic.title, topic.slug, topic.summary et topic.angleNote. La synthèse doit être renseignée ; au moins deux acteurs distincts sont requis. Aucune synthèse ni analyse d’angle n’est inventée par l’importeur.
- link_topic : rattache les candidats à un sujet existant avec topicId. Aucun texte de sujet existant n’est réécrit.
- reject : marque les candidats comme rejetés, avec un reason non vide. Ils restent dans la boîte pour éviter de les récupérer à nouveau.

Les décisions approved=false sont ignorées. Un candidat ne peut être utilisé dans plusieurs décisions approuvées d’un même fichier. Les articles déjà liés à un autre sujet ou attribués à un autre acteur ne sont pas déplacés silencieusement. Pour réutiliser un slug existant, utiliser link_topic. Modifier les textes d’une décision déjà importée ne met pas à jour le sujet : éditer ce sujet séparément.

Si date_basis=updated, renseigner publication_dates avec la clé du candidat et une vraie date de publication ISO, par exemple 2026-11-08T10:00:00.000Z. Une date de mise à jour seule ne suffit pas à fabriquer une date de première publication.

## Simuler puis appliquer

```powershell
npm run review:apply -- --dry-run
```

Examiner le nombre de sujets, articles, rattachements et rejets. Le mode simulation valide le plan mais ne modifie pas les JSON. Les fichiers momentanés de verrouillage sont retirés après exécution. Si aucune décision n’est approuvée, le bilan indique zéro import.

Après validation du résultat :

```powershell
npm run review:apply
git diff -- data/articles.json data/topics.json
npm run publish:data
npm run build
npm start
```

Pour un autre fichier de décisions :

```powershell
npm run review:apply -- --file collection/decisions-second-lot.json --dry-run
npm run review:apply -- --file collection/decisions-second-lot.json
```

L’import écrit uniquement topics.json, articles.json et l’état de la boîte. Les acteurs et axes restent inchangés. Les nouveaux identifiants sont attribués au-dessus des identifiants déjà présents. Une réapplication identique ne crée pas de doublons. Les candidats importés deviennent accepted avec leurs identifiants d’article et de sujet ; les rejets restent rejected. Ces métadonnées sont conservées par les collectes suivantes.

L’import local n’effectue aucun push, transfert, publication distante ou appel à un modèle d’IA.

## Sauvegardes et interruptions

Avant toute écriture réelle, l’import sauvegarde l’état avant/après des trois fichiers et les décisions dans collection/import-backups/<identifiant>. Le dossier collection est privé, ignoré par Git et exclu de l’image publique ; le sauvegarder séparément.

Les accès à la boîte et aux données sont verrouillés pendant l’import. Un marqueur data/.review-import.json signale une transaction en cours. La publication et le lancement de la collecte refusent de continuer si un import est inachevé. Ne pas lancer manuellement une édition ou une publication en parallèle d’un import ; la publication reste une étape distincte après succès.

Les fichiers sont remplacés individuellement par renommage. Ce n’est pas une transaction de base de données : en cas d’erreur gérée après une écriture partielle, les trois fichiers sont restaurés automatiquement. Après arrêt brutal du processus, utiliser la récupération pour revenir à l’état précédent. Si une modification externe est détectée dans un fichier partiellement importé, l’outil conserve les sauvegardes et refuse de l’écraser automatiquement.

### Récupération après arrêt brutal

Fermer tout collecteur ou importeur encore actif. Vérifier si les verrous data/.review-import.lock et collection/collection.lock sont résiduels : leur présence ne prouve pas qu’un processus a disparu. Après confirmation qu’aucune commande ne tourne, retirer uniquement ces deux fichiers de verrouillage, pas le marqueur de transaction ni les sauvegardes.

Puis :

```powershell
npm run review:recover
```

La commande restaure l’état avant import, à partir des sauvegardes indiquées par le marqueur. Elle n’annule pas un import déjà terminé ; elle traite seulement une transaction inachevée. En cas de modification externe, examiner les fichiers before-/after- des sauvegardes et résoudre la situation manuellement.

## Git et mise à jour du site distant

Un commit/push puis un pull transportent les fichiers, sans mettre à jour automatiquement le site Docker.

### Si seul le contenu change

Choisir une seule source de vérité pour les JSON. Si le contenu validé est commité dans Git, après le pull sur le serveur :

```bash
cd /srv/docker/val/curiosinfo
tar -czf "/srv/docker/val/curiosinfo-content-$(date +%Y%m%d-%H%M%S).tar.gz" \
  -C /srv/docker/val curiosinfo-content
```

Comparer les sources si des modifications ont été faites directement sur le serveur. Après confirmation que les versions du clone doivent remplacer le contenu actif :

```bash
cp -- data/actors.json /srv/docker/val/curiosinfo-content/
cp -- data/topics.json /srv/docker/val/curiosinfo-content/
cp -- data/articles.json /srv/docker/val/curiosinfo-content/
docker compose run --rm publish
```

Ne pas copier les fichiers privés collection/ vers le dossier public. Le transfert SCP documenté dans COMMANDS.md reste une alternative au transport des JSON par Git. Ces deux méthodes ne doivent pas écraser des modifications serveur non récupérées.

### Si le code ou les contrats changent

Après commit/push local, sur le serveur :

```bash
cd /srv/docker/val/curiosinfo
git status --short
git branch --show-current
git pull --ff-only
docker compose build web publish
docker compose run --rm publish
docker compose up -d web
docker compose ps
```

S’arrêter à la première erreur. Transférer aussi les nouvelles données si nécessaire, selon la procédure précédente, avant publication. En cas de changement futur de format incompatible, prévoir une migration spécifique plutôt que d’appliquer cette séquence aveuglément. Le serveur public ne nécessite pas les outils de revue ni leur boîte privée pour servir le site.


## Format des textes publics

La synthèse et l’angle de traitement visent chacun 250 à 500 caractères. La synthèse donne les faits ; l’angle attribue les propos et résume la convergence ou divergence, son axe et son intensité. Voir [EDITORIAL.md](EDITORIAL.md). Les graphiques restent calculés à partir des publications liées.
