#!/usr/bin/env node

/**
 * Development Setup Script for TradePrivate dApp
 * Sets up the development environment with mock data and configurations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🚀 Setting up TradePrivate development environment...\n');

// 1. Check if .env exists
function setupEnvironment() {
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');
  
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file from .env.example...');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ .env file created');
    } else {
      console.log('⚠️  .env.example not found, creating basic .env...');
      const basicEnv = `# TradePrivate Development Environment
VITE_CHAIN_ID=1337
VITE_RPC_URL=http://localhost:8545
VITE_ENABLE_ZK_PROOFS=false
VITE_LOG_LEVEL=debug
VITE_ENABLE_DEBUG=true
`;
      fs.writeFileSync(envPath, basicEnv);
      console.log('✅ Basic .env file created');
    }
  } else {
    console.log('✅ .env file already exists');
  }
}

// 2. Setup public/circuits directory with mock files
function setupCircuits() {
  const circuitsDir = path.join(rootDir, 'public', 'circuits');
  
  if (!fs.existsSync(circuitsDir)) {
    fs.mkdirSync(circuitsDir, { recursive: true });
  }
  
  console.log('📁 Setting up ZK circuits directory...');
  
  const mockCircuits = [
    'account_creation.wasm',
    'account_creation_pk.bin',
    'order_submission.wasm',
    'order_submission_pk.bin',
    'withdrawal.wasm',
    'withdrawal_pk.bin'
  ];
  
  mockCircuits.forEach(circuit => {
    const circuitPath = path.join(circuitsDir, circuit);
    if (!fs.existsSync(circuitPath)) {
      // Create mock binary file
      const mockData = Buffer.alloc(1024, 0x00); // 1KB of zeros
      fs.writeFileSync(circuitPath, mockData);
      console.log(`✅ Created mock circuit: ${circuit}`);
    }
  });
}

// 3. Setup favicon and other assets
function setupAssets() {
  console.log('🎨 Setting up assets...');
  
  const publicDir = path.join(rootDir, 'public');
  
  // Create favicon.png (simple placeholder)
  const faviconPath = path.join(publicDir, 'favicon.png');
  if (!fs.existsSync(faviconPath)) {
    // Create a simple 32x32 PNG (base64 encoded)
    const simplePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(faviconPath, simplePng);
    console.log('✅ Created favicon.png');
  }
  
  // Create og-image.png placeholder
  const ogImagePath = path.join(publicDir, 'og-image.png');
  if (!fs.existsSync(ogImagePath)) {
    const simplePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(ogImagePath, simplePng);
    console.log('✅ Created og-image.png');
  }
}

// 4. Setup local storage for development
function setupLocalStorage() {
  console.log('💾 Setting up local storage structure...');
  
  const mockData = {
    version: '1.0.0',
    setupDate: new Date().toISOString(),
    environment: 'development',
    features: {
      zkProofs: false,
      analytics: true,
      debugging: true
    }
  };
  
  const setupDataPath = path.join(rootDir, '.dev-setup.json');
  fs.writeFileSync(setupDataPath, JSON.stringify(mockData, null, 2));
  console.log('✅ Created development setup data');
}

// 5. Validate dependencies
function validateDependencies() {
  console.log('📦 Validating dependencies...');
  
  const packageJsonPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = [
      'svelte',
      '@sveltejs/kit',
      'ethers',
      'vite'
    ];
    
    const missing = requiredDeps.filter(dep => 
      !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
    );
    
    if (missing.length > 0) {
      console.log(`⚠️  Missing dependencies: ${missing.join(', ')}`);
      console.log('Run: npm install');
    } else {
      console.log('✅ All required dependencies are installed');
    }
  }
}

// 6. Create development database/storage
function setupDevStorage() {
  console.log('🗄️  Setting up development storage...');
  
  const devStorageDir = path.join(rootDir, '.dev-storage');
  if (!fs.existsSync(devStorageDir)) {
    fs.mkdirSync(devStorageDir);
  }
  
  // Mock account data
  const mockAccounts = {
    accounts: [],
    orders: [],
    transactions: [],
    lastUpdate: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(devStorageDir, 'accounts.json'),
    JSON.stringify(mockAccounts, null, 2)
  );
  
  console.log('✅ Development storage initialized');
}

// Main setup function
async function main() {
  try {
    setupEnvironment();
    setupCircuits();
    setupAssets();
    setupLocalStorage();
    validateDependencies();
    setupDevStorage();
    
    console.log('\n🎉 Development environment setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run: npm install (if needed)');
    console.log('2. Run: npm run dev');
    console.log('3. Open: http://localhost:3000');
    console.log('\n🔧 Development features enabled:');
    console.log('• Mock ZK proofs');
    console.log('• Debug logging');
    console.log('• Local storage simulation');
    console.log('• Circuit mocks');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main(); 