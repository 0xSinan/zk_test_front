import { FieldElement } from './fieldElement.js';
import { ZK_CONFIG } from '../config/zkConfig.js';

/**
 * Nullifier Generator for TradePrivate
 * Handles generation and validation of nullifiers to prevent double-spending
 */
export class NullifierGenerator {
  /**
   * Generate order nullifier
   * nullifier = hash(privateKey, orderCommitment, nonce)
   */
  static generateOrderNullifier(privateKey, orderCommitment, nonce) {
    const privKeyElement = privateKey instanceof FieldElement ? privateKey : new FieldElement(privateKey);
    const commitElement = orderCommitment instanceof FieldElement ? orderCommitment : new FieldElement(orderCommitment.value || orderCommitment);
    const nonceElement = nonce instanceof FieldElement ? nonce : new FieldElement(nonce);
    
    // Combine all elements
    const combined = privKeyElement
      .add(commitElement.mul(new FieldElement(2n)))
      .add(nonceElement.mul(new FieldElement(3n)));
    
    return combined.toHex();
  }

  /**
   * Generate account nullifier for withdrawals
   * nullifier = hash(privateKey, amount, recipient, nonce)
   */
  static generateAccountNullifier(privateKey, amount, recipient, nonce) {
    const privKeyElement = privateKey instanceof FieldElement ? privateKey : new FieldElement(privateKey);
    const amountElement = new FieldElement(BigInt(amount));
    const recipientElement = this.addressToFieldElement(recipient);
    const nonceElement = nonce instanceof FieldElement ? nonce : new FieldElement(nonce);
    
    // Combine elements
    const combined = privKeyElement
      .add(amountElement.mul(new FieldElement(5n)))
      .add(recipientElement.mul(new FieldElement(7n)))
      .add(nonceElement.mul(new FieldElement(11n)));
    
    return combined.toHex();
  }

  /**
   * Generate batch nullifier
   * nullifier = hash(batchHash, keeperKey, timestamp)
   */
  static generateBatchNullifier(batchHash, keeperKey, timestamp) {
    const batchElement = new FieldElement(BigInt(batchHash));
    const keeperElement = this.addressToFieldElement(keeperKey);
    const timestampElement = new FieldElement(BigInt(timestamp));
    
    const combined = batchElement
      .add(keeperElement.mul(new FieldElement(13n)))
      .add(timestampElement.mul(new FieldElement(17n)));
    
    return combined.toHex();
  }

  /**
   * Check if nullifier is already used
   */
  static async isNullifierUsed(contract, nullifier) {
    try {
      return await contract.usedNullifiers(nullifier);
    } catch (error) {
      console.error('Error checking nullifier:', error);
      return false;
    }
  }

  /**
   * Generate deterministic nullifier from secret and context
   */
  static generateDeterministicNullifier(secret, context) {
    const secretElement = secret instanceof FieldElement ? secret : new FieldElement(secret);
    const contextHash = this.hashString(context);
    
    const nullifier = secretElement.mul(new FieldElement(contextHash));
    return nullifier.toHex();
  }

  /**
   * Validate nullifier format
   */
  static validateNullifier(nullifier) {
    if (typeof nullifier !== 'string') {
      throw new Error('Nullifier must be a string');
    }
    
    if (!nullifier.startsWith('0x')) {
      throw new Error('Nullifier must start with 0x');
    }
    
    if (nullifier.length !== 66) { // 0x + 64 hex chars
      throw new Error('Nullifier must be 32 bytes (64 hex chars)');
    }
    
    if (!/^0x[0-9a-fA-F]{64}$/.test(nullifier)) {
      throw new Error('Nullifier contains invalid characters');
    }
    
    // Check if it's a valid field element
    const value = BigInt(nullifier);
    if (value >= ZK_CONFIG.FIELD_SIZE) {
      throw new Error('Nullifier exceeds field size');
    }
    
    return true;
  }

  /**
   * Convert Ethereum address to field element
   */
  static addressToFieldElement(address) {
    if (typeof address !== 'string' || !address.startsWith('0x')) {
      throw new Error('Invalid address format');
    }
    
    // Take last 20 bytes of address
    const addressBytes = this.hexToBytes(address.slice(2));
    return FieldElement.fromBytes(addressBytes);
  }

  /**
   * Convert hex string to bytes
   */
  static hexToBytes(hex) {
    if (hex.startsWith('0x')) {
      hex = hex.slice(2);
    }
    
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    
    return bytes;
  }

  /**
   * Hash string to field element
   */
  static hashString(input) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);
    
    let hash = 0n;
    for (let i = 0; i < bytes.length; i++) {
      hash = (hash * 31n + BigInt(bytes[i])) % ZK_CONFIG.FIELD_SIZE;
    }
    
    return hash;
  }

  /**
   * Generate secure random nonce for nullifier
   */
  static generateNonce() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    // Ensure it's less than field size
    bytes[0] = bytes[0] & 0x0F;
    return BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
  }

  /**
   * Batch validate multiple nullifiers
   */
  static validateNullifiers(nullifiers) {
    const errors = [];
    
    for (let i = 0; i < nullifiers.length; i++) {
      try {
        this.validateNullifier(nullifiers[i]);
      } catch (error) {
        errors.push(`Nullifier ${i}: ${error.message}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Invalid nullifiers: ${errors.join(', ')}`);
    }
    
    // Check for duplicates
    const uniqueNullifiers = new Set(nullifiers);
    if (uniqueNullifiers.size !== nullifiers.length) {
      throw new Error('Duplicate nullifiers detected');
    }
    
    return true;
  }

  /**
   * Check multiple nullifiers usage
   */
  static async areNullifiersUsed(contract, nullifiers) {
    try {
      const promises = nullifiers.map(nullifier => 
        contract.usedNullifiers(nullifier)
      );
      
      const results = await Promise.all(promises);
      
      return nullifiers.map((nullifier, index) => ({
        nullifier,
        isUsed: results[index]
      }));
    } catch (error) {
      console.error('Error checking multiple nullifiers:', error);
      throw error;
    }
  }

  /**
   * Create nullifier proof metadata
   */
  static createNullifierMetadata(nullifier, context) {
    return {
      nullifier,
      context,
      timestamp: Date.now(),
      version: '1.0'
    };
  }
} 