1. Résumé des rôles des dossiers principaux
   /hydra-bot

Rôle : Toutes les opérations de trading (Python : engines, exécution, signaux, gestion du risque, analytics).
Accès : Via API backend et bot Telegram (/hydra-bot/telegram_bot).
Sous-dossiers : trading_engine/, ai_signal_engine/, telegram_bot/, config/, utils/, etc.
/backend

Rôle : Toutes les autres fonctionnalités (API REST, config, middlewares, routes, services, utils, sécurité, gestion utilisateurs, WebSocket, Prisma/PostgreSQL).
Sous-dossiers : src/routes/, src/services/, src/middleware/, src/utils/, prisma/, etc.
/src

Rôle : Surtout pour le frontend (Next.js), mais peut contenir des hooks, composants, helpers partagés.

2. Recherche de fichiers/dossiers dupliqués ou redondants
   a. Services Telegram
   Présence :
   /hydra-bot/telegram_bot/ (Python)
   /backend/src/services/telegram.ts (Node/TypeScript)
   Constat : Deux implémentations séparées pour la logique Telegram (une pour le trading, une pour l’orchestration/notifications).
   Recommandation :
   Centraliser la logique métier Telegram côté backend (Node) et n’utiliser le Python que pour les signaux/commandes trading.
   Exposer une API claire entre backend et hydra-bot pour les interactions Telegram.
   b. Fichiers de configuration
   Présence :
   .env, .env.example, .env.production à la racine, dans /backend/, dans /hydra-bot/
   config/ dans plusieurs modules
   Constat : Risque de divergence des variables d’environnement et des configs.
   Recommandation :
   Unifier la configuration dans un seul .env.production à la racine, chargé par tous les services via Docker Compose.
   Centraliser les fichiers de config partagés dans un dossier commun (/config à la racine).
   c. Utilitaires et helpers

Présence :
/backend/src/utils/
/hydra-bot/utils/
/src/utils/
Constat : Possibles duplications de fonctions utilitaires (logger, formatage, validation, etc.).
Recommandation :
Extraire les helpers communs dans un package interne ou un dossier partagé (/shared/utils).
d. Docker & Compose
Présence :
docker-compose.yml à la racine, dans /hydra-bot/, dans /backend/
Constat : Risque de divergence des définitions de services, ports, variables.
Recommandation :
Unifier la stack dans un seul docker-compose.prod.yml à la racine ou dans deployment.
Utiliser des fichiers d’override pour dev/prod.
e. Scripts de démarrage/build
Présence :
package.json à la racine, dans /backend/, dans /hydra-bot/backend/
Constat : Scripts similaires ou dupliqués pour build, start, test.
Recommandation :
Centraliser les scripts principaux dans le package.json racine.
Utiliser des scripts internes pour chaque module si besoin, mais éviter la redondance.

3. Autres points de vigilance
   Documentation : Plusieurs README.md (racine, backend, hydra-bot).
   → Garder un README principal à la racine, et des liens vers les sous-modules.
   Tests :
   Tester que les scripts de test ne sont pas dupliqués et couvrent bien tous les modules.
   Dossiers backup :
   /hydra-bot-backup/ → À archiver ou supprimer si la migration est terminée.
4. Plan de restructuration recommandé
   Centraliser la configuration

Un seul .env.production à la racine.
Un dossier /config partagé pour les configs statiques.
Unifier les utilitaires

Créer /shared/utils pour les helpers communs (logger, validation, etc.).
Réduire la duplication Telegram

Garder la logique Telegram métier côté backend.
Utiliser le Python uniquement pour les signaux trading.
Unifier Docker Compose

Un seul fichier principal pour la prod, avec tous les services (frontend, backend, hydra-bot, telegram, db, redis…).
Nettoyer les scripts

Scripts principaux dans le package.json racine.
Scripts spécifiques dans chaque module uniquement si nécessaire.
Archiver ou supprimer les dossiers obsolètes

/hydra-bot-backup/ si la migration est terminée.

5. Résumé visuel de la structure cible
6. Conclusion
   Fichiers dupliqués détectés : Telegram, config, utils, scripts Docker.
   Actions prioritaires : Centralisation, suppression des doublons, documentation claire.
   Bénéfices : Maintenance facilitée, moins d’erreurs, déploiement plus fiable, onboarding accéléré.
