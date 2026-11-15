# Collecte quotidienne locale

La tâche Windows **CuriosInfo - collecte quotidienne** lance la collecte à **21 h, heure locale du PC** (actuellement Europe/Paris). Le Planificateur de tâches est intégré à Windows : aucun serveur, processus résident supplémentaire ou appel à un modèle IA n’est nécessaire pour orchestrer les scripts.

## Ce qui est exécuté

1. Tous les flux RSS qualifiés, avec une nouvelle tentative ciblée des erreurs réseau temporaires (HTTP 408/429/5xx, délai dépassé, échec réseau).
2. Les sources sociales, même si la passe RSS a échoué. Une nouvelle tentative cible les acteurs et plateformes affectés par une erreur temporaire. Les blocages d’accès et les attributions ambiguës ne sont pas retentés automatiquement.
3. La fusion des nouveautés dans `collection/collecting.json`, avec les protections existantes contre les doublons et les éditions concurrentes.
4. Le nettoyage des archives thématiques clôturées et âgées de plus de trois mois calendaires.
5. Un rapport privé indiquant le résultat, les sources encore en erreur et les limites rencontrées.

La fenêtre reste celle des collecteurs : trois jours par défaut. Une absence du PC pendant plusieurs jours peut donc laisser des manques ; une relance ne recrée pas des entrées déjà sorties d’un flux. Aucune promesse de rattrapage historique ni d’exhaustivité des réseaux sociaux.

Les accès sociaux restent ceux du projet : flux YouTube et, si configurée dans `.env`, API TinyFish. La planification n’active pas un abonnement et ne supprime pas les restrictions des plateformes. Les appels fournisseur restent soumis à sa tarification ; le plafond local partagé reste de 800 tentatives de pages par jour UTC. Les nouvelles tentatives consomment ce même budget. Les appels effectués hors de ce dossier ne sont pas comptés localement.

Le tri, la vérification, les synthèses, l’import, Git et la publication ne sont pas lancés par la tâche. Ils restent dans le parcours opérateur habituel.

## Installation et fonctionnement Windows

Depuis PowerShell, dans le dépôt :

```powershell
cd F:\Projets_Perso\CuriosInfo
& .\tools\windows\install-collection-task.ps1
```

L’installateur enregistre le chemin absolu de Node et du script `tools/windows/run-collection.ps1`. Ce script se place dans le dépôt et lance directement Node avec `.env`, `tsx` et `tools/daily-collect.ts` (équivalent de `npm run collect:daily`). Aucun besoin de garder Codex, un terminal ou un navigateur ouvert.

Réglages :

- Déclenchement quotidien à 21 h selon le fuseau Windows ; le PC actuel est réglé sur Paris.
- Exécution avec l’utilisateur courant, droits ordinaires, **session ouverte nécessaire** ; écran verrouillé accepté. Aucun mot de passe enregistré.
- `StartWhenAvailable` activé : Windows peut rattraper une échéance manquée lorsque les conditions d’exécution sont réunies. Ce n’est pas un lancement garanti à la seconde où le PC redémarre.
- `WakeToRun` désactivé : le PC n’est pas réveillé pour collecter.
- Exécution sur batterie autorisée ; pas d’arrêt au passage sur batterie.
- Nouvelle instance ignorée si la tâche tourne déjà ; verrou `collection/daily.lock` supplémentaire dans l’application.
- Arrêt imposé au bout de huit heures. Un arrêt brutal peut laisser des verrous : vérifier les processus avant tout retrait manuel, puis reprendre la collecte.
- PowerShell démarre en fenêtre masquée. `ExecutionPolicy Bypass` concerne uniquement ce processus ; aucune stratégie système n’est modifiée.

Un changement de chemin du dépôt ou de Node demande de réinstaller la tâche après suppression de l’ancienne. L’installateur refuse d’écraser une tâche existante.

Les options Windows sont décrites dans la [documentation Microsoft](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasksettingsset).

## Commandes et diagnostic

```powershell
# Passe complète immédiate dans le terminal
npm run collect:daily

# État applicatif : passage récent, partiel, absent ou interrompu
npm run collect:status

# Résumé du dernier passage
Get-Content .\collection\daily-last-run.md

# Prochain horaire et dernier résultat Windows
Get-ScheduledTaskInfo -TaskName 'CuriosInfo - collecte quotidienne'

# Déclencher la tâche en arrière-plan
Start-ScheduledTask -TaskName 'CuriosInfo - collecte quotidienne'

# Suspendre puis réactiver
Disable-ScheduledTask -TaskName 'CuriosInfo - collecte quotidienne'
Enable-ScheduledTask -TaskName 'CuriosInfo - collecte quotidienne'

# Désinstaller uniquement la tâche, sans toucher aux données
Unregister-ScheduledTask -TaskName 'CuriosInfo - collecte quotidienne' -Confirm:$false
```

