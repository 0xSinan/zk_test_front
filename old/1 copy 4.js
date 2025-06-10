// ===== src/lib/tradeprivate/accountManager.js =====
import { 
  PrivateKeyManager, 
  CommitmentGenerator, 
  NullifierGenerator 
} from '../crypto/index.js';
import { getContract } from '../contracts/index.js';
import { ethers } from 'ethers';
import { ErrorHandler, parseContractError } from '../utils/errors.js';
import { InputValidator } from '../utils/validation.js';
import { TradePrivateMonitoring } from '../utils/monitoring.js';
import { CONSTANTS } from '../config/constants.js';

// Mock ZK proof generator for now
const mockProof = [0, 0, 0, 0, 0, 0, 0, 0].map(n => ethers.toBigInt(n));

export class PrivateAccountManager {
  constructor() {
    this.keyManager = new PrivateKeyManager();
    this.accountCommitment = null;
    this.accountNonce = null;
    this.pendingCommit = null;
  }

  async initialize() {
    await this.keyManager.initialize();
    
    // Check if account already exists
    const existing = await this.loadExistingAccount();
    if (existing) {
      this.accountCommitment = existing.commitment;
      this.accountNonce = existing.nonce;
    }
  }

  async createAccount(userAddress) {
    if (this.accountCommitment) {
      throw new Error('Account already exists');
    }

    return ErrorHandler.withRetry(async () => {
      const sanitizedAddress = InputValidator.sanitizeAddress(userAddress);
      const contract = await getContract('TradePrivate', true);
      
      // Check user balance
      const balance = await contract.balances(sanitizedAddress);
      if (balance === 0n) {
        throw new Error('Must have balance to create private account');
      }

      // Step 1: Generate commitment
      const nonce = this.generateSecureNonce();
      const commitment = CommitmentGenerator.generateAccountCommitment(
        this.keyManager.privateKey,
        nonce
      );

      // Step 2: Create commit hash
      const commitHash = CommitmentGenerator.generateCommitHash(
        commitment,
        nonce,
        sanitizedAddress
      );

      // Step 3: Submit commit
      console.log('Submitting account commitment...');
      TradePrivateMonitoring.trackUserAction('account_commit_start');
      
      const commitTx = await contract.commitTradingAccount(commitHash);
      const receipt = await commitTx.wait();

      // Store pending commit info
      this.pendingCommit = {
        commitment,
        nonce,
        commitHash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now()
      };

      await this.savePendingCommit();
      
      TradePrivateMonitoring.trackUserAction('account_commit_success', {
        blockNumber: receipt.blockNumber
      });

      return {
        commitHash,
        waitBlocks: CONSTANTS.COMMIT_REVEAL_DELAY,
        txHash: commitTx.hash
      };
    }, {
      shouldRetry: ErrorHandler.isRetryableError,
      onRetry: (attempt) => {
        TradePrivateMonitoring.logEvent('account_creation_retry', { attempt });
      }
    });
  }

