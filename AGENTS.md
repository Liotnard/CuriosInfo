# Consignes propres à CuriosInfo

Pour créer ou réviser les textes d’un sujet, suivre [EDITORIAL.md](EDITORIAL.md).

- Synthèse : faits essentiels, cible de 250 à 500 caractères.
- Angle de traitement : qui dit quoi, convergence/divergence, axe et intensité du clivage ; cible de 250 à 500 caractères.
- Appuyer les comparaisons sur les publications documentées ; ne pas inventer d’opposition ni de prises de parole.
- Les cartes et graphiques restent indexés sur les publications et acteurs liés ; ne pas réduire ce corpus pour raccourcir les textes.
- Conserver les développements méthodologiques dans les dossiers de revue, hors des deux textes publics courts.

## Collecte et tri

Utiliser [COLLECTING.md](COLLECTING.md) et `collection/collecting.json` comme fichier opérateur unique. Préparer avec `npm run collect:prepare` si nécessaire. Y éditer les décisions et les textes, puis simuler l’import avant de l’appliquer dans le périmètre autorisé par la session. Ne pas supprimer des candidats pour les rejeter : enregistrer des décisions explicites. Conserver l’historique interne et les sauvegardes privées.

## Rangement des dossiers de collecte

Nommer tout dossier thématique de `collection/` avec `AAAA-MM-JJ-sujet`, selon la date de création initiale du dossier de ce sujet en heure de Paris, et non la date de l’événement. Utiliser des mois et jours à deux chiffres ; conserver la date lors des mises à jour. Regrouper les preuves et tests du même sujet dans ce dossier. Conserver les chemins stables des dossiers techniques de registre, rapports et récupération. Le fichier opérateur reste `collection/collecting.json` ; ne pas pousser le contenu privé de `collection/` sur GitHub.

Les archives thématiques datées peuvent être nettoyées après trois mois calendaires depuis leur date de création, après vérification des travaux et preuves encore nécessaires. Ne pas appliquer cette règle au fichier opérateur, au registre de déduplication, aux données publiques ou aux sauvegardes techniques. Voir COLLECTING.md.

## Collecte quotidienne locale

Voir DAILY_COLLECTION.md. La tâche Windows lance collect:daily à 21 h sans IA, import, Git ou publication. Les rapports privés indiquent les limites et erreurs restantes. Pour nettoyer une archive, exiger plus de trois mois, une clôture explicite dans retention.json et aucun travail en attente ; ne jamais contourner les protections en approuvant des brouillons artificiellement. La planification reste sur ce PC, pas sur le serveur.