Les rapports détaillés sont dans `collection/daily-last-run.json` et `collection/daily-runs/`. La sortie du script Windows est dans `collection/daily-console.log` (un précédent journal est conservé au-delà de 2 Mo). Le statut `running`, sans fin et sans processus actif, aide à repérer une interruption. `collect:status` signale aussi un passage vieux de plus de 30 h. Ce diagnostic est effectué à la consultation ; aucun service de surveillance ni notification système n’est installé.

Codes de la passe quotidienne : **0** terminée sans avertissement détecté, **2** partielle, **1** échec bloquant. Une couverture partielle n’efface pas les candidats déjà collectés. Le Planificateur affiche le dernier code ; avant le premier passage, son résultat peut être `267011` (tâche jamais exécutée). `collect:status` renvoie 2 s’il n’existe pas encore de rapport, s’il est ancien, interrompu ou partiel. Même un code 0 ne prouve pas une couverture exhaustive.

## Nettoyage après trois mois

La date dans `AAAA-MM-JJ-sujet` est la création initiale du dossier de suivi, en heure de Paris. Un dossier devient ancien **après** son troisième anniversaire mensuel, avec ajustement au dernier jour du mois si nécessaire. Exemple : `2026-11-09-trappes` devient éligible le 10 février 2027.

Pour autoriser le nettoyage d’une archive dont le tri est terminé et dont les preuves ne sont plus nécessaires, l’opérateur crée dans ce dossier un `retention.json` :

```json
{"version": 1, "closed": true}
```

L’âge seul ne suffit pas. L’absence de ce marqueur protège le dossier. Un fichier `.keep`, un verrou, une boîte locale avec des candidats non traités, des décisions non approuvées, un fichier de tri non vide, une référence au dossier dans le `collecting.json` principal, un JSON illisible ou un lien symbolique/jonction bloque également la suppression. Les anciens brouillons et boîtes de test doivent donc être revus avant clôture ; ne pas les approuver artificiellement pour permettre le nettoyage.

```powershell
# Simulation seule, sans supprimer
npm run collect:cleanup

# Appliquer aux seules archives éligibles
npm run collect:cleanup -- --apply
```

La passe quotidienne applique cette règle automatiquement. Aucun dossier existant n’a été marqué clôturé ou supprimé lors de sa mise en place. Les registres `inbox.json`, `collecting.json`, les sauvegardes techniques, les rapports et les données publiques sont exclus. Les dossiers sans nom thématique daté sont ignorés. La suppression d’une archive éligible est définitive ; les sauvegardes externes restent occasionnelles, à l’initiative de l’utilisateur.


## Sauvegarde progressive et reprise ciblée

Depuis le contrôle réel du 15 novembre, le collecteur social sauvegarde ses nouveaux candidats à chaque source terminée et tous les cinq nouveaux éléments au sein d’une source. Le rapport courant indique `completed_sources`, `active_source` et `persisted_items`. Une interruption peut encore perdre les quelques éléments depuis le dernier point, mais ne remet plus toute la passe en cause. La file technique durable peut être refusionnée avec `npm run collect:prepare` si une édition simultanée a empêché l’écriture du fichier opérateur ; celle-ci est préservée.

Le rapport quotidien sauvegarde aussi chaque étape RSS/sociale terminée avant de lancer la suivante. Un statut `running` et une liste d’avertissements vide ne signifient pas que toutes les sources ont réussi. Après un arrêt brutal, vérifier la tâche et l’absence des processus avant de retirer un verrou résiduel ; aucune suppression aveugle des verrous n’a été automatisée.

Pour vérifier quelques publications originales déjà identifiées, sans relire tous les profils :

```powershell
npm run collect:social -- --posts-file CHEMIN_VERS_URLS.json --max-pages 20
```

Le fichier est un tableau JSON d’URL originales. Chaque lien doit appartenir à un compte documenté et sélectionné ; les attributions ambiguës restent bloquées. Cette commande ne prétend pas avoir visité les profils. Elle partage le même compteur journalier de 800 tentatives et peut utiliser `--max-age-days` pour un suivi historique délimité.

Le 15 novembre, la tâche s’est bien déclenchée à 21 h, puis Windows a enregistré une interruption `0xC000013A`. Sa cause n’a pas été déterminée. Les fichiers ont permis de retrouver 972 candidats RSS et 174 sociaux sauvegardés, malgré l’absence de bilan quotidien final. La vérification ciblée suivante a reconnu un doublon sans appel fournisseur. Les dossiers privés `interruption-recovery/` et `social-runs/` conservent les traces ; cette reprise ne doit pas être confondue avec une seconde exécution automatique complète.