  async revealAccount(userAddress) {
    if (!this.pendingCommit) {
      throw new Error('No pending commit found');
    }

    return ErrorHandler.withRetry(async () => {
      const sanitizedAddress = InputValidator.sanitizeAddress(userAddress);
      const contract = await getContract('TradePrivate', true);
      const provider = await contract.runner.provider;
      
      // Check if enough blocks have passed
      const currentBlock = await provider.getBlockNumber();
      const blocksPassed = currentBlock - this.pendingCommit.blockNumber;
      
      if (blocksPassed < CONSTANTS.COMMIT_REVEAL_DELAY) {
        throw new Error(`Must wait ${CONSTANTS.COMMIT_REVEAL_DELAY - blocksPassed} more blocks`);
      }

      // Get current balance for proof
      const balance = await contract.balances(sanitizedAddress);

      // For now, use mock proof - in production, generate real ZK proof
      console.log('Generating account creation proof...');
      const startTime = performance.now();
      
      // TODO: Replace with real proof generation
      const proof = mockProof;
      
      const proofTime = performance.now() - startTime;
      TradePrivateMonitoring.trackProofGeneration('account_creation', proofTime);

      // Submit reveal transaction
      console.log('Revealing account...');
      TradePrivateMonitoring.trackUserAction('account_reveal_start');
      
      const revealTx = await contract.revealTradingAccount(
        this.pendingCommit.commitment.toHex(),
        this.pendingCommit.nonce,
        proof
      );
      
      const receipt = await revealTx.wait();

      // Save account info
      this.accountCommitment = this.pendingCommit.commitment;
      this.accountNonce = this.pendingCommit.nonce;
      
      await this.saveAccountInfo();
      this.pendingCommit = null;
      
      // Clear pending commit from storage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pendingCommit');
      }
      
      TradePrivateMonitoring.trackUserAction('account_reveal_success', {
        commitment: this.accountCommitment.toHex()
      });

      return {
        commitment: this.accountCommitment.toHex(),
        success: true,
        txHash: revealTx.hash
      };
    }, {
      shouldRetry: ErrorHandler.isRetryableError
    });
  }

  async withdraw(amount, userAddress) {
    if (!this.accountCommitment) {
      throw new Error('No private account found');
    }

    return ErrorHandler.withRetry(async () => {
      const sanitizedAddress = InputValidator.sanitizeAddress(userAddress);
      const sanitizedAmount = InputValidator.sanitizeAmount(amount);
      const contract = await getContract('TradePrivate', true);
      
      // For now, use mock proof
      console.log('Generating withdrawal proof...');
      const startTime = performance.now();
      
      // TODO: Replace with real proof generation
      const proof = mockProof;
      
      const proofTime = performance.now() - startTime;
      TradePrivateMonitoring.trackProofGeneration('withdrawal', proofTime);

      const parsedAmount = ethers.parseUnits(sanitizedAmount, 6); // USDC decimals
      
      TradePrivateMonitoring.trackUserAction('withdrawal_start', {
        amount: sanitizedAmount
      });
      
      const tx = await contract.withdraw(parsedAmount, proof);
      const receipt = await tx.wait();
      
      TradePrivateMonitoring.trackUserAction('withdrawal_success', {
        amount: sanitizedAmount,
        txHash: tx.hash
      });

      return tx.hash;
    }, {
      shouldRetry: ErrorHandler.isRetryableError
    });
  }

  async getAccountBalance() {
    if (!this.accountCommitment) {
      throw new Error('No account found');
    }

    const contract = await getContract('TradePrivate');
    const balance = await contract.accountBalances(this.accountCommitment.toHex());
    
    return balance;
  }

  // Storage methods
  async saveAccountInfo() {
    const data = {
      commitment: this.accountCommitment.toHex(),
      nonce: this.accountNonce.toString(),
      publicKey: this.keyManager.getTradingPublicKey(),
      createdAt: Date.now()
    };

    if (typeof window !== 'undefined') {
      try {
        // Use IndexedDB for more secure storage
        const { openDB } = await import('idb');
        const db = await openDB('TradePrivate', 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('accounts')) {
              db.createObjectStore('accounts');
            }
          }
        });
        
        await db.put('accounts', data, 'primary');
      } catch (error) {
        console.error('Failed to save account info:', error);
        // Fallback to sessionStorage
        sessionStorage.setItem('tradePrivateAccount', JSON.stringify(data));
      }
    }
  }

  async loadExistingAccount() {
    if (typeof window === 'undefined') return null;

    try {
      // Try IndexedDB first
      const { openDB } = await import('idb');
      const db = await openDB('TradePrivate', 1);
      
      if (db.objectStoreNames.contains('accounts')) {
        const data = await db.get('accounts', 'primary');
        if (data) {
          const { FieldElement } = await import('../crypto/fieldElement.js');
          return {
            commitment: FieldElement.fromHex(data.commitment),
            nonce: BigInt(data.nonce)
          };
        }
      }
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
    }

    // Fallback to sessionStorage
    const stored = sessionStorage.getItem('tradePrivateAccount');
    if (stored) {
      const data = JSON.parse(stored);
      const { FieldElement } = await import('../crypto/fieldElement.js');
      return {
        commitment: FieldElement.fromHex(data.commitment),
        nonce: BigInt(data.nonce)
      };
    }

    return null;
  }

  async savePendingCommit() {
    if (typeof window !== 'undefined') {
      const data = {
        commitment: this.pendingCommit.commitment.toHex(),
        nonce: this.pendingCommit.nonce.toString(),
        commitHash: this.pendingCommit.commitHash,
        blockNumber: this.pendingCommit.blockNumber,
        timestamp: this.pendingCommit.timestamp
      };

      sessionStorage.setItem('pendingCommit', JSON.stringify(data));
    }
  }

  async loadPendingCommit() {
    if (typeof window === 'undefined') return null;

    const stored = sessionStorage.getItem('pendingCommit');
    if (stored) {
      const data = JSON.parse(stored);
      const { FieldElement } = await import('../crypto/fieldElement.js');
      
      this.pendingCommit = {
        commitment: FieldElement.fromHex(data.commitment),
        nonce: BigInt(data.nonce),
        commitHash: data.commitHash,
        blockNumber: data.blockNumber,
        timestamp: data.timestamp
      };
      
      return this.pendingCommit;
    }

    return null;
  }

  generateSecureNonce() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    // Ensure nonce is less than field size
    bytes[0] = bytes[0] & 0x0F;
    return BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
  }

  destroy() {
    this.keyManager.destroy();
    this.accountCommitment = null;
    this.accountNonce = null;
    this.pendingCommit = null;
  }
}

