import { FieldElement } from './fieldElement.js';
import { CONSTANTS } from '../config/constants.js';

/**
 * Private Key Manager for TradePrivate
 * Handles generation, storage, and management of private keys
 */
export class PrivateKeyManager {
  constructor() {
    this.privateKey = null;
    this.tradingPublicKey = null;
    this.encryptionKeys = null;
  }

  async initialize() {
    // Try to load existing keys
    const existing = await this.loadFromSecureStorage();
    
    if (!existing) {
      // Generate new keys if none exist
      await this.generateNewKeys();
    } else {
      this.privateKey = existing.privateKey;
      this.tradingPublicKey = existing.tradingPublicKey;
      this.encryptionKeys = existing.encryptionKeys;
    }
    
    // Validate loaded keys
    this.validateKeys();
  }

  async generateNewKeys() {
    console.log('Generating new private keys...');
    
    // Generate main private key (32 bytes)
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    
    // Ensure it's a valid secp256k1 private key
    keyBytes[0] = keyBytes[0] & 0x7F; // Ensure it's less than curve order
    
    this.privateKey = FieldElement.fromBytes(keyBytes);
    
    // Derive trading public key (using elliptic curve point multiplication)
    this.tradingPublicKey = await this.derivePublicKey(this.privateKey);
    
    // Generate encryption key pair for ECDH
    this.encryptionKeys = await this.generateEncryptionKeys();
    
    // Save to secure storage
    await this.saveToSecureStorage();
    
    console.log('Private keys generated and saved');
  }

  async derivePublicKey(privateKey) {
    // For now, use a simple derivation
    // In production, use proper secp256k1 point multiplication
    const derived = privateKey.mul(new FieldElement(3n)); // G * private_key
    return derived.toHex();
  }

  async generateEncryptionKeys() {
    try {
      // Generate ECDH key pair for order encryption
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256' // Could use secp256k1 if available
        },
        true, // extractable
        ['deriveKey']
      );
      
      // Export public key for sharing with keepers
      const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
      
      return {
        privateKey: keyPair.privateKey,
        publicKey: new Uint8Array(publicKeyBuffer),
        publicKeyHex: Array.from(new Uint8Array(publicKeyBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      };
    } catch (error) {
      console.warn('Web Crypto not available, using fallback');
      
      // Fallback: generate random bytes
      const privateKeyBytes = new Uint8Array(32);
      const publicKeyBytes = new Uint8Array(64);
      crypto.getRandomValues(privateKeyBytes);
      crypto.getRandomValues(publicKeyBytes);
      
      return {
        privateKey: privateKeyBytes,
        publicKey: publicKeyBytes,
        publicKeyHex: Array.from(publicKeyBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      };
    }
  }

  isValidPrivateKey(key) {
    if (!key) return false;
    return key instanceof FieldElement && !key.isZero();
  }

  async saveToSecureStorage() {
    const data = {
      privateKey: this.privateKey.toHex(),
      tradingPublicKey: this.tradingPublicKey,
      encryptionKeys: {
        publicKeyHex: this.encryptionKeys.publicKeyHex
      },
      createdAt: Date.now(),
      version: '1.0'
    };

    if (typeof window !== 'undefined') {
      try {
        // Use IndexedDB for more secure storage
        const { openDB } = await import('idb');
        const db = await openDB('TradePrivateKeys', 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('keys')) {
              db.createObjectStore('keys');
            }
          }
        });
        
        await db.put('keys', data, 'main');
        console.log('Keys saved to IndexedDB');
      } catch (error) {
        console.error('Failed to save to IndexedDB:', error);
        // Fallback to sessionStorage (less secure)
        sessionStorage.setItem(CONSTANTS.STORAGE_KEYS.ACCOUNT_DATA, JSON.stringify(data));
      }
    }
  }

  async loadFromSecureStorage() {
    if (typeof window === 'undefined') return null;

    try {
      // Try IndexedDB first
      const { openDB } = await import('idb');
      const db = await openDB('TradePrivateKeys', 1);
      
      if (db.objectStoreNames.contains('keys')) {
        const data = await db.get('keys', 'main');
        if (data) {
          return {
            privateKey: FieldElement.fromHex(data.privateKey),
            tradingPublicKey: data.tradingPublicKey,
            encryptionKeys: data.encryptionKeys
          };
        }
      }
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
    }

    // Fallback to sessionStorage
    const stored = sessionStorage.getItem(CONSTANTS.STORAGE_KEYS.ACCOUNT_DATA);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        privateKey: FieldElement.fromHex(data.privateKey),
        tradingPublicKey: data.tradingPublicKey,
        encryptionKeys: data.encryptionKeys
      };
    }

    return null;
  }

  validateKeys() {
    if (!this.isValidPrivateKey(this.privateKey)) {
      throw new Error('Invalid private key');
    }
    
    if (!this.tradingPublicKey || typeof this.tradingPublicKey !== 'string') {
      throw new Error('Invalid trading public key');
    }
    
    if (!this.encryptionKeys || !this.encryptionKeys.publicKeyHex) {
      throw new Error('Invalid encryption keys');
    }
  }

  getTradingPublicKey() {
    return this.tradingPublicKey;
  }

  getPublicKey() {
    return this.encryptionKeys?.publicKeyHex;
  }

  async signMessage(message) {
    if (!this.privateKey) {
      throw new Error('No private key available');
    }
    
    // Simple signature using field arithmetic
    // In production, use proper ECDSA signing
    const messageHash = this.hashMessage(message);
    const signature = this.privateKey.mul(messageHash);
    
    return signature.toHex();
  }

  hashMessage(message) {
    // Simple hash for demo - use proper hash function in production
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    let hash = 0n;
    for (let i = 0; i < data.length; i++) {
      hash = (hash * 31n + BigInt(data[i])) % FieldElement.FIELD_SIZE;
    }
    
    return new FieldElement(hash);
  }

  destroy() {
    // Clear sensitive data from memory
    this.privateKey = null;
    this.tradingPublicKey = null;
    this.encryptionKeys = null;
    
    // Clear from storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACCOUNT_DATA);
    }
  }

  // Static helper methods
  static generateRandomFieldElement() {
    return FieldElement.random();
  }

  static isValidPublicKey(pubKey) {
    if (typeof pubKey !== 'string') return false;
    if (!pubKey.match(/^[0-9a-fA-F]+$/)) return false;
    return pubKey.length === 128 || pubKey.length === 130; // Uncompressed point
  }
}

// Singleton instance
let privateKeyManager = null;

/**
 * Get singleton instance
 */
export function getPrivateKeyManager() {
  if (!privateKeyManager) {
    privateKeyManager = new PrivateKeyManager();
  }
  return privateKeyManager;
}

/**
 * Convenient wrapper functions
 */
export function generatePrivateKey() {
  return getPrivateKeyManager().generatePrivateKey();
}

export function derivePublicKey(privateKey) {
  return getPrivateKeyManager().derivePublicKey(privateKey);
}

export function signMessage(message) {
  return getPrivateKeyManager().signMessage(message);
}

/**
 * Secure storage utilities
 */
export const secureStorage = {
  async store(key, data, password) {
    const manager = getPrivateKeyManager();
    const salt = getRandomBytes(32);
    const derivedKey = await manager.deriveKey(password, salt);
    const encrypted = await manager.encrypt(data, derivedKey);
    
    const storageData = {
      encrypted,
      salt: Array.from(salt),
      timestamp: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(storageData));
  },

  async retrieve(key, password) {
    const storageData = localStorage.getItem(key);
    if (!storageData) {
      throw new Error('Data not found');
    }

    const { encrypted, salt } = JSON.parse(storageData);
    const manager = getPrivateKeyManager();
    const derivedKey = await manager.deriveKey(password, salt);
    
    return await manager.decrypt(encrypted, derivedKey);
  },

  remove(key) {
    localStorage.removeItem(key);
  }
};

export default PrivateKeyManager; 