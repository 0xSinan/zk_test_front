// ===== src/lib/tradeprivate/index.js =====
import { PrivateAccountManager } from './accountManager.js';
import { PrivateOrderManager } from './orderManager.js';
import { ethers } from 'ethers';
import { getContract, getCurrentAddress } from '../contracts/index.js';
import { CONSTANTS } from '../config/constants.js';
import { TradePrivateMonitoring } from '../utils/monitoring.js';

export class TradePrivateSDK {
  constructor() {
    this.accountManager = new PrivateAccountManager();
    this.orderManager = new PrivateOrderManager(this.accountManager);
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    console.log('Initializing TradePrivate SDK...');
    const startTime = performance.now();
    
    try {
      // Initialize account manager
      await this.accountManager.initialize();
      
      // Load order history
      await this.orderManager.loadOrderHistory();
      
      // Load pending commit if exists
      await this.accountManager.loadPendingCommit();
      
      this.initialized = true;
      
      const initTime = performance.now() - startTime;
      console.log(`TradePrivate SDK initialized in ${initTime.toFixed(2)}ms`);
      
      TradePrivateMonitoring.logEvent('sdk_initialized', { 
        duration: initTime,
        hasAccount: this.accountManager.accountCommitment !== null,
        hasPendingCommit: this.accountManager.pendingCommit !== null
      });
    } catch (error) {
      console.error('Failed to initialize SDK:', error);
      TradePrivateMonitoring.trackTransactionFailure(error, 'sdk_init');
      throw error;
    }
  }

  // Account Management
  async createPrivateAccount() {
    await this.ensureInitialized();
    
    const userAddress = await getCurrentAddress();
    if (!userAddress) {
      throw new Error('No wallet connected');
    }
    
    const balance = await this.getPublicBalance(userAddress);
    if (balance === 0n) {
      throw new Error('Must have balance to create private account');
    }

    return await this.accountManager.createAccount(userAddress);
  }

  async revealPrivateAccount() {
    await this.ensureInitialized();
    
    const userAddress = await getCurrentAddress();
    if (!userAddress) {
      throw new Error('No wallet connected');
    }
    
    return await this.accountManager.revealAccount(userAddress);
  }

  async getAccountInfo() {
    await this.ensureInitialized();
    
    if (!this.accountManager.accountCommitment) {
      return null;
    }

    try {
      const balance = await this.accountManager.getAccountBalance();
      
      return {
        commitment: this.accountManager.accountCommitment.toHex(),
        balance: ethers.formatUnits(balance, 6), // USDC decimals
        balanceRaw: balance.toString(),
        publicKey: this.accountManager.keyManager.getTradingPublicKey()
      };
    } catch (error) {
      console.error('Failed to get account info:', error);
      return null;
    }
  }

  // Trading Operations
  async submitOrder(orderParams) {
    await this.ensureInitialized();
    return await this.orderManager.submitPrivateOrder(orderParams);
  }

  async getOrderStatus(nullifier) {
    await this.ensureInitialized();
    return await this.orderManager.getOrderStatus(nullifier);
  }

  async getPendingOrders() {
    await this.ensureInitialized();
    return this.orderManager.getPendingOrders();
  }

  // Deposits/Withdrawals
  async deposit(amount) {
    await this.ensureInitialized();
    
    const contract = await getContract('TradePrivate', true);
    const usdcContract = await getContract('USDC', true);
    const userAddress = await getCurrentAddress();
    
    if (!userAddress) {
      throw new Error('No wallet connected');
    }
    
    const parsedAmount = ethers.parseUnits(amount.toString(), 6); // USDC
    
    // Check allowance
    const allowance = await usdcContract.allowance(userAddress, CONSTANTS.CONTRACTS.TRADE_PRIVATE);
    
    if (allowance < parsedAmount) {
      console.log('Approving USDC...');
      const approveTx = await usdcContract.approve(
        CONSTANTS.CONTRACTS.TRADE_PRIVATE,
        ethers.MaxUint256
      );
      await approveTx.wait();
    }
    
    // Deposit
    console.log('Depositing USDC...');
    const tx = await contract.deposit(parsedAmount);
    const receipt = await tx.wait();
    
    TradePrivateMonitoring.trackUserAction('deposit_success', {
      amount: amount.toString(),
      txHash: tx.hash
    });
    
    return tx.hash;
  }

