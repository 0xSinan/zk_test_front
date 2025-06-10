import { FieldElement } from './fieldElement.js';
import { CONSTANTS } from '../config/constants.js';
import { HDWallet, getHDWallet } from './hdKeyDerivation.js';

/**
 * Enhanced Private Key Manager with HD Wallet support
 * Now supports BIP32/BIP44 hierarchical deterministic key derivation
 */
export class PrivateKeyManager {
  constructor() {
    this.privateKey = null;
    this.tradingPublicKey = null;
    this.encryptionKeys = null;
    this.hdWallet = getHDWallet();
    this.accountIndex = 0;
    this.isHDMode = false;
  }

  async initialize() {
    console.log('🔑 Initializing Private Key Manager...');
    
    // Try to load existing HD wallet first
    const hdLoaded = await this.tryLoadHDWallet();
    
    if (hdLoaded) {
      console.log('✅ HD wallet loaded successfully');
      return;
    }
    
    // Try to load legacy keys
    const legacyLoaded = await this.loadFromSecureStorage();
    
    if (!legacyLoaded) {
      // No existing keys - will generate new HD wallet when needed
      console.log('💡 No existing keys found. Ready to generate HD wallet.');
      return;
    }
    
    // Legacy keys loaded
    console.log('⚠️ Legacy keys loaded. Consider migrating to HD wallet.');
    this.validateKeys();
  }

  /**
   * Generate new HD wallet with mnemonic phrase
   */
  async generateHDWallet(password) {
    console.log('🆕 Generating new HD wallet...');
    
    try {
      // Generate HD wallet
      const { mnemonic, seedHash } = await this.hdWallet.generateFromEntropy();
      
      // Derive first account
      await this.hdWallet.deriveAccount(0);
      
      // Get trading keys for this account
      const tradingKeys = this.hdWallet.getTradingKeys(0);
      
      // Set current keys
      this.privateKey = tradingKeys.privateKey;
      this.tradingPublicKey = tradingKeys.publicKey;
      this.accountIndex = 0;
      this.isHDMode = true;
      
      // Generate encryption keys
      this.encryptionKeys = await this.generateEncryptionKeys();
      
      // Save HD wallet with password
      await this.hdWallet.saveToStorage(password);
      
      // Save metadata
      await this.saveHDMetadata();
      
      console.log('✅ HD wallet generated successfully');
      
      return {
        mnemonic,
        seedHash,
        account: {
          index: 0,
          address: tradingKeys.address,
          path: tradingKeys.path
        }
      };
    } catch (error) {
      console.error('Failed to generate HD wallet:', error);
      throw new Error(`HD wallet generation failed: ${error.message}`);
    }
  }

  /**
   * Restore HD wallet from mnemonic phrase
   */
  async restoreHDWallet(mnemonic, password, accountIndex = 0) {
    console.log('🔄 Restoring HD wallet from mnemonic...');
    
    try {
      // Restore from mnemonic
      await this.hdWallet.restoreFromMnemonic(mnemonic);
      
      // Derive specified account
      await this.hdWallet.deriveAccount(accountIndex);
      
      // Get trading keys
      const tradingKeys = this.hdWallet.getTradingKeys(accountIndex);
      
      // Set current keys
      this.privateKey = tradingKeys.privateKey;
      this.tradingPublicKey = tradingKeys.publicKey;
      this.accountIndex = accountIndex;
      this.isHDMode = true;
      
      // Generate encryption keys
      this.encryptionKeys = await this.generateEncryptionKeys();
      
      // Save HD wallet with password
      await this.hdWallet.saveToStorage(password);
      
      // Save metadata
      await this.saveHDMetadata();
      
      console.log('✅ HD wallet restored successfully');
      
      return {
        account: {
          index: accountIndex,
          address: tradingKeys.address,
          path: tradingKeys.path
        },
        seedHash: await this.hdWallet.getSeedHash()
      };
    } catch (error) {
      console.error('Failed to restore HD wallet:', error);
      throw new Error(`HD wallet restoration failed: ${error.message}`);
    }
  }