// ===== src/lib/tradeprivate/orderManager.js =====
import {
  CommitmentGenerator,
  NullifierGenerator,
  OrderEncryption
} from '../crypto/index.js';
import { getContract } from '../contracts/index.js';
import { ethers } from 'ethers';
import { ZK_CONFIG, CONSTANTS } from '../config/index.js';
import { ErrorHandler, parseContractError } from '../utils/errors.js';
import { InputValidator } from '../utils/validation.js';
import { TradePrivateMonitoring } from '../utils/monitoring.js';

// Mock ZK proof generator for now
const mockProof = [0, 0, 0, 0, 0, 0, 0, 0].map(n => ethers.toBigInt(n));

export class PrivateOrderManager {
  constructor(accountManager) {
    this.accountManager = accountManager;
    this.pendingOrders = new Map();
    this.orderHistory = [];
  }

  async submitPrivateOrder(orderParams) {
    if (!this.accountManager.accountCommitment) {
      throw new Error('No private account found');
    }

    // Validate order parameters
    InputValidator.validateOrderParams(orderParams);

    return ErrorHandler.withRetry(async () => {
      const contract = await getContract('TradePrivate', true);

      // Generate order commitment and nullifier
      const orderNonce = this.generateOrderNonce();
      const orderData = this.formatOrderData(orderParams);
      
      const orderCommitment = CommitmentGenerator.generateOrderCommitment(
        orderData,
        orderNonce
      );

      const nullifier = NullifierGenerator.generateOrderNullifier(
        this.accountManager.keyManager.privateKey,
        orderCommitment,
        orderNonce
      );

      // Check if nullifier already used
      const isUsed = await NullifierGenerator.isNullifierUsed(contract, nullifier);
      if (isUsed) {
        TradePrivateMonitoring.metrics.nullifierCollisions++;
        throw new Error('Order nullifier already used - please try again');
      }

      // Get keeper's public key for encryption
      const keeperPubKey = await this.getActiveKeeperPublicKey();
      
      // Encrypt order data
      const encryptedOrder = await OrderEncryption.encryptOrder(
        orderData,
        keeperPubKey
      );

      // Ensure encrypted data is correct size
      if (encryptedOrder.length !== ZK_CONFIG.ENCRYPTED_ORDER_SIZE) {
        throw new Error(`Invalid encrypted order size: ${encryptedOrder.length}`);
      }

      // Generate ZK proof
      console.log('Generating order submission proof...');
      const startTime = performance.now();
      
      // TODO: Replace with real proof generation
      const proof = mockProof;
      
      const proofTime = performance.now() - startTime;
      TradePrivateMonitoring.trackProofGeneration('order_submission', proofTime);

      // Submit order
      console.log('Submitting private order...');
      TradePrivateMonitoring.trackUserAction('order_submit_start', {
        orderType: orderParams.orderType,
        isLong: orderParams.isLong
      });
      
      const tx = await contract.submitOrderPrivate(
        proof,
        nullifier,
        this.accountManager.accountCommitment.toHex(),
        orderCommitment.toHex(),
        encryptedOrder
      );

      const receipt = await tx.wait();

      // Store order info locally
      const orderInfo = {
        ...orderParams,
        nullifier,
        commitment: orderCommitment.toHex(),
        submittedAt: Date.now(),
        txHash: tx.hash,
        blockNumber: receipt.blockNumber
      };
      
      this.pendingOrders.set(nullifier, orderInfo);
      await this.saveOrderHistory();
      
      TradePrivateMonitoring.trackUserAction('order_submit_success', {
        nullifier,
        txHash: tx.hash
      });

      return {
        nullifier,
        txHash: tx.hash
      };
    }, {
      shouldRetry: (error) => {
        // Don't retry if nullifier already used
        if (error.message.includes('nullifier')) {
          return false;
        }
        return ErrorHandler.isRetryableError(error);
      }
    });
  }

