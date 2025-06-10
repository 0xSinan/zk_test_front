Contexte :
Je veux générer un projet dApp complet, sécurisé et prêt pour la production pour “TradePrivate”.
Le projet doit utiliser Svelte (Vite), une architecture modulaire, un SDK privé avec gestion de comptes et d’ordres, intégrant du chiffrement, du ZK, et toutes les best practices de sécurité, structure de fichiers, scripts de setup, tests, CI/CD et documentation.

Attendus :
Structure complète du projet (dossiers/fichiers prêts à l’emploi)

Contenus de tous les fichiers essentiels (pas de placeholders vides), y compris :

Fichiers de configuration (package.json, vite.config.js, tsconfig.json, .env.example, .gitignore, .prettierrc, .eslintrc.json, README.md)

Code source (librairies, crypto, SDK, composants UI, routes)

Scripts utilitaires (scripts/)

Mock circuits/fichiers publics (public/)

Tests (tests/)

Dockerfile & config CI (GitHub Actions)

Monitoring/metrics (README ou fichiers si possible)

Explications/commentaires concis dans le code si nécessaire

Instructions pour l’installation, configuration, démarrage et déploiement (dans le README)

Best practices : Sécurité, validation, modularité, prod ready

Spécifications détaillées à respecter :
1. Structure de projet attendue
arduino
Copier
tradeprivate-dapp/
├── node_modules/
├── public/
│   ├── circuits/
│   │   ├── account_creation.wasm
│   │   ├── account_creation_pk.bin
│   │   └── ...
│   ├── favicon.png
│   └── manifest.json
├── scripts/
│   ├── setup-dev.js
│   ├── generate-mock-proofs.js
│   └── check-deployment.js
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Toast.svelte
│   │   │   ├── Modal.svelte
│   │   │   ├── AccountStatus.svelte
│   │   │   └── OrderForm.svelte
│   │   ├── config/
│   │   │   ├── constants.js
│   │   │   └── zkConfig.js
│   │   ├── contracts/
│   │   │   ├── abis/
│   │   │   │   ├── TradePrivate.json
│   │   │   │   └── ZKVerifierManager.json
│   │   │   └── index.js
│   │   ├── crypto/
│   │   │   ├── index.js
│   │   │   ├── fieldElement.js
│   │   │   ├── privateKeyManager.js
│   │   │   ├── commitmentGenerator.js
│   │   │   ├── nullifierGenerator.js
│   │   │   └── orderEncryption.js
│   │   ├── stores/
│   │   │   └── index.js
│   │   ├── tradeprivate/
│   │   │   ├── index.js
│   │   │   ├── accountManager.js
│   │   │   ├── orderManager.js
│   │   │   └── secure.js
│   │   └── utils/
│   │       ├── errors.js
│   │       ├── validation.js
│   │       └── monitoring.js
│   ├── routes/
│   │   └── +page.svelte
│   ├── app.html
│   ├── app.css
│   ├── App.svelte
│   └── main.js
├── tests/
│   ├── unit/
│   └── e2e/
├── .env.example
├── .env
├── .gitignore
├── .prettierrc
├── .eslintrc.json
├── package.json
├── vite.config.js
├── tsconfig.json
├── README.md
├── Dockerfile
├── .github/
│   └── workflows/
│       └── ci.yml
└── ...
2. Fonctions principales à couvrir
Création/gestion de comptes privés (commit-reveal)

Soumission d’ordres privés (ZK proofs)

Dépôts/retraits

SDK sécurisé (gestion sessions, circuit breaker, ECDH, HKDF, ZK, input validation)

UI responsive (Svelte, composants propres)

Monitoring/metrics (prometheus/grafana/datadog ready)

Tests unitaires et e2e (exemples inclus)

CI/CD (exemple workflow GitHub Actions)

Docker ready

3. Sécurité & production ready
HKDF pour dérivation des clés, ECDH secp256k1 pour chiffrement

Validation d’inputs partout (front, back, lib)

Pas de stockage de clés privées en clair

Scripts de mock/dev inclus

Variables d’env centralisées (.env, .env.example)

4. Instructions README complètes
Comment installer, configurer, lancer en dev, build prod, déployer

Exemples d’utilisation SDK/API

Notes sur sécurité, monitoring, bonnes pratiques

5. Ce qui doit être généré
Pour chaque fichier/dossier de la structure ci-dessus, génère :

Le contenu complet et propre, adapté à une utilisation réelle, sans TODOs laissés

Pour les mocks : contenu minimal mais cohérent

Les configs, scripts, tests, abis, routes, pages, composants, etc.