  /**
   * Switch to different account in HD wallet
   */
  async switchAccount(accountIndex, password) {
    if (!this.isHDMode) {
      throw new Error('Not in HD mode. Cannot switch accounts.');
    }
    
    console.log(`🔄 Switching to account ${accountIndex}...`);
    
    // Load HD wallet if not already loaded
    if (!this.hdWallet.initialized) {
      const loaded = await this.hdWallet.loadFromStorage(password);
      if (!loaded) {
        throw new Error('Failed to load HD wallet');
      }
    }
    
    // Derive account if not already derived
    let account = this.hdWallet.accounts.get(accountIndex);
    if (!account) {
      await this.hdWallet.deriveAccount(accountIndex);
    }
    
    // Get trading keys
    const tradingKeys = this.hdWallet.getTradingKeys(accountIndex);
    
    // Update current keys
    this.privateKey = tradingKeys.privateKey;
    this.tradingPublicKey = tradingKeys.publicKey;
    this.accountIndex = accountIndex;
    
    // Update metadata
    await this.saveHDMetadata();
    
    console.log(`✅ Switched to account ${accountIndex}`);
    
    return {
      index: accountIndex,
      address: tradingKeys.address,
      path: tradingKeys.path
    };
  }

  /**
   * Get all derived accounts
   */
  getAllAccounts() {
    if (!this.isHDMode) {
      return [];
    }
    
    const accounts = [];
    for (const [index, account] of this.hdWallet.accounts) {
      const tradingKeys = this.hdWallet.getTradingKeys(index);
      accounts.push({
        index,
        address: tradingKeys.address,
        path: tradingKeys.path,
        isCurrent: index === this.accountIndex
      });
    }
    
    return accounts;
  }

  /**
   * Generate multiple accounts for the HD wallet
   */
  async generateAccounts(count = 5, password) {
    if (!this.isHDMode) {
      throw new Error('Not in HD mode');
    }
    
    console.log(`🔑 Generating ${count} accounts...`);
    
    // Ensure HD wallet is loaded
    if (!this.hdWallet.initialized) {
      const loaded = await this.hdWallet.loadFromStorage(password);
      if (!loaded) {
        throw new Error('Failed to load HD wallet');
      }
    }
    
    const accounts = [];
    
    for (let i = 0; i < count; i++) {
      if (!this.hdWallet.accounts.has(i)) {
        await this.hdWallet.deriveAccount(i);
      }
      
      const tradingKeys = this.hdWallet.getTradingKeys(i);
      accounts.push({
        index: i,
        address: tradingKeys.address,
        path: tradingKeys.path
      });
    }
    
    console.log(`✅ ${count} accounts ready`);
    return accounts;
  }

  /**
   * Legacy method: Generate single keys (deprecated)
   */
  async generateNewKeys() {
    console.log('⚠️ Generating legacy keys (deprecated - use HD wallet instead)');
    
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
    
    this.isHDMode = false;
    
    console.log('✅ Legacy keys generated and saved');
  }

  /**
   * Try to load HD wallet from storage
   */
  async tryLoadHDWallet() {
    try {
      const { openDB } = await import('idb');
      const db = await openDB('TradePrivateHD', 1);
      
      if (!db.objectStoreNames.contains('wallet')) {
        return false;
      }
      
      const metadata = await db.get('wallet', 'metadata');
      if (!metadata) {
        return false;
      }
      
      console.log('📋 HD wallet metadata found');
      
      // Set mode
      this.isHDMode = metadata.isHDMode;
      this.accountIndex = metadata.accountIndex || 0;
      
      return true;
    } catch (error) {
      console.log('No HD wallet metadata found');
      return false;
    }
  }

