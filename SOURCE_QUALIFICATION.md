# Qualification des sources

La qualification enrichit actors.json sans créer d’articles, de sujets ou de tâche planifiée. Le site public reste statique. Aucun appel à un modèle d’IA n’est effectué par cet outil.

```sh
npm run qualify:sources
npm run qualify:sources -- --apply
```

La première commande écrit un rapport dans reports/source-qualification.json sans changer actors.json. La seconde applique également les changements dans actors.json. Les fichiers doivent être au format UTF-8. JSON_DB_DIR permet de sélectionner le dossier source, qui doit contenir actors.json et mapactors.json ; QUALIFICATION_REPORT_DIR permet de changer le dossier de rapport. La commande est conçue pour être exécutée localement ; le service Docker publish monte volontairement les sources en lecture seule.

## Préservation

Lorsqu’un flux remplace feed_url, l’ancienne valeur est ajoutée à additional_urls, sans suppression des références déjà présentes. source_qualification.original_url conserve la première adresse avant qualification, même lors des relances. website_url désigne une page HTML qui a répondu lors du contrôle. Les champs additional_urls et website_url sont conservés dans les exports publics ; les détails de contrôle source_qualification restent uniquement dans les fichiers de travail.

Les identifiants, axes, noms, catégories, articles et sujets ne sont pas modifiés. mapactors.json reste intact. Les anciennes valeurs fictives example.com sont conservées comme demandé, mais ne sont pas interrogées comme sources d’actualités.

## Statuts

- feed_verified : XML RSS ou Atom reconnu, contenant au moins une entrée au moment du contrôle.
- feed_empty : flux XML valide, mais aucune entrée ; ne pas l’inclure dans la première collecte automatisée.
- website_only : une page web répond, aucun flux validé trouvé parmi les candidats testés. Cela ne prouve pas l’absence de flux sur ce site.
- access_restricted : blocage HTTP, limitation ou page anti-robot détectée. Aucun contournement n’est effectué.
- unreachable : les contrôles n’ont obtenu ni page HTML exploitable ni flux ; le rapport détaille les erreurs, codes HTTP ou limites de taille. Ce n’est pas une preuve de fermeture définitive.
- platform_requires_connector : profil social ou plateforme nécessitant une collecte spécifique. Classification de l’URL uniquement, sans vérification de l’existence du compte.
- scope_review_required : référence institutionnelle ou plateforme multi-auteurs ; son flux global ne doit pas être attribué automatiquement à une personne.
- placeholder/manual_review : référence fictive ou cas restant à examiner.

## Méthode et limites

L’outil utilise la référence existante et la première référence de mapactors, découvre les déclarations HTML alternate RSS/Atom, puis teste un nombre limité de chemins candidats sur le même hôte. data/feed-candidates.json contient des pistes, pas des flux garantis : seule une réponse HTTP réussie avec XML reconnu permet la sélection. Les redirections vers un autre hôte ne sont pas sélectionnées automatiquement. Les réponses sont limitées à 2 Mo et 8 secondes. Six acteurs au maximum sont traités simultanément ; les probes identiques sont mutualisées.

Le rapport contient les adresses demandées/finales, codes HTTP, types de contenu, titres de flux et nombres d’entrées, sans copier les articles complets. Une URL qui échoue peut fonctionner depuis le serveur Linux. La vérification ne garantit ni fraîcheur des articles, ni stabilité future, ni droits de réutilisation, ni identité d’un profil social. Les titres des flux ont été examinés pour repérer les incohérences évidentes ; les sources à périmètre ambigu restent en revue.

Une relance peut changer les statuts en fonction de la disponibilité du réseau. L’outil refuse d’écraser actors.json si son contenu change pendant le contrôle. La future collecte doit utiliser uniquement les acteurs source_qualification.status === feed_verified, puis valider à nouveau les articles reçus.

## Mise à jour du site distant

Après revue du diff et transfert des JSON vers le dossier de contenu externe du serveur, utiliser docker compose run --rm publish. Le code de l’outil et le nouveau contrat nécessitent aussi une mise à jour Git et une reconstruction des images pour exporter les adresses additionnelles. Aucun push, transfert SSH ou publication distante n’est effectué automatiquement par la qualification.
