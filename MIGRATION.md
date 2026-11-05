# Migration vers le dépôt statique unique

Branche locale : refactor/static-json. Les historiques main et server-insertion du dépôt GitHub sont réunis avant application de la structure statique. Les anciens dossiers apps/ et le gitlink de l’ancienne copie F ne font plus partie du projet actif.

Les quatre fichiers data/*.json proviennent de D, sans modification. Ils contiennent 149 acteurs, 4 sujets et 112 articles ; mapactors.json est conservé pour enrichissement. Le sujet « To delete afterward » et ses articles sont conservés : à examiner avant publication publique.

Le code actif utilise des contrats Zod partagés. Les commandes s’exécutent toutes à la racine : npm ci, npm run dev, npm run check, npm test, npm run publish:data, npm run build et npm start. Le Dockerfile construit le site et un outil de publication ponctuel ; Nginx sert les fichiers publics. Ni base PostgreSQL ni clé administrateur ne sont nécessaires.

Avant transfert à GitHub, examiner le diff de branche. La migration ne modifie pas la copie D, ne renomme pas D et ne pousse aucune branche. L’ancien contenu de F sera conservé localement dans .migration-archive, ignoré par Git, et dans une sauvegarde de travail. Ne pas ajouter ce dossier à Git : il contient les anciennes configurations privées et dépôts.

Le déploiement Linux reste à valider sur le serveur. Conserver l’ancien conteneur et le volume PostgreSQL jusqu’à validation du nouveau site. Voir DEPLOYMENT.md pour une installation parallèle et un test par tunnel SSH.