  /**
   * Save HD wallet metadata
   */
  async saveHDMetadata() {
    const { openDB } = await import('idb');
    const db = await openDB('TradePrivateHD', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('wallet')) {
          db.createObjectStore('wallet');
        }
      }
    });
    
    const metadata = {
      isHDMode: this.isHDMode,
      accountIndex: this.accountIndex,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    await db.put('wallet', metadata, 'metadata');
  }

  /**
   * Migrate from legacy keys to HD wallet
   */
  async migrateToHD(password) {
    if (this.isHDMode) {
      throw new Error('Already using HD wallet');
    }
    
    if (!this.privateKey) {
      throw new Error('No legacy keys to migrate');
    }
    
    console.log('🔄 Migrating to HD wallet...');
    
    // Backup current keys
    const legacyPrivateKey = this.privateKey;
    const legacyPublicKey = this.tradingPublicKey;
    
    try {
      // Generate new HD wallet
      const hdResult = await this.generateHDWallet(password);
      
      console.log('⚠️ Migration complete. Legacy keys backed up.');
      console.log('🔑 New HD wallet mnemonic (SAVE THIS):');
      console.log(hdResult.mnemonic);
      
      return {
        ...hdResult,
        migrated: true,
        legacyBackup: {
          privateKey: legacyPrivateKey.toHex(),
          publicKey: legacyPublicKey
        }
      };
    } catch (error) {
      // Restore legacy keys on failure
      this.privateKey = legacyPrivateKey;
      this.tradingPublicKey = legacyPublicKey;
      this.isHDMode = false;
      
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Get wallet status and information
   */
  getWalletInfo() {
    const info = {
      isHDMode: this.isHDMode,
      hasKeys: !!this.privateKey,
      initialized: this.hdWallet?.initialized || false
    };
    
    if (this.isHDMode) {
      info.currentAccount = this.accountIndex;
      info.totalAccounts = this.hdWallet.accounts.size;
      info.accounts = this.getAllAccounts();
    }
    
    return info;
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
    if (this.isHDMode) {
      // HD mode uses different storage
      return;
    }
    
    const data = {
      privateKey: this.privateKey.toHex(),
      tradingPublicKey: this.tradingPublicKey,
      encryptionKeys: {
        publicKeyHex: this.encryptionKeys.publicKeyHex
      },
      createdAt: Date.now(),
      version: '1.0',
      type: 'legacy'
    };

    if (typeof window !== 'undefined') {
      try {
        // ONLY use IndexedDB for secure storage - NEVER sessionStorage for private keys
        const { openDB } = await import('idb');
        const db = await openDB('TradePrivateKeys', 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('keys')) {
              db.createObjectStore('keys');
            }
          }
        });
        
        // Encrypt data before storage
        const encryptedData = await this.encryptForStorage(data);
        await db.put('keys', encryptedData, 'main');
        console.log('Keys saved securely to IndexedDB');
      } catch (error) {
        console.error('Failed to save to IndexedDB:', error);
        throw new Error('Cannot securely store private keys. Private key storage failed.');
      }
    }
  }

  async loadFromSecureStorage() {
    if (typeof window === 'undefined') return null;

    try {
      // ONLY load from IndexedDB - no fallback to sessionStorage
      const { openDB } = await import('idb');
      const db = await openDB('TradePrivateKeys', 1);
      
      if (db.objectStoreNames.contains('keys')) {
        const encryptedData = await db.get('keys', 'main');
        if (encryptedData) {
          const data = await this.decryptFromStorage(encryptedData);
          
          // Check if this is legacy data
          if (data.type === 'legacy' || !data.type) {
            this.privateKey = FieldElement.fromHex(data.privateKey);
            this.tradingPublicKey = data.tradingPublicKey;
            this.encryptionKeys = data.encryptionKeys;
            this.isHDMode = false;
            return true;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
      throw new Error('Failed to load private keys securely');
    }

    return false;
  }

  async encryptForStorage(data) {
    // Derive encryption key from browser's crypto API
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(navigator.userAgent + Date.now()),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encodedData
    );

    return {
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
      salt: Array.from(salt)
    };
  }

  async decryptFromStorage(encryptedData) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(navigator.userAgent + Date.now()),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(encryptedData.salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
      key,
      new Uint8Array(encryptedData.encrypted)
    );

    const jsonString = new TextDecoder().decode(decrypted);
    return JSON.parse(jsonString);
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
    this.accountIndex = 0;
    this.isHDMode = false;
    
    // Clear HD wallet
    this.hdWallet.destroy();
    
    console.log('🧹 Private key manager cleared');
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