  async withdraw(amount) {
    await this.ensureInitialized();
    
    const userAddress = await getCurrentAddress();
    if (!userAddress) {
      throw new Error('No wallet connected');
    }
    
    return await this.accountManager.withdraw(amount, userAddress);
  }

  // Utility Methods
  async getPublicBalance(address) {
    const contract = await getContract('TradePrivate');
    return await contract.balances(address || await getCurrentAddress());
  }

  async getPrivateBalance() {
    await this.ensureInitialized();
    
    if (!this.accountManager.accountCommitment) {
      return 0n;
    }
    
    return await this.accountManager.getAccountBalance();
  }

  async getUSDCBalance(address) {
    const usdcContract = await getContract('USDC');
    return await usdcContract.balanceOf(address || await getCurrentAddress());
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Check if user has private account
  async hasPrivateAccount() {
    await this.ensureInitialized();
    return this.accountManager.accountCommitment !== null;
  }

  // Get pending commit status
  async getPendingCommit() {
    await this.ensureInitialized();
    return this.accountManager.pendingCommit;
  }

  // Get protocol stats
  async getProtocolStats() {
    const contract = await getContract('TradePrivate');
    
    const [
      tvl,
      activeKeepers,
      stateRoot,
      protocolNonce
    ] = await Promise.all([
      contract.getTVL(),
      contract.activeKeeperList.length,
      contract.stateRoot(),
      contract.protocolNonce()
    ]);

    return {
      tvl: ethers.formatUnits(tvl, 6), // USDC
      tvlRaw: tvl.toString(),
      activeKeepers: Number(activeKeepers),
      stateRoot,
      protocolNonce: protocolNonce.toString()
    };
  }

  // Cleanup
  destroy() {
    this.accountManager.destroy();
    this.initialized = false;
  }
}

// ===== src/lib/tradeprivate/secure.js =====
import { TradePrivateSDK } from './index.js';
import { ErrorHandler } from '../utils/errors.js';
import { InputValidator } from '../utils/validation.js';
import { TradePrivateMonitoring } from '../utils/monitoring.js';
import { CONSTANTS } from '../config/constants.js';

class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000; // 1 minute
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.error('Circuit breaker opened due to failures');
      TradePrivateMonitoring.logEvent('circuit_breaker_open', {
        failures: this.failures
      });
    }
  }

  reset() {
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED';
    TradePrivateMonitoring.logEvent('circuit_breaker_reset');
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime
    };
  }
}

class SecureSessionManager {
  constructor() {
    this.sessionStart = Date.now();
    this.lastActivity = Date.now();
    this.sessionId = this.generateSessionId();
    this.warningShown = false;
    this.activityListeners = [];
    
    if (typeof window !== 'undefined') {
      // Track user activity
      ['click', 'keypress', 'mousemove'].forEach(event => {
        window.addEventListener(event, () => this.updateActivity(), { passive: true });
      });
      
      // Check session periodically
      this.sessionCheckInterval = setInterval(() => {
        this.checkSession();
      }, 60000); // Every minute
    }
  }

  generateSessionId() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  checkSession() {
    const now = Date.now();
    const sessionAge = now - this.sessionStart;
    const inactivity = now - this.lastActivity;

    // Session expired
    if (sessionAge > CONSTANTS.SESSION_DURATION) {
      this.expireSession('session_timeout');
      return false;
    }

    // Warning before expiration
    if (sessionAge > CONSTANTS.SESSION_DURATION - CONSTANTS.WARNING_TIME && !this.warningShown) {
      this.showExpiryWarning();
      this.warningShown = true;
    }

    // Inactivity timeout
    if (inactivity > 15 * 60 * 1000) { // 15 minutes
      this.expireSession('inactivity');
      return false;
    }

    return true;
  }

  showExpiryWarning() {
    const remaining = Math.ceil(
      (CONSTANTS.SESSION_DURATION - (Date.now() - this.sessionStart)) / 60000
    );
    
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(`Session expires in ${remaining} minutes`, 'warning');
    }
    
