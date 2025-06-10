// ===== STRUCTURE DU PROJET =====
/*
tradeprivate-dapp/
├── public/
│   ├── circuits/          # Circuits ZK compilés
│   └── favicon.png
├── src/
│   ├── lib/
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
│   │   ├── tradeprivate/
│   │   │   ├── index.js
│   │   │   ├── accountManager.js
│   │   │   ├── orderManager.js
│   │   │   └── secure.js
│   │   ├── stores/
│   │   │   └── index.js
│   │   ├── utils/
│   │   │   ├── errors.js
│   │   │   ├── monitoring.js
│   │   │   └── validation.js
│   │   └── components/
│   │       ├── AccountStatus.svelte
│   │       ├── OrderForm.svelte
│   │       ├── Toast.svelte
│   │       └── Modal.svelte
│   ├── routes/
│   │   └── +page.svelte
│   ├── app.html
│   ├── app.css
│   └── main.js
├── tests/
│   ├── unit/
│   └── e2e/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.js
└── README.md
*/

// ===== vite.config.js =====
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import compression from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    sveltekit(),
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
    visualizer({
      emitFile: true,
      filename: 'stats.html'
    })
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['ethers'],
          'crypto': ['@noble/hashes', '@noble/ciphers', '@noble/curves']
        }
      }
    }
  },
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
});

// ===== tsconfig.json =====
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "paths": {
      "$lib": ["./src/lib"],
      "$lib/*": ["./src/lib/*"]
    }
  },
  "include": ["src/**/*.d.ts", "src/**/*.ts", "src/**/*.js", "src/**/*.svelte"],
  "exclude": ["node_modules", "public", "dist"]
}

// ===== .env.example =====
# Network Configuration
VITE_CHAIN_ID=1
VITE_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_BACKUP_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY

# Contract Addresses
VITE_TRADE_PRIVATE_ADDRESS=0x0000000000000000000000000000000000000000
VITE_ZK_VERIFIER_MANAGER_ADDRESS=0x0000000000000000000000000000000000000000
VITE_USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48

# Circuit URLs
VITE_CIRCUIT_BASE_URL=http://localhost:3000/circuits

# Analytics (Optional)
VITE_ANALYTICS_KEY=

// ===== .gitignore =====
# Dependencies
node_modules/
.pnp
.pnp.js

# Build
dist/
build/
.svelte-kit/
.vercel/
stats.html

# Env files
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Test coverage
coverage/
.nyc_output/

# Misc
*.pem
.cache/

// ===== src/app.html =====
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="TradePrivate - Anonymous Trading with Zero-Knowledge Proofs" />
    <meta name="theme-color" content="#000000" />
    
    <!-- Security Headers -->
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />
    <meta http-equiv="X-Frame-Options" content="DENY" />
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
    
    <!-- PWA -->
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" href="/favicon.png" />
    
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>

// ===== src/app.css =====
:root {
  /* Colors */
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --color-secondary: #10b981;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  --color-success: #10b981;
  
  /* Dark theme */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Utility classes */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-primary-dark);
}

.btn-secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background-color: var(--bg-secondary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card {
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-tertiary);
  border: 1px solid var(--bg-tertiary);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 500;
  color: var(--text-secondary);
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* Loading spinner */
.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--bg-tertiary);
  border-radius: 50%;
  border-top-color: var(--color-primary);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// ===== src/main.js =====
import './app.css';
import App from './App.svelte';

const app = new App({
  target: document.getElementById('app'),
});

export default app;