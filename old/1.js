// ===== examples/basic-usage.js =====
import { TradePrivateSDKSecure } from '../src/lib/tradeprivate/secure.js';

async function basicExample() {
  // Initialize SDK
  const sdk = new TradePrivateSDKSecure();
  await sdk.initialize();
  
  console.log('SDK initialized successfully');
  
  // Check if user has private account
  const hasAccount = await sdk.hasPrivateAccount();
  
  if (!hasAccount) {
    console.log('Creating private account...');
    
    // Step 1: Commit
    const commitResult = await sdk.createPrivateAccount();
    console.log(`Commitment submitted. Wait ${commitResult.waitBlocks} blocks`);
    console.log(`Transaction: ${commitResult.txHash}`);
    
    // Wait for blocks (in real app, you'd poll or use events)
    await waitForBlocks(commitResult.waitBlocks);
    
    // Step 2: Reveal
    const account = await sdk.revealPrivateAccount();
    console.log('Account created:', account.commitment);
  }
  
  // Get account info
  const info = await sdk.getAccountInfo();
  console.log('Account balance:', info.balance, 'USDC');
  
  // Submit an order
  const orderResult = await sdk.submitOrder({
    market: '0x1234567890123456789012345678901234567890',
    size: '1000',
    isLong: true,
    orderType: 0, // Market order
    leverage: 10
  });
  
  console.log('Order submitted:', orderResult.nullifier);
  
  // Check order status
  const status = await sdk.getOrderStatus(orderResult.nullifier);
  console.log('Order status:', status);
}

async function waitForBlocks(blocks) {
  // Simple wait function - in production use event listeners
  const blockTime = 12000; // 12 seconds per block
  await new Promise(resolve => setTimeout(resolve, blocks * blockTime));
}

// Run example
basicExample().catch(console.error);

// ===== examples/advanced-trading.js =====
import { TradePrivateSDKSecure } from '../src/lib/tradeprivate/secure.js';
import { showToast, showError } from '../src/lib/stores/index.js';

class AdvancedTrading {
  constructor() {
    this.sdk = null;
    this.positions = new Map();
  }
  
  async initialize() {
    this.sdk = new TradePrivateSDKSecure();
    await this.sdk.initialize();
    
    // Set up monitoring
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    // Monitor circuit breaker
    setInterval(() => {
      const state = this.sdk.getCircuitBreakerState();
      if (state.state === 'OPEN') {
        console.warn('Circuit breaker is open:', state);
      }
    }, 60000);
    
    // Monitor session
    const sessionInfo = this.sdk.getSessionInfo();
    console.log('Session info:', sessionInfo);
  }
  
  async executeTradingStrategy() {
    try {
      // Example: Grid trading strategy
      const basePrice = 2500;
      const gridSize = 50; // $50 intervals
      const orderSize = '1000'; // 1000 USDC per order
      
      const orders = [];
      
      // Place buy orders below current price
      for (let i = 1; i <= 5; i++) {
        const price = (basePrice - (i * gridSize)).toString();
        orders.push(this.submitLimitOrder({
          price,
          size: orderSize,
          isLong: true
        }));
      }
      
      // Place sell orders above current price
      for (let i = 1; i <= 5; i++) {
        const price = (basePrice + (i * gridSize)).toString();
        orders.push(this.submitLimitOrder({
          price,
          size: orderSize,
          isLong: false
        }));
      }
      
      // Execute all orders in parallel
      const results = await Promise.allSettled(orders);
      
      // Track successful orders
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.positions.set(result.value.nullifier, {
            ...orders[index],
            submittedAt: Date.now()
          });
        } else {
          console.error('Order failed:', result.reason);
        }
      });
      
      console.log(`Placed ${this.positions.size} orders successfully`);
    } catch (error) {
      console.error('Strategy execution failed:', error);
    }
  }
  
  async submitLimitOrder(params) {
    return await this.sdk.submitOrder({
      market: '0x1234567890123456789012345678901234567890',
      size: params.size,
      price: params.price,
      isLong: params.isLong,
      orderType: 1, // Limit order
      leverage: 5
    });
  }
  
  async manageRisk() {
    // Example: Close all positions if drawdown exceeds threshold
    const accountInfo = await this.sdk.getAccountInfo();
    const currentBalance = parseFloat(accountInfo.balance);
    const initialBalance = 10000; // Example initial balance
    
    const drawdown = (initialBalance - currentBalance) / initialBalance;
    
    if (drawdown > 0.1) { // 10% drawdown
      console.warn('Drawdown threshold exceeded, closing all positions');
      await this.closeAllPositions();
    }
  }
  
  async closeAllPositions() {
    const closeOrders = [];
    
    for (const [nullifier, position] of this.positions) {
      closeOrders.push(this.sdk.submitOrder({
        market: position.market,
        size: position.size,
        isLong: !position.isLong, // Opposite direction
        isReduceOnly: true,
        orderType: 0 // Market order
      }));
    }
    
    await Promise.allSettled(closeOrders);
    this.positions.clear();
  }
}

