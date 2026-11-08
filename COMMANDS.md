# CuriosInfo — Référence des commandes

Dernière vérification : **8 novembre 2026**. Ce guide décrit les commandes réellement disponibles dans la version statique du projet. Les blocs **PowerShell / PC** s’exécutent sur Windows ; les blocs **Bash / serveur** dans la session SSH sur l’hôte Linux, pas dans un ancien conteneur.

## 1. Repères et configuration actuelle

| Élément | Valeur |
| --- | --- |
| Projet local de référence | `F:\Projets_Perso\CuriosInfo` |
| Dépôt GitHub | `https://github.com/Liotnard/CuriosInfo` |
| Branche de migration | `refactor/static-json` ; vérifier la branche active avant chaque mise à jour |
| Connexion SSH | `val@nicolas-garciaforest.net`, port `2222` |
| Clone sur le serveur | `/srv/docker/val/curiosinfo` |
| Sources éditoriales de production | `/srv/docker/val/curiosinfo-content` |
| Site public actuel | `http://nicolas-garciaforest.net:5173` |
| Projet Docker Compose | `curiosinfo-static` |
| Service permanent | `web` : Nginx |
| Service ponctuel | `publish` : validation et export des JSON |
| Node.js local | version 22.12 minimum |

Le site public n’a besoin ni de PostgreSQL, ni d’un backend Express, ni d’une clé administrateur. `npm start` est une prévisualisation locale ; la production utilise Docker/Nginx. Les anciennes copies et les dossiers `.migration-archive` ne servent pas au fonctionnement courant et ne doivent pas être ajoutés à Git.

Configuration actuelle dans le `.env` **à la racine du clone serveur** :

```dotenv
SOURCE_DATA_DIR=/srv/docker/val/curiosinfo-content
HTTP_BIND=0.0.0.0
HTTP_PORT=5173
```

Le site est actuellement en HTTP, sans chiffrement HTTPS. Le port 5173 lui est réservé par le propriétaire. Caddy/HTTPS pourra être ajouté ultérieurement par l’administrateur. Le `.env` n’est pas suivi par Git ; ne pas remplacer celui du serveur par le `.env.example` local, qui propose par défaut une écoute privée sur 8080.

## 2. Accéder aux bons dossiers

**PowerShell / PC — travailler localement :**

```powershell
cd F:\Projets_Perso\CuriosInfo
```

**PowerShell / PC — ouvrir la connexion au serveur :**

```powershell
ssh -p 2222 val@nicolas-garciaforest.net
```

**Bash / serveur — se placer dans le clone :**

```bash
cd /srv/docker/val/curiosinfo
pwd
```

Pour quitter la session SSH :

```bash
exit
```

Les commandes `docker compose` de ce guide se lancent depuis ce clone, où se trouve `compose.yaml`. Ne pas utiliser l’ancien `apps/docker-compose.dev.yml`.

## 3. Toutes les commandes npm

À exécuter à la racine du projet local, avec les dépendances installées.

| Commande | Fonction | Effet à connaître |
| --- | --- | --- |
| `npm run` | Liste les scripts disponibles | Lecture uniquement |
| `node --version` / `npm --version` | Vérifie les versions installées | Node 22.12 minimum |
| `npm ci` | Installe exactement les dépendances du lockfile | Remplace `node_modules` ; ne modifie pas le lockfile |
| `npm run dev` | Publie les données locales puis démarre Vite | Généralement `http://127.0.0.1:5173` ; adresse exacte dans la console |
| `npm run check` | Vérifie TypeScript | Ne compile pas le site |
| `npm test` | Exécute les tests automatisés | Tests locaux, sans collecte réseau ni modification des données de travail |
| `npm run publish:data` | Valide les JSON et crée une publication locale | Active une version sous `web/public/data` ; ne modifie pas le serveur distant |
| `npm run build` | Compile le site dans `dist/` | Remplace le build précédent ; ne publie pas les données à lui seul |
| `npm start` | Prévisualise le build local | Habituellement `http://127.0.0.1:4173` ; ce n’est pas le serveur de production |
| `npm run qualify:sources` | Vérifie les adresses et produit un rapport | Accès réseau ; ne modifie pas `actors.json`, mais remplace le rapport |
| `npm run qualify:sources -- --apply` | Applique la qualification aux acteurs | Modifie `data/actors.json` et conserve les anciennes adresses |