  formatOrderData(params) {
    const sanitizedSize = InputValidator.sanitizeAmount(params.size);
    const sanitizedPrice = params.price ? InputValidator.sanitizeAmount(params.price) : '0';
    const sanitizedTP = params.tpPrice ? InputValidator.sanitizeAmount(params.tpPrice) : '0';
    const sanitizedSL = params.slPrice ? InputValidator.sanitizeAmount(params.slPrice) : '0';

    return {
      market: InputValidator.sanitizeAddress(params.market),
      size: ethers.parseUnits(sanitizedSize, 6).toString(), // USDC decimals
      price: ethers.parseUnits(sanitizedPrice, 18).toString(),
      isLong: Boolean(params.isLong),
      isReduceOnly: Boolean(params.isReduceOnly),
      orderType: params.orderType || 0,
      leverage: Math.min(CONSTANTS.MAX_LEVERAGE, params.leverage || 1),
      tpPrice: ethers.parseUnits(sanitizedTP, 18).toString(),
      slPrice: ethers.parseUnits(sanitizedSL, 18).toString()
    };
  }

  async getActiveKeeperPublicKey() {
    const contract = await getContract('TradePrivate');
    
    // Get active keeper addresses
    const keeperCount = await contract.activeKeeperList.length;
    if (keeperCount === 0) {
      throw new Error('No active keepers available');
    }

    // Get all keeper addresses
    const keeperPromises = [];
    for (let i = 0; i < Math.min(10, keeperCount); i++) {
      keeperPromises.push(contract.activeKeeperList(i));
    }
    const keeperAddresses = await Promise.all(keeperPromises);

    // Get keeper details and select best one
    let bestKeeper = null;
    let bestScore = 0;

    for (const address of keeperAddresses) {
      try {
        const keeper = await contract.keepers(address);
        
        if (!keeper.isActive || keeper.isSlashed) continue;
        
        // Calculate score based on reputation and success rate
        const totalBatches = Number(keeper.successfulBatches) + Number(keeper.failedBatches);
        const successRate = totalBatches > 0 
          ? Number(keeper.successfulBatches) / totalBatches 
          : 0.5;
        
        const score = Number(keeper.reputationScore) * successRate;
        
        if (score > bestScore) {
          bestScore = score;
          bestKeeper = {
            address,
            publicKey: keeper.publicKey,
            score
          };
        }
      } catch (error) {
        console.error(`Failed to get keeper ${address}:`, error);
        TradePrivateMonitoring.trackKeeperFailure(address, 'fetch_failed');
      }
    }

    if (!bestKeeper) {
      throw new Error('No suitable keeper found');
    }

    console.log(`Selected keeper ${bestKeeper.address} with score ${bestScore}`);
    return bestKeeper.publicKey;
  }

  generateOrderNonce() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    // Ensure nonce is less than field size
    bytes[0] = bytes[0] & 0x0F;
    return BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
  }

  async saveOrderHistory() {
    const orders = Array.from(this.pendingOrders.values());
    if (typeof window !== 'undefined') {
      try {
        const { openDB } = await import('idb');
        const db = await openDB('TradePrivate', 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('orders')) {
              db.createObjectStore('orders');
            }
          }
        });
        
        await db.put('orders', orders, 'history');
      } catch (error) {
        console.error('Failed to save order history:', error);
        sessionStorage.setItem('privateOrderHistory', JSON.stringify(orders));
      }
    }
  }

  async loadOrderHistory() {
    if (typeof window === 'undefined') return;

    try {
      const { openDB } = await import('idb');
      const db = await openDB('TradePrivate', 1);
      
      if (db.objectStoreNames.contains('orders')) {
        const orders = await db.get('orders', 'history');
        if (orders) {
          orders.forEach(order => {
            this.pendingOrders.set(order.nullifier, order);
          });
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
    }

    // Fallback to sessionStorage
    const stored = sessionStorage.getItem('privateOrderHistory');
    if (stored) {
      const orders = JSON.parse(stored);
      orders.forEach(order => {
        this.pendingOrders.set(order.nullifier, order);
      });
    }
  }

  async getOrderStatus(nullifier) {
    InputValidator.validateNullifier(nullifier);
    
    const contract = await getContract('TradePrivate');
    
    // Check if nullifier is used
    const isUsed = await contract.usedNullifiers(nullifier);
    
    // Check if order is still valid
    let isValid = false;
    try {
      isValid = await contract.isOrderValid(nullifier);
    } catch {
      // Order might not exist
    }

    return {
      executed: isUsed && !isValid,
      pending: !isUsed && isValid,
      expired: !isUsed && !isValid,
      unknown: !this.pendingOrders.has(nullifier)
    };
  }

  getPendingOrders() {
    return Array.from(this.pendingOrders.values())
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }

  clearOrderHistory() {
    this.pendingOrders.clear();
    this.saveOrderHistory();
  }
}