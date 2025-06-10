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
const mockAccountProof = [0, 0, 0, 0, 0, 0, 0, 0].map(n => ethers.toBigInt(n));

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
      const proof = mockAccountProof;
      
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
      const proof = mockAccountProof;
      
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