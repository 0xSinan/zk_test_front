import { FieldElement } from './fieldElement.js';
import { keccak256 } from 'js-sha3';

/**
 * Commitment Generator for TradePrivate
 * Handles generation of cryptographic commitments for accounts and orders
 */
export class CommitmentGenerator {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Generate account commitment
   * commitment = hash(privateKey, nonce)
   */
  static generateAccountCommitment(privateKey, nonce) {
    const privKeyElement = privateKey instanceof FieldElement ? privateKey : new FieldElement(privateKey);
    const nonceElement = nonce instanceof FieldElement ? nonce : new FieldElement(nonce);
    
    // Simple commitment: hash(privKey + nonce)
    const combined = privKeyElement.add(nonceElement);
    const commitment = combined.mul(new FieldElement(7n)); // Multiply by generator
    
    return commitment;
  }

  /**
   * Generate order commitment
   * commitment = hash(orderData, nonce)
   */
  static generateOrderCommitment(orderData, nonce) {
    const nonceElement = nonce instanceof FieldElement ? nonce : new FieldElement(nonce);
    
    // Serialize order data
    const serialized = this.serializeOrderData(orderData);
    const dataHash = this.hashOrderData(serialized);
    
    // Combine with nonce
    const commitment = dataHash.add(nonceElement);
    
    return commitment;
  }

  /**
   * Generate commit hash for commit-reveal scheme
   * commitHash = keccak256(commitment, nonce, address) - must match Solidity contract
   */
  static generateCommitHash(commitment, nonce, address) {
    // Convert commitment to bytes32 (remove 0x prefix if present)
    const commitmentHex = commitment instanceof FieldElement ? commitment.toHex().slice(2) : commitment.toString(16).padStart(64, '0');
    
    // Convert nonce to bytes32  
    const nonceHex = typeof nonce === 'bigint' ? nonce.toString(16).padStart(64, '0') : BigInt(nonce).toString(16).padStart(64, '0');
    
    // Convert address to bytes (remove 0x prefix)
    const addressHex = address.startsWith('0x') ? address.slice(2) : address;
    
    // Concatenate all parameters as hex (this matches abi.encodePacked in Solidity)
    const packedHex = commitmentHex + nonceHex + addressHex.padStart(40, '0');
    
    // Convert hex to bytes for keccak256
    const bytes = new Uint8Array(packedHex.length / 2);
    for (let i = 0; i < packedHex.length; i += 2) {
      bytes[i / 2] = parseInt(packedHex.slice(i, i + 2), 16);
    }
    
    // Use proper keccak256 (matches Solidity)
    return '0x' + keccak256(bytes);
  }
  
  /**
   * Serialize order data for hashing
   */
  static serializeOrderData(orderData) {
    const parts = [
      orderData.market || '0x0',
      orderData.size || '0',
      orderData.price || '0',
      orderData.orderType || 0,
      orderData.isLong ? 1 : 0,
      orderData.leverage || 1,
      orderData.tpPrice || '0',
      orderData.slPrice || '0'
    ];
    
    return parts.join('|');
  }

  /**
   * Hash order data string
   */
  static hashOrderData(data) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    
    let hash = new FieldElement(1n);
    for (let i = 0; i < bytes.length; i++) {
      hash = hash.mul(new FieldElement(31n)).add(new FieldElement(BigInt(bytes[i])));
    }
    
    return hash;
  }

  /**
   * Convert nonce to bytes
   */
  static nonceToBytes(nonce) {
    return this.bigintToBytes32(BigInt(nonce));
  }

  static bigintToBytes32(value) {
    const bytes = new Uint8Array(32);
    let bigintValue = BigInt(value);
    
    for (let i = 31; i >= 0; i--) {
      bytes[i] = Number(bigintValue & 0xFFn);
      bigintValue >>= 8n;
    }
    
    return bytes;
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
   * Generate salt for commitments
   */
  generateSalt() {
    return FieldElement.random().value;
  }

  /**
   * Create commitment with salt
   */
  createCommitment(value, salt = null) {
    if (salt === null) {
      salt = this.generateSalt();
    }
    
    const valueHash = this.hashValue(value);
    const saltElement = new FieldElement(salt);
    const commitment = valueHash.add(saltElement);
    
    return {
      commitment: commitment.toHex(),
      salt: salt.toString(),
      value: value
    };
  }

  /**
   * Verify commitment
   */
  verifyCommitment(commitment, value, salt) {
    const expected = this.createCommitment(value, BigInt(salt));
    return expected.commitment === commitment;
  }

  /**
   * Create account commitment from public key and balance
   */
  createAccountCommitment(publicKey, balance) {
    const pubKeyHash = this.hashValue(publicKey);
    const balanceElement = new FieldElement(BigInt(balance));
    const commitment = pubKeyHash.add(balanceElement);
    
    return {
      commitment: commitment.toHex(),
      publicKey,
      balance
    };
  }

  /**
   * Create order commitment from order data
   */
  createOrderCommitment(orderData) {
    const serialized = CommitmentGenerator.serializeOrderData(orderData);
    const hash = CommitmentGenerator.hashOrderData(serialized);
    
    return {
      commitment: hash.toHex(),
      orderData
    };
  }

  /**
   * Create merkle commitment from array
   */
  createMerkleCommitment(commitments) {
    if (!Array.isArray(commitments) || commitments.length === 0) {
      return '0';
    }
    
    let tree = commitments.map(c => new FieldElement(c));
    
    while (tree.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < tree.length; i += 2) {
        if (i + 1 < tree.length) {
          const combined = tree[i].add(tree[i + 1]);
          nextLevel.push(combined);
        } else {
          nextLevel.push(tree[i]);
        }
      }
      tree = nextLevel;
    }
    
    return tree[0].toHex();
  }

  /**
   * Hash any value to field element
   */
  hashValue(value) {
    const encoder = new TextEncoder();
    let bytes;
    
    if (typeof value === 'string') {
      bytes = encoder.encode(value);
    } else if (value instanceof Uint8Array) {
      bytes = value;
    } else {
      bytes = encoder.encode(JSON.stringify(value));
    }
    
    let hash = new FieldElement(1n);
    for (let i = 0; i < bytes.length; i++) {
      hash = hash.mul(new FieldElement(31n)).add(new FieldElement(BigInt(bytes[i])));
    }
    
    return hash;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
} 