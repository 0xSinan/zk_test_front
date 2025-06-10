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