`Ctrl+C` arrête le serveur local ou la prévisualisation dans le terminal concerné. Si le port Vite est occupé, utiliser l’adresse indiquée dans la console.

### Installation ou réinstallation locale

**PowerShell / PC :**

```powershell
cd F:\Projets_Perso\CuriosInfo
node --version
npm --version
npm ci
npm run dev
```

Après un changement de dépendances récupéré depuis Git, relancer `npm ci` avant les vérifications.

### Vérification complète avant livraison

**PowerShell / PC :**

```powershell
npm run check
npm test
npm run publish:data
npm run build
npm start
```

Exécuter les commandes dans l’ordre ; ne pas poursuivre si l’une échoue. Pour une prévisualisation contenant les dernières données, publier **avant** le build. Vérifier visuellement l’accueil, un sujet, les cartes, les liens et les listes de sources.

## 4. Fichiers de données

| Fichier | Rôle |
| --- | --- |
| `data/actors.json` | Acteurs, URL, axes et résultat de qualification |
| `data/topics.json` | Sujets et synthèses éditoriales |
| `data/articles.json` | Articles et rattachement facultatif à un sujet |
| `data/mapactors.json` | Références complémentaires pour la qualification ; pas d’export public automatique |
| `data/feed-candidates.json` | Pistes techniques testées par le qualificateur ; pas une liste de flux garantis |
| `reports/source-qualification.json` | Résultats détaillés du dernier contrôle réseau |

Les JSON doivent être enregistrés en UTF-8. Les identifiants et références doivent rester cohérents. Un article sans sujet est conservé en source mais n’apparaît pas dans le détail d’un sujet.

**Important : trois états sont distincts.** Les JSON locaux sur `F:`, les fichiers suivis dans Git et les JSON du dossier externe du serveur ne se synchronisent pas automatiquement. Un `git pull` met à jour le clone, **pas** `/srv/docker/val/curiosinfo-content`. Une publication locale ne met pas à jour le site distant.

### Modifier et vérifier en local

Modifier les JSON avec l’éditeur de son choix, puis :

```powershell
npm run publish:data
```

Si `npm run dev` tourne déjà, recharger complètement la page après la publication. En cas d’échec de validation, la publication précédente reste active.

### Qualifier les adresses

**PowerShell / PC :**

```powershell
npm run qualify:sources
```

Examiner `reports/source-qualification.json`. Pour appliquer les remplacements :

```powershell
npm run qualify:sources -- --apply
git diff -- data/actors.json
npm run publish:data
```

Les adresses remplacées sont conservées dans `additional_urls`. `source_qualification.original_url` conserve la toute première référence. Les profils sociaux sont classifiés sans validation de l’existence des comptes. Les flux vides, les blocages et les périmètres ambigus sont distingués des flux avec entrées.

Cette commande **ne récolte pas les actualités**, ne crée aucun article et ne programme aucune tâche régulière. Voir `SOURCE_QUALIFICATION.md` pour la méthode et les limites.

## 5. Git : sauvegarder et transférer le code

### Examiner l’état local

**PowerShell / PC :**

```powershell
git status --short
git branch --show-current
git remote -v
git diff --stat
git diff
```

### Enregistrer une modification

Ajouter explicitement les fichiers concernés. Exemple pour une modification de contenu :

```powershell
git add -- data/actors.json
git diff --cached
git commit -m "data: mettre à jour les sources"
```

Pour une évolution de l’outil, ajouter également les fichiers de code, tests, documentation et `package-lock.json` concernés. `git diff` n’affiche pas le contenu des nouveaux fichiers non suivis : les examiner aussi. Ne pas ajouter `.env`, `.migration-archive`, `node_modules`, `dist` ou les exports générés.

### Envoyer la branche actuelle de migration

Après vérification des commits et de la branche :

```powershell
git push -u origin refactor/static-json
```

Cela publie cette branche ; cela ne la fusionne pas dans `main` et ne déploie pas le serveur. Si le projet a ensuite basculé sur une autre branche, adapter le nom explicitement.

### Récupérer le code sur le serveur

**Bash / serveur :**

```bash
cd /srv/docker/val/curiosinfo
git status --short
git branch --show-current
git pull --ff-only
```

Si aucune branche amont n’est configurée et que la branche active est bien `refactor/static-json` :

```bash
git pull --ff-only origin refactor/static-json
```

En cas de modifications locales, de divergence ou de conflit, s’arrêter et les examiner. Ne pas utiliser `git reset --hard` ou `git clean` pour forcer une mise à jour sans sauvegarde. Le serveur doit suivre la même branche que celle sur laquelle les changements ont été publiés.

## 6. Transférer les données vers la production

### Sauvegarder d’abord le contenu serveur

**Bash / serveur :**

```bash
tar -czf "/srv/docker/val/curiosinfo-content-$(date +%Y%m%d-%H%M%S).tar.gz" \
  -C /srv/docker/val curiosinfo-content
```

Cette sauvegarde contient les sources éditoriales, pas le code ni le volume des exports. La conserver également hors du serveur selon les moyens de sauvegarde disponibles.

### Envoyer les trois JSON à publier

**PowerShell / PC — dans un terminal local, pas dans la session SSH :**

```powershell
scp -P 2222 "F:\Projets_Perso\CuriosInfo\data\actors.json" "F:\Projets_Perso\CuriosInfo\data\topics.json" "F:\Projets_Perso\CuriosInfo\data\articles.json" val@nicolas-garciaforest.net:/srv/docker/val/curiosinfo-content/
```

Cela **remplace** les fichiers sources correspondants sur le serveur. Vérifier que la version locale contient bien les dernières modifications serveur avant l’envoi. Les visiteurs restent sur l’export précédent tant qu’une nouvelle publication n’est pas activée.

Pour transférer aussi les références complémentaires :

```powershell
scp -P 2222 "F:\Projets_Perso\CuriosInfo\data\mapactors.json" val@nicolas-garciaforest.net:/srv/docker/val/curiosinfo-content/
```

La publication statique n’utilise que les trois fichiers principaux ; le qualificateur utilise en plus `mapactors.json` et le fichier de pistes du dépôt.

### Publier les nouvelles données

**Bash / serveur :**

```bash
cd /srv/docker/val/curiosinfo
docker compose run --rm publish
curl -fsS http://127.0.0.1:5173/data/manifest.json
```

Attendre le bilan de réussite. Aucun rebuild ni redémarrage n’est nécessaire **si le code du publieur et le contrat public n’ont pas changé**. Après une évolution de ces outils, reconstruire les images comme indiqué plus bas avant de publier.

## 7. Docker : commandes d’exploitation

**Bash / serveur, depuis `/srv/docker/val/curiosinfo` :**

| Commande | Fonction |
| --- | --- |
| `docker compose config --quiet` | Vérifie la configuration Compose sans l’afficher |
| `docker compose ps` | État des conteneurs de ce projet |
| `docker compose ps -a` | Inclut les conteneurs arrêtés de ce projet |
| `docker compose logs --tail=100 web` | Derniers logs du site |
| `docker compose logs -f --tail=50 web` | Suit les logs ; `Ctrl+C` quitte le suivi, sans arrêter le site |
| `docker compose build web publish` | Reconstruit les images du site et de la publication |
| `docker compose run --rm publish` | Publie les données ; supprime le conteneur ponctuel après exécution, pas le volume |
| `docker compose up -d web` | Crée ou recrée le site en arrière-plan selon l’image et la configuration |
| `docker compose stop web` | Arrête le site sans supprimer conteneur ni données |
| `docker compose start web` | Relance le conteneur arrêté sans appliquer de nouvelle configuration |
| `docker compose restart web` | Redémarre le conteneur existant sans appliquer de nouvelle configuration |
| `docker compose images` | Affiche les images utilisées par le projet |
| `docker compose exec web nginx -t` | Vérifie la configuration Nginx du conteneur en fonctionnement |
| `docker compose exec web df -h /usr/share/nginx/html/data` | Vérifie l’espace disque disponible sur le stockage publié |

