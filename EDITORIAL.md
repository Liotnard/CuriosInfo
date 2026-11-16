# Format éditorial des sujets

Chaque fiche présente deux textes courts, chacun visant 250 à 500 caractères, espaces et ponctuation compris. Le titre est compté séparément. La cible est éditoriale : ne pas remplir artificiellement un texte ni tronquer une nuance essentielle pour satisfaire un compteur.

## Synthèse

Répondre à « de quoi parle-t-on ? » : faits essentiels, acteurs, lieu/date si utiles, état de l’événement. Distinguer un fait établi, une déclaration attribuée et une hypothèse d’enquête. Éviter les avis, l’analyse du traitement et les détails secondaires.

## Angle de traitement

Répondre à « qu’est-ce qui se dit, par qui, et où se situe le clivage ? » : nommer les groupes ou les acteurs réellement documentés, préciser les convergences/divergences, l’axe du désaccord et son intensité. Utiliser faible, modéré ou marqué/fort seulement si le corpus le permet ; sinon indiquer que le clivage n’est pas établi. Distinguer un désaccord entre acteurs d’une simple différence de cadrage ou de format entre médias. Ne pas créer une opposition gauche/droite, ni déduire une position du seul classement politique d’un acteur.

Éviter les inventaires de liens, décomptes de publications, répétitions de la synthèse et longs développements méthodologiques. Conserver les preuves et limites détaillées dans le dossier de revue. Une réserve indispensable peut rester en une formule courte dans le texte public. Ne pas extrapoler aux médias absents du corpus.

## Graphiques et publications

La cartographie et les sources documentées par type dérivent des publications liées au sujet et de leurs acteurs, sans comptage à partir du texte éditorial. Les cartes de publications restent aussi complètes que possible. Le raccourcissement des textes n’entraîne aucune suppression de lien ni modification des axes politiques des acteurs.

## Patrimoine et rédaction future

Les cinq dossiers sourcés présents au 11 novembre 2026 ont été harmonisés dans cette fourchette. Les anciennes fiches retraites/municipales sont des données de démonstration avec des liens example.com ; leurs textes ne sont pas étoffés avec des faits ou des opinions inventés. La règle s’applique aux nouvelles rédactions et révisions de dossiers sourcés.


## Périmètre et classement

Publier uniquement des sujets de société à portée politique : politiques publiques, institutions, droits, rapports sociaux, économie, environnement, justice, médias ou relations internationales. Une convergence d’avis est recevable ; ne pas inventer un clivage. Un résultat sportif, une prouesse technique ou un bulletin météo ne suffisent pas sans dimension politique documentée.

Chaque sujet porte une `category` : `politique`, `social`, `economie`, `international`, `environnement`, `justice`, `medias` ou `societe`. Choisir le thème dominant ; conserver les autres dimensions dans les textes. `editorialStatus` vaut `published` ou `archived`. Une archive reste dans les JSON sources, mais ne figure ni dans l’index ni dans les fiches de la publication active. Pour la réactiver, documenter sa pertinence et passer explicitement à `published`. Les anciennes données de démonstration non sourcées restent archivées.

`startAt` désigne le début du sujet (date de l’événement connue, sinon première publication liée). `created_at` sert de secours si cette date manque ; une simple révision ne rajeunit pas le dossier. La Une choisit, indépendamment des filtres de liste, le sujet publié de moins de sept jours ayant le plus de publications liées ; égalité départagée par la date de début puis l’identifiant. En l’absence de candidat, elle n’est pas affichée. Le compteur `articleCount` est calculé par la publication, jamais saisi manuellement.