    TradePrivateMonitoring.logEvent('session_warning', { 
      remainingMinutes: remaining 
    });
  }

  expireSession(reason) {
    TradePrivateMonitoring.logEvent('session_expired', {
      sessionId: this.sessionId,
      duration: Date.now() - this.sessionStart,
      reason
    });

    // Clear interval
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    // Notify listeners
    this.activityListeners.forEach(listener => listener(reason));

    // Clear sensitive data
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      
      // Destroy SDK instance if exists
      if (window.tradePrivateSDK) {
        window.tradePrivateSDK.destroy();
      }
      
      // Redirect to home
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }

  onSessionExpired(callback) {
    this.activityListeners.push(callback);
  }

  destroy() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    this.activityListeners = [];
  }
}

export class TradePrivateSDKSecure extends TradePrivateSDK {
  constructor() {
    super();
    this.circuitBreaker = new CircuitBreaker();
    this.sessionManager = new SecureSessionManager();
    
    // Listen for session expiry
    this.sessionManager.onSessionExpired((reason) => {
      console.log('Session expired:', reason);
      this.destroy();
    });
  }

  async initialize() {
    return this.circuitBreaker.execute(async () => {
      await super.initialize();
      
      // Additional security checks
      await this.performSecurityChecks();
    });
  }

  async performSecurityChecks() {
    // Check network
    const network = await this.checkNetwork();
    if (network.chainId !== BigInt(CONSTANTS.CHAIN_ID)) {
      throw new Error(`Wrong network. Please switch to chain ${CONSTANTS.CHAIN_ID}`);
    }
    
    // Check contract deployment
    const contracts = ['TradePrivate', 'ZKVerifierManager', 'USDC'];
    for (const name of contracts) {
      try {
        const contract = await getContract(name);
        const code = await contract.runner.provider.getCode(await contract.getAddress());
        if (code === '0x') {
          throw new Error(`${name} contract not deployed`);
        }
      } catch (error) {
        console.error(`Failed to verify ${name} contract:`, error);
        throw new Error(`Cannot verify ${name} contract deployment`);
      }
    }
  }

  async checkNetwork() {
    const { getNetwork } = await import('../contracts/index.js');
    return await getNetwork();
  }

  async submitOrder(orderParams) {
    // Update session activity
    this.sessionManager.updateActivity();
    
    // Validate inputs
    try {
      InputValidator.validateOrderParams(orderParams);
    } catch (error) {
      TradePrivateMonitoring.trackUserAction('order_validation_failed', {
        errors: error.errors
      });
      throw error;
    }
    
    // Execute with circuit breaker
    return await this.circuitBreaker.execute(async () => {
      const startTime = performance.now();
      
      try {
        const result = await super.submitOrder(orderParams);
        
        const duration = performance.now() - startTime;
        TradePrivateMonitoring.logEvent('order_submitted', {
          duration,
          orderType: orderParams.orderType,
          success: true
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        TradePrivateMonitoring.trackTransactionFailure(error, 'submitOrder');
        TradePrivateMonitoring.logEvent('order_failed', {
          duration,
          error: error.message
        });
        
        throw error;
      }
    });
  }

  async createPrivateAccount() {
    this.sessionManager.updateActivity();
    
    return await this.circuitBreaker.execute(async () => {
      return await super.createPrivateAccount();
    });
  }

  async deposit(amount) {
    this.sessionManager.updateActivity();
    
    // Validate amount
    const errors = InputValidator.validateAmount(
      amount,
      'amount',
      '0',
      CONSTANTS.MAX_ORDER_SIZE
    );
    
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
    
    return await this.circuitBreaker.execute(async () => {
      return await super.deposit(amount);
    });
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  getSessionInfo() {
    return {
      sessionId: this.sessionManager.sessionId,
      duration: Date.now() - this.sessionManager.sessionStart,
      lastActivity: Date.now() - this.sessionManager.lastActivity,
      remainingTime: CONSTANTS.SESSION_DURATION - (Date.now() - this.sessionManager.sessionStart)
    };
  }

  destroy() {
    super.destroy();
    this.sessionManager.destroy();
  }
}

// Export secure version as default
export default TradePrivateSDKSecure;