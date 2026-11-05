# Site statique : fichiers et publication

Le site public est une application React compilée servie par Nginx. Il charge uniquement des JSON statiques. Il n’utilise ni Express, ni PostgreSQL, ni interface d’administration. Les anciens outils Express/PostgreSQL restent disponibles dans l’historique et les sauvegardes, mais sont retirés du dépôt statique.

## Travailler en local

Depuis la racine du dépôt, avec Node 22.12 minimum :

```sh
npm ci
npm run dev
```

Le serveur Vite indique son adresse (habituellement http://127.0.0.1:5173). `dev` publie d’abord les données. Après modification des fichiers de `data`, exécuter `npm run publish:data`, puis recharger le navigateur. Les fichiers générés sont ignorés par Git. `npm run build` compile le site ; `npm start` le prévisualise localement. Les données doivent être publiées avant le build pour être incluses dans cette prévisualisation.

## Installer sur le serveur Linux

Ces commandes se lancent à la racine du clone contenant le nouveau `compose.yaml`, et non dans l’ancien dossier `apps`. Vérifier que la refonte et les nouveaux fichiers ont été commités et poussés dans le dépôt, puis récupérés sur le serveur. La migration est préparée dans une branche locale ; aucun push ou accès distant au serveur n’est effectué automatiquement.

Préparer les données hors du clone pour éviter qu’un git pull ou une reconstruction ne remplace les modifications éditoriales. Exemple à adapter :

```sh
mkdir -p /srv/docker/val/curiosinfo/content
cp -n "data/actors.json" /srv/docker/val/curiosinfo/content/
cp -n "data/topics.json" /srv/docker/val/curiosinfo/content/
cp -n "data/articles.json" /srv/docker/val/curiosinfo/content/
```

Créer un `.env` à la racine du dépôt, destiné à Docker Compose :

```dotenv
SOURCE_DATA_DIR=/srv/docker/val/curiosinfo/content
HTTP_BIND=127.0.0.1
HTTP_PORT=8080
```

Aucune clé administrateur n’est nécessaire dans cette version statique. Le port SSH 5000 n’est pas un port HTTP. Choisir un HTTP_PORT libre.

```sh
docker compose build web publish
docker compose run --rm publish
docker compose up -d web
docker compose logs --tail=50 web
```

Le serveur écoute par défaut uniquement sur localhost. Depuis PowerShell, un tunnel permet de le tester (remplacer les identifiants) :

```powershell
ssh -p 5000 -L 8080:127.0.0.1:8080 session@hebergeur.net
```

Puis ouvrir http://localhost:8080. Pour un accès public, raccorder le service au reverse proxy HTTPS du serveur. Si ce proxy est lui-même dans Docker, il doit partager un réseau avec `web`, ou disposer d’un accès adapté au port de l’hôte ; son localhost n’est pas celui du serveur. L’adresse publique et le proxy restent à configurer selon l’hébergement réel. `HTTP_BIND=0.0.0.0` exposerait directement le port sur les interfaces du serveur : ce n’est pas nécessaire pour un tunnel SSH.

Ne pas supprimer l’ancien volume PostgreSQL ni utiliser `docker compose down -v` pour migrer. Le nouveau projet Compose s’appelle `curiosinfo-static` et utilise un volume distinct. Les éventuelles données présentes uniquement dans l’ancienne base PostgreSQL nécessitent un export séparé avant abandon de l’ancien système.

## Mettre à jour le contenu

Modifier `actors.json`, `topics.json` et `articles.json` dans SOURCE_DATA_DIR, puis, depuis la racine du clone :

```sh
docker compose run --rm publish
```

Aucun rebuild du site ni redémarrage de Nginx n’est nécessaire. L’image de publication doit avoir été construite lors de l’installation. Pour mettre à jour le code :

```sh
git pull --ff-only
docker compose build web publish
docker compose up -d web
```

Republier les données après une évolution du format d’export. Sauvegarder le dossier source externe et, si nécessaire, le volume publié avec les outils de sauvegarde du serveur.

## Contrôles effectués par la publication

La publication valide les champs, dates, URL HTTP(S), axes entre -10 et 10, identifiants et slugs uniques, ainsi que les références entre articles, acteurs et sujets. Elle accepte les anciennes variantes snake_case/camelCase et retire les champs inconnus de l’export public. Un article sans sujet reste dans les sources mais n’est pas publié dans un détail de sujet.

Une nouvelle publication écrit une version complète sous `releases/<version>`, puis remplace atomiquement `manifest.json`. Le navigateur conserve la même version pour sa session de page, ce qui évite de mélanger les versions. Un rechargement complet récupère la nouvelle publication. Le manifeste n’est pas mis en cache ; les versions et les ressources à nom versionné peuvent l’être longtemps. Les anciennes versions sont conservées pour les pages déjà ouvertes : elles consomment de l’espace et devront être archivées ou purgées avec une politique adaptée, sans supprimer la version active.

Les JSON publiés sont publics, y compris les anciennes versions. Ne jamais placer de secret dans les champs publiés. Les fichiers source complets sont montés uniquement dans le conteneur ponctuel de publication ; le serveur web ne voit que le volume d’export, en lecture seule.

## Vérifications

`npm run check`, `npm test`, `npm run publish:data`, `npm run build`. Les tests de publication vérifient notamment qu’un échec conserve le manifeste actif et que deux versions restent cohérentes. Une validation Docker réelle nécessite un moteur Docker disponible ; ne pas confondre compilation locale et validation du conteneur Linux.