// ===== examples/keeper-bot.js =====
import { ethers } from 'ethers';
import { getContract } from '../src/lib/contracts/index.js';

class KeeperBot {
  constructor(privateKey) {
    this.wallet = new ethers.Wallet(privateKey);
    this.provider = null;
    this.contract = null;
    this.isRunning = false;
  }
  
  async initialize() {
    // Connect to provider
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = this.wallet.connect(this.provider);
    
    // Get contract instance
    this.contract = await getContract('TradePrivate');
    this.contract = this.contract.connect(this.wallet);
    
    console.log('Keeper bot initialized');
    console.log('Address:', this.wallet.address);
  }
  
  async register() {
    // Generate keeper public key
    const publicKey = ethers.hexlify(ethers.randomBytes(32));
    
    // Register as keeper
    const tx = await this.contract.registerKeeper(publicKey);
    await tx.wait();
    
    console.log('Registered as keeper');
  }
  
  async start() {
    this.isRunning = true;
    
    while (this.isRunning) {
      try {
        await this.checkAndExecuteBatches();
        await this.sleep(30000); // Check every 30 seconds
      } catch (error) {
        console.error('Keeper error:', error);
        await this.sleep(60000); // Wait longer on error
      }
    }
  }
  
  async checkAndExecuteBatches() {
    // This is a simplified example
    // In production, you'd implement actual batch collection and execution
    
    console.log('Checking for executable batches...');
    
    // Get pending orders (this would require additional contract methods)
    // const pendingOrders = await this.contract.getPendingOrders();
    
    // Build batch
    // const batch = this.buildBatch(pendingOrders);
    
    // Generate proof (would use actual ZK prover)
    // const proof = await this.generateBatchProof(batch);
    
    // Execute batch
    // const tx = await this.contract.executeBatch(...);
    
    console.log('No batches to execute');
  }
  
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  stop() {
    this.isRunning = false;
  }
}

// ===== config/environments.js =====
export const environments = {
  development: {
    chainId: 1,
    rpcUrl: 'http://localhost:8545',
    contracts: {
      tradePrivate: '0x0000000000000000000000000000000000000001',
      zkVerifierManager: '0x0000000000000000000000000000000000000002',
      usdc: '0x0000000000000000000000000000000000000003'
    },
    circuits: {
      baseUrl: 'http://localhost:3000/circuits'
    }
  },
  
  staging: {
    chainId: 5, // Goerli
    rpcUrl: 'https://eth-goerli.g.alchemy.com/v2/YOUR_KEY',
    contracts: {
      tradePrivate: '0x...',
      zkVerifierManager: '0x...',
      usdc: '0x...'
    },
    circuits: {
      baseUrl: 'https://staging-circuits.tradeprivate.io'
    }
  },
  
  production: {
    chainId: 1, // Mainnet
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    backupRpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY',
    contracts: {
      tradePrivate: '0x...',
      zkVerifierManager: '0x...',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    },
    circuits: {
      baseUrl: 'https://circuits.tradeprivate.io'
    }
  }
};

export function getEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  return environments[env] || environments.development;
}

// ===== scripts/health-check.js =====
import { ethers } from 'ethers';
import { getEnvironment } from '../config/environments.js';

async function healthCheck() {
  console.log('🏥 Running TradePrivate Health Check...\n');
  
  const env = getEnvironment();
  const results = {
    rpc: false,
    contracts: {},
    circuits: false,
    overall: false
  };
  
  // Check RPC connection
  try {
    const provider = new ethers.JsonRpcProvider(env.rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ RPC Connection: Block ${blockNumber}`);
    results.rpc = true;
  } catch (error) {
    console.log('❌ RPC Connection Failed:', error.message);
  }
  
  // Check contracts
  for (const [name, address] of Object.entries(env.contracts)) {
    try {
      const provider = new ethers.JsonRpcProvider(env.rpcUrl);
      const code = await provider.getCode(address);
      if (code !== '0x') {
        console.log(`✅ ${name} contract: ${address}`);
        results.contracts[name] = true;
      } else {
        console.log(`❌ ${name} contract: No code at ${address}`);
        results.contracts[name] = false;
      }
    } catch (error) {
      console.log(`❌ ${name} contract check failed:`, error.message);
      results.contracts[name] = false;
    }
  }
  
  // Check circuits availability
  try {
    const response = await fetch(`${env.circuits.baseUrl}/account_creation.wasm`);
    if (response.ok) {
      console.log('✅ Circuits available');
      results.circuits = true;
    } else {
      console.log('❌ Circuits not available');
    }
  } catch (error) {
    console.log('❌ Circuit check failed:', error.message);
  }
  
  // Overall health
  results.overall = results.rpc && 
    Object.values(results.contracts).every(v => v) && 
    results.circuits;
  
  console.log('\n📊 Health Check Summary:');
  console.log('Overall:', results.overall ? '✅ HEALTHY' : '❌ UNHEALTHY');
  
  process.exit(results.overall ? 0 : 1);
}

healthCheck().catch(console.error);

// ===== scripts/performance-test.js =====
import { performance } from 'perf_hooks';
import { TradePrivateSDKSecure } from '../src/lib/tradeprivate/secure.js';

async function performanceTest() {
  console.log('🚀 Running Performance Tests...\n');
  
  const sdk = new TradePrivateSDKSecure();
  await sdk.initialize();
  
  const results = {
    initialization: 0,
    accountCreation: 0,
    orderSubmission: 0,
    proofGeneration: 0
  };
  
  // Test initialization time
  const initStart = performance.now();
  const sdk2 = new TradePrivateSDKSecure();
  await sdk2.initialize();
  results.initialization = performance.now() - initStart;
  
  // Test order submission (mock)
  const orderStart = performance.now();
  try {
    await sdk.submitOrder({
      market: '0x0000000000000000000000000000000000000001',
      size: '1000',
      isLong: true,
      orderType: 0
    });
  } catch (error) {
    // Expected to fail without real contracts
  }
  results.orderSubmission = performance.now() - orderStart;
  
  console.log('📊 Performance Results:');
  console.log(`Initialization: ${results.initialization.toFixed(2)}ms`);
  console.log(`Order Submission: ${results.orderSubmission.toFixed(2)}ms`);
  
  // Check if within acceptable limits
  const limits = {
    initialization: 1000, // 1 second
    orderSubmission: 5000 // 5 seconds
  };
  
  let passed = true;
  for (const [metric, time] of Object.entries(results)) {
    if (limits[metric] && time > limits[metric]) {
      console.log(`❌ ${metric} exceeded limit: ${time.toFixed(2)}ms > ${limits[metric]}ms`);
      passed = false;
    }
  }
  
  console.log('\nOverall:', passed ? '✅ PASSED' : '❌ FAILED');
}

performanceTest().catch(console.error);

// ===== vitest.config.js =====
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'scripts/',
        'examples/'
      ]
    }
  },
  resolve: {
    alias: {
      '$lib': path.resolve('./src/lib')
    }
  }
});