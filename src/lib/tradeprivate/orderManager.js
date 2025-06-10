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
const mockOrderProof = [0, 0, 0, 0, 0, 0, 0, 0].map(n => ethers.toBigInt(n));

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
      const proof = mockOrderProof;
      
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