`restart` ne remplace pas `up -d` après changement du `.env` ou de Compose. Les valeurs `SOURCE_DATA_DIR`, `HTTP_BIND` et `HTTP_PORT` sont lues par Compose à la création des conteneurs.

Le service `publish` utilise un profil d’outils : il n’est pas destiné à rester en fonctionnement. Les commandes explicites ci-dessus le construisent ou le lancent ponctuellement.

## 8. Mettre à jour le code du site en production

Après push du code et, si nécessaire, transfert des données :

**Bash / serveur :**

```bash
cd /srv/docker/val/curiosinfo
git status --short
git branch --show-current
git pull --ff-only
docker compose config --quiet
docker compose build web publish
docker compose run --rm publish
docker compose up -d web
docker compose ps
curl -I http://127.0.0.1:5173
```

Exécuter ligne par ligne ; s’arrêter au premier échec. La reconstruction seule ne remplace pas un conteneur en fonctionnement. Une évolution incompatible du format de données peut demander une procédure de migration spécifique avant d’activer le nouveau publieur ; ne pas supposer une compatibilité automatique entre toutes les versions futures.

### Modifier uniquement le port ou l’écoute réseau

```bash
nano .env
docker compose config --quiet
docker compose up -d web
docker compose ps
```

Conserver les valeurs actuelles `0.0.0.0` et `5173` pour l’accès public existant. Modifier uniquement le `.env` local sur le PC n’affecte pas le serveur.

## 9. Consulter et tester

**Depuis un navigateur sur le PC :**

- Site public actuel : `http://nicolas-garciaforest.net:5173`.
- Développement local : adresse affichée par `npm run dev`.
- Prévisualisation compilée locale : adresse affichée par `npm start`.

**Bash / serveur :**

```bash
curl -I --max-time 15 http://127.0.0.1:5173
curl -fsS --max-time 15 http://127.0.0.1:5173/data/manifest.json
```

Le manifeste indique la version et la date de publication. Une réponse HTTP 200 pour l’accueil ne suffit pas à vérifier le contenu : contrôler aussi un sujet et ses graphiques dans le navigateur.

### Tunnel SSH facultatif

**PowerShell / PC :**

```powershell
ssh -p 2222 -L 18080:127.0.0.1:5173 val@nicolas-garciaforest.net
```

Laisser la connexion ouverte et ouvrir `http://localhost:18080`. Le tunnel vise maintenant le port serveur **5173**, et non l’ancien 8080. Le tunnel SSH est chiffré ; l’adresse publique HTTP ne l’est pas. Aucun tunnel n’est nécessaire pour l’accès public actuel.

## 10. Modifier directement les données sur le serveur

**Bash / serveur :**

```bash
cd /srv/docker/val/curiosinfo-content
nano actors.json
nano topics.json
nano articles.json
```

Dans Nano : `Ctrl+O`, puis `Entrée` pour enregistrer ; `Ctrl+X` pour quitter. Effectuer d’abord une sauvegarde, puis publier depuis le clone :

```bash
cd /srv/docker/val/curiosinfo
docker compose run --rm publish
```

Si des données sont modifiées sur le serveur, les rapatrier avant de réutiliser les copies locales :

**PowerShell / PC — ces commandes remplacent les copies locales correspondantes :**

```powershell
scp -P 2222 val@nicolas-garciaforest.net:/srv/docker/val/curiosinfo-content/actors.json "F:\Projets_Perso\CuriosInfo\data\actors.json"
scp -P 2222 val@nicolas-garciaforest.net:/srv/docker/val/curiosinfo-content/topics.json "F:\Projets_Perso\CuriosInfo\data\topics.json"
scp -P 2222 val@nicolas-garciaforest.net:/srv/docker/val/curiosinfo-content/articles.json "F:\Projets_Perso\CuriosInfo\data\articles.json"
git diff -- data
```

Ne pas mélanger des modifications locales et serveur concurrentes sans comparaison et fusion manuelles.

## 11. Sauvegardes et restauration du contenu

### Lister et examiner une sauvegarde

**Bash / serveur :**

```bash
ls -lh /srv/docker/val/curiosinfo-content-*.tar.gz
```

Choisir le fichier exact et adapter cette variable :

```bash
archive=/srv/docker/val/curiosinfo-content-AAAAMMJJ-HHMMSS.tar.gz
tar -tzf "$archive"
```

### Restaurer sans extraire directement sur les données actives

La procédure ci-dessous concerne uniquement une sauvegarde de confiance créée avec la commande de ce guide. Adapter d’abord `archive` au vrai fichier et vérifier son contenu. Elle remplace les trois fichiers éditoriaux actifs.

```bash
# Sauvegarder l’état actuel avant restauration
tar -czf "/srv/docker/val/curiosinfo-content-before-restore-$(date +%Y%m%d-%H%M%S).tar.gz" \
  -C /srv/docker/val curiosinfo-content

# Extraire dans un nouveau dossier temporaire
restore_dir=$(mktemp -d)
tar -xzf "$archive" -C "$restore_dir"
ls -lh "$restore_dir/curiosinfo-content"
```

Après examen des fichiers extraits :

```bash
cp -- "$restore_dir/curiosinfo-content/actors.json" /srv/docker/val/curiosinfo-content/
cp -- "$restore_dir/curiosinfo-content/topics.json" /srv/docker/val/curiosinfo-content/
cp -- "$restore_dir/curiosinfo-content/articles.json" /srv/docker/val/curiosinfo-content/
cd /srv/docker/val/curiosinfo
docker compose run --rm publish
```

La publication crée une nouvelle version avec le contenu restauré. Elle ne réactive pas une ancienne version par son identifiant. `mapactors.json` peut aussi être restauré séparément si nécessaire pour les références de qualification.

## 12. Dépannage rapide

| Symptôme | Vérifications / action |
| --- | --- |
| `port is already allocated` | `docker ps --format 'table {{.Names}}\t{{.Ports}}'` ; identifier le conteneur occupant 5173 avant toute action |
| L’ancien frontend occupe encore 5173 | Si c’est bien l’ancien conteneur dédié : `docker stop curiosinfo-front`, puis `docker compose up -d web` |
| Site inaccessible | `docker compose ps`, logs Nginx, puis `curl -I http://127.0.0.1:5173` sur le serveur |
| Local serveur OK, accès public KO | Vérifier adresse, exposition du port et configuration réseau avec le propriétaire ; ne pas changer le pare-feu partagé sans autorisation |
| Page chargée, données absentes | Vérifier `data/manifest.json`, le bilan de `docker compose run --rm publish` et `SOURCE_DATA_DIR` dans le `.env` |
| Données anciennes | Vérifier que les bons fichiers ont été envoyés au dossier externe, republier puis recharger complètement la page |
| Publication refusée | Lire l’erreur de validation ; corriger la source ; la publication précédente reste active |
| Qualification en échec | Examiner `reports/source-qualification.json` ; un blocage ou délai réseau ne signifie pas une fermeture définitive du site |
| `git pull --ff-only` refusé | Examiner `git status` et la branche ; ne pas forcer avec reset/clean |
| `npm ci` échoue | Vérifier Node, accès au registre et cohérence du lockfile ; ne pas supprimer le lockfile pour contourner l’erreur |
| Modification du `.env` sans effet | Utiliser `docker compose up -d web`, pas seulement `restart` |
| Mise à jour des sources sans nouveaux articles | Normal à ce stade : lancer séparément `npm run collect:news` ; la qualification et la publication ne collectent pas elles-mêmes les actualités |

Le Caddy de l’hôte est administré par le propriétaire du serveur. Un changement de DNS, de certificat ou de routage HTTPS nécessite son intervention.

## 13. Commandes à éviter en exploitation courante

