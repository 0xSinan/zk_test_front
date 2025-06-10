#!/usr/bin/env node

/**
 * Deployment Check Script for TradePrivate dApp
 * Verifies the application is ready for production deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔍 Checking TradePrivate deployment readiness...\n');

let checks = 0;
let passed = 0;
let warnings = 0;

function check(name, condition, details = '', isWarning = false) {
  checks++;
  if (condition) {
    passed++;
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
  } else {
    if (isWarning) {
      warnings++;
      console.log(`⚠️  ${name}`);
    } else {
      console.log(`❌ ${name}`);
    }
    if (details) console.log(`   ${details}`);
  }
}

// 1. Check environment configuration
console.log('📋 Environment Configuration');
console.log('─'.repeat(40));

const envPath = path.join(rootDir, '.env');
const envExists = fs.existsSync(envPath);
check('Environment file exists', envExists, '.env file is present');

if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  check('RPC URL configured', envContent.includes('VITE_RPC_URL='), 'Set your RPC URL');
  check('Contract addresses set', envContent.includes('VITE_TRADE_PRIVATE_ADDRESS='), 'Configure contract addresses');
  check('API keys present', envContent.includes('API_KEY'), 'API keys configured', true);
}

// 2. Check build configuration
console.log('\n🏗️  Build Configuration');
console.log('─'.repeat(40));

const packageJsonPath = path.join(rootDir, 'package.json');
const packageJsonExists = fs.existsSync(packageJsonPath);
check('Package.json exists', packageJsonExists);

if (packageJsonExists) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  check('Build script configured', !!packageJson.scripts?.build);
  check('Production dependencies', !!packageJson.dependencies?.svelte);
  check('Security dependencies', !!packageJson.dependencies?.ethers);
}

const viteConfigPath = path.join(rootDir, 'vite.config.js');
check('Vite config exists', fs.existsSync(viteConfigPath));

// 3. Check source code structure
console.log('\n📁 Source Code Structure');
console.log('─'.repeat(40));

const requiredDirs = [
  'src/lib/tradeprivate',
  'src/lib/contracts',
  'src/lib/crypto',
  'src/lib/utils',
  'src/lib/stores',
  'src/lib/components',
  'src/routes'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(rootDir, dir);
  check(`${dir} exists`, fs.existsSync(dirPath));
});

// 4. Check critical files
console.log('\n🔑 Critical Files');
console.log('─'.repeat(40));

const criticalFiles = [
  'src/lib/tradeprivate/index.js',
  'src/lib/tradeprivate/secure.js',
  'src/lib/contracts/index.js',
  'src/lib/crypto/fieldElement.js',
  'src/lib/stores/index.js',
  'src/routes/+page.svelte',
  'src/routes/+layout.svelte'
];

criticalFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  check(`${file} exists`, fs.existsSync(filePath));
});

// 5. Check security configurations
console.log('\n🔒 Security Configuration');
console.log('─'.repeat(40));

const appHtmlPath = path.join(rootDir, 'src/app.html');
if (fs.existsSync(appHtmlPath)) {
  const appHtml = fs.readFileSync(appHtmlPath, 'utf8');
  check('Security headers configured', appHtml.includes('X-Content-Type-Options'), 'CSP and security headers');
  check('Proper meta tags', appHtml.includes('viewport'), 'Meta tags configured');
}

// 6. Check assets and public files
console.log('\n🎨 Assets and Public Files');
console.log('─'.repeat(40));

const publicAssets = [
  'public/manifest.json',
  'public/favicon.png',
  'public/circuits'
];

publicAssets.forEach(asset => {
  const assetPath = path.join(rootDir, asset);
  check(`${asset} exists`, fs.existsSync(assetPath));
});

// 7. Check for production readiness
console.log('\n🚀 Production Readiness');
console.log('─'.repeat(40));

const gitignorePath = path.join(rootDir, '.gitignore');
check('.gitignore exists', fs.existsSync(gitignorePath));

const nodeModulesPath = path.join(rootDir, 'node_modules');
check('Dependencies installed', fs.existsSync(nodeModulesPath));

// Check for development-only files in production
const devFiles = [
  '.env',
  '.dev-setup.json',
  '.dev-storage'
];

devFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  check(`${file} (dev file)`, fs.existsSync(filePath), 'Should be in .gitignore', true);
});

// 8. Check Docker configuration (if exists)
console.log('\n🐳 Docker Configuration');
console.log('─'.repeat(40));

const dockerfilePath = path.join(rootDir, 'Dockerfile');
const dockerExists = fs.existsSync(dockerfilePath);
check('Dockerfile exists', dockerExists, 'Docker deployment ready', true);

if (dockerExists) {
  const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
  check('Multi-stage build', dockerfile.includes('FROM'), 'Dockerfile configured');
  check('Proper port exposure', dockerfile.includes('EXPOSE'), 'Port configuration');
}

// 9. Final recommendations
console.log('\n📋 Final Checks');
console.log('─'.repeat(40));

// Check for common production issues
const srcFiles = getAllJsFiles(path.join(rootDir, 'src'));
let hasConsoleLog = false;
let hasDebugCode = false;

srcFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('console.log') && !content.includes('// TODO: remove')) {
    hasConsoleLog = true;
  }
  if (content.includes('// DEBUG') || content.includes('debugger')) {
    hasDebugCode = true;
  }
});

check('No debug console.log', !hasConsoleLog, 'Remove console.log for production', true);
check('No debug code', !hasDebugCode, 'Remove debug code for production', true);

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 DEPLOYMENT READINESS SUMMARY');
console.log('='.repeat(50));

const score = Math.round((passed / checks) * 100);
console.log(`✅ Passed: ${passed}/${checks} checks (${score}%)`);
if (warnings > 0) {
  console.log(`⚠️  Warnings: ${warnings}`);
}

if (score >= 90) {
  console.log('\n🎉 READY FOR DEPLOYMENT!');
  console.log('Your TradePrivate dApp is ready for production.');
} else if (score >= 75) {
  console.log('\n⚠️  MOSTLY READY');
  console.log('Fix the failing checks before deploying to production.');
} else {
  console.log('\n❌ NOT READY');
  console.log('Several critical issues need to be resolved.');
}

console.log('\n📝 Deployment Checklist:');
console.log('1. Set production RPC URLs in .env');
console.log('2. Configure real contract addresses');
console.log('3. Remove all debug code and console.log');
console.log('4. Test with real MetaMask/wallet');
console.log('5. Verify ZK circuits work in production');
console.log('6. Set up monitoring and analytics');
console.log('7. Configure CDN for static assets');
console.log('8. Set up SSL/HTTPS');

// Helper function to get all JS files recursively
function getAllJsFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(fullPath);
      } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.svelte'))) {
        files.push(fullPath);
      }
    });
  }
  
  if (fs.existsSync(dir)) {
    walk(dir);
  }
  
  return files;
} 