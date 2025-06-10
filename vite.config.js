import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  
  server: {
    port: 3000,
    host: true,
    fs: {
      allow: ['..']
    }
  },
  
  preview: {
    port: 3001,
    host: true
  },
  
  build: {
    target: 'esnext',
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          crypto: ['@noble/secp256k1', '@noble/hashes', 'crypto-js'],
          web3: ['ethers', 'viem', 'wagmi'],
          zk: ['snarkjs', 'circomlib']
        }
      }
    }
  },
  
  optimizeDeps: {
    include: [
      'ethers',
      '@noble/secp256k1',
      '@noble/hashes/sha256',
      '@noble/hashes/hkdf',
      'crypto-js',
      'elliptic',
      'viem',
      'wagmi',
      'tweetnacl',
      'snarkjs',
      'buffer',
      'process',
      'idb'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util'
    }
  },
  
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js']
  }
}); 