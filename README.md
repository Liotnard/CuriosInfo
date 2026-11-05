# CuriosInfo

Site statique de comparaison des couvertures médiatiques : React + JSON, servi par Nginx. Node.js 22.12 minimum pour les outils locaux.

```sh
npm ci
npm run dev
```

Modifier `data/actors.json`, `data/topics.json` et `data/articles.json`, puis lancer `npm run publish:data` et recharger le navigateur. `data/mapactors.json` est conservé comme ressource d’enrichissement ; il n’est pas publié automatiquement.

```sh
npm run check
npm test
npm run publish:data
npm run build
npm start
```

La publication valide les données, retire les champs hors contrat et active un ensemble complet de fichiers. Une erreur conserve la publication précédente. Les anciens exports restent disponibles pour les pages déjà ouvertes.

Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour Docker et le tunnel SSH. Le site public ne nécessite ni backend Express, ni PostgreSQL, ni administration. Ne jamais publier de secrets dans les données. Les articles de démonstration et le sujet « To delete afterward » sont conservés pour examen éditorial.

## Organisation

- `web/` : interface React, styles et ressources publiques.
- `shared/` : contrats Zod utilisés par le navigateur et la publication.
- `tools/` : validation, normalisation et publication JSON.
- `data/` : sources éditoriales.
- `tests/` : tests de publication.
- `deploy/`, `Dockerfile`, `compose.yaml` : déploiement statique.

En production, utiliser un dossier de contenu externe au clone Git et le monter dans le conteneur ponctuel de publication. Le conteneur Nginx voit uniquement les exports publics en lecture seule. La configuration Git est un dépôt unique, sans sous-module.