- `docker compose down -v` : supprime les volumes de ce projet, dont celui des publications.
- `docker system prune --volumes` et les nettoyages Docker globaux : peuvent affecter les autres applications du serveur partagé.
- Les arrêts globaux de conteneurs : toujours cibler le service ou le conteneur identifié.
- `git reset --hard`, `git clean -fd` ou une suppression récursive du dossier : risque de perte des changements non sauvegardés.
- L’ajout à Git du `.env`, des sauvegardes privées ou de `.migration-archive`.

Les anciennes publications sont conservées pour les pages déjà ouvertes. La collecte manuelle est décrite en section 15 ; aucune commande de purge automatique ni collecte planifiée n’est actuellement fournie. Le ménage des versions demandera une procédure spécifique conservant au minimum la version active.

## 14. Cycle quotidien minimal

**PowerShell / PC — après édition locale :**

```powershell
cd F:\Projets_Perso\CuriosInfo
npm run publish:data
```

Sauvegarder le contenu serveur, puis envoyer les JSON validés avec la commande SCP de la section 6.

**Bash / serveur :**

```bash
cd /srv/docker/val/curiosinfo
docker compose run --rm publish
```

Recharger le site public. Si le code ou le contrat a changé, suivre d’abord la mise à jour complète de la section 8.


## 15. Collecte et préparation des lots de revue

Ces commandes s’exécutent localement depuis F:\Projets_Perso\CuriosInfo. Voir COLLECTION.md pour le format des fichiers et les limites.

| Commande | Fonction |
| --- | --- |
| `npm run collect:news -- --dry-run` | Teste les dix sources du pilote sans modifier la boîte de réception |
| `npm run collect:news` | Collecte les métadonnées récentes et dédupliquées dans `collection/inbox.json` |
| `npm run collect:news -- --actors 1,2,3` | Sélectionne des sources qualifiées par leur identifiant |
| `npm run collect:news -- --all` | Étend la collecte à tous les flux qualifiés, en conservant les plafonds configurés |
| `npm run review:prepare` | Prépare jusqu’à 30 candidats pending et le contexte des sujets existants |
| `npm run review:prepare -- --limit 50` | Prépare un lot de 50 candidats maximum |

La configuration est dans `data/collection-config.json`. La boîte privée `collection/` est ignorée par Git et doit être sauvegardée séparément. Ces commandes ne créent ni sujet public ni article public et ne publient rien. Aucun appel IA ni tâche planifiée n’est lancé. `review:prepare` remplace le lot de revue précédent sans modifier la boîte d’origine. Le contexte de revue comprend des extraits non fiables à considérer comme des données, jamais comme des instructions.


## 16. Décisions de revue et import

Voir REVIEW.md pour le format des décisions et les procédures de récupération. Les commandes s’exécutent localement ; aucune n’effectue un push ou une publication distante.

| Commande | Fonction |
| --- | --- |
| `npm run review:plan` | Crée des décisions non approuvées depuis `collection/topic-proposals.json` ; refuse d’écraser un fichier existant |
| `npm run review:plan -- --file collection/autre-lot.json` | Crée un autre fichier de décisions |
| `npm run review:apply -- --dry-run` | Valide et simule les seules décisions approuvées |
| `npm run review:apply` | Applique les décisions approuvées avec sauvegardes et contrôle des références |
| `npm run review:apply -- --file collection/autre-lot.json --dry-run` | Simule un fichier explicite |
| `npm run review:recover` | Restaure l’état précédent d’un import inachevé, après vérification des processus/verrous |

L’import exige reviewer, approved=true, et pour accepter des articles sources_verified=true. Un nouveau sujet exige une synthèse et deux sources distinctes. Une décision de rejet exige un motif. Les trois décisions du pilote sont présentes mais non approuvées. Aucune importation n’est automatique.

Après import : examiner `git diff -- data`, puis publier et tester localement. Pour actualiser le site distant, un push/pull ne suffit pas : les JSON doivent rejoindre le dossier externe puis être publiés ; le code modifié demande une reconstruction des images et `docker compose up -d web`. Voir la section 8 et REVIEW.md.
