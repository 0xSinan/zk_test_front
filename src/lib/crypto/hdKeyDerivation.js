import { FieldElement } from './fieldElement.js';
import { CONSTANTS } from '../config/constants.js';

/**
 * HD Key Derivation following BIP32/BIP44 standards
 * Provides hierarchical deterministic key generation for TradePrivate
 */

// BIP39 word list (first 100 words for demo - full list would be 2048 words)
const BIP39_WORDLIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'against', 'age',
  'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm',
  'album', 'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost',
  'alone', 'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing',
  'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle',
  'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna',
  'antique', 'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve',
  'april', 'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed',
  'armor', 'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art'
];

/**
 * HD Wallet class implementing BIP32/BIP44
 */
export class HDWallet {
  constructor() {
    this.seed = null;
    this.masterKey = null;
    this.accounts = new Map();
    this.currentAccountIndex = 0;
    this.initialized = false;
  }

  /**
   * Generate new HD wallet from entropy
   */
  async generateFromEntropy(entropyBits = 256) {
    console.log('🔑 Generating HD wallet from entropy...');
    
    // Generate cryptographically secure entropy
    const entropyBytes = new Uint8Array(entropyBits / 8);
    crypto.getRandomValues(entropyBytes);
    
    // Generate mnemonic from entropy
    const mnemonic = this.entropyToMnemonic(entropyBytes);
    
    // Derive seed from mnemonic
    await this.seedFromMnemonic(mnemonic);
    
    console.log('✅ HD wallet generated successfully');
    return {
      mnemonic,
      seedHash: await this.getSeedHash()
    };
  }

  /**
   * Restore HD wallet from mnemonic phrase
   */
  async restoreFromMnemonic(mnemonic) {
    console.log('🔄 Restoring HD wallet from mnemonic...');
    
    // Validate mnemonic
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }
    
    // Derive seed
    await this.seedFromMnemonic(mnemonic);
    
    console.log('✅ HD wallet restored successfully');
    return true;
  }

  /**
   * Convert entropy to mnemonic phrase (simplified BIP39)
   */
  entropyToMnemonic(entropy) {
    const entropyBits = Array.from(entropy)
      .map(byte => byte.toString(2).padStart(8, '0'))
      .join('');
    
    // Add checksum (simplified - use first 4 bits of SHA256)
    const checksumBits = this.calculateChecksum(entropy, 4);
    const fullBits = entropyBits + checksumBits;
    
    // Split into 11-bit groups and map to words
    const mnemonic = [];
    for (let i = 0; i < fullBits.length; i += 11) {
      const bits = fullBits.slice(i, i + 11);
      const index = parseInt(bits, 2) % BIP39_WORDLIST.length;
      mnemonic.push(BIP39_WORDLIST[index]);
    }
    
    return mnemonic.join(' ');
  }

  /**
   * Calculate checksum for mnemonic
   */
  calculateChecksum(entropy, bits) {
    // Simplified checksum - in production use proper SHA256
    let sum = 0;
    for (let i = 0; i < entropy.length; i++) {
      sum ^= entropy[i];
    }
    return sum.toString(2).padStart(bits, '0').slice(0, bits);
  }

  /**
   * Derive seed from mnemonic using PBKDF2
   */
  async seedFromMnemonic(mnemonic, passphrase = '') {
    const mnemonicBuffer = new TextEncoder().encode(mnemonic);
    const saltBuffer = new TextEncoder().encode('mnemonic' + passphrase);
    
    // Import mnemonic as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      mnemonicBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    // Derive 64-byte seed using PBKDF2
    const seedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 2048, // BIP39 standard
        hash: 'SHA-512'
      },
      keyMaterial,
      512 // 64 bytes
    );
    
    this.seed = new Uint8Array(seedBits);
    this.masterKey = await this.deriveMasterKey();
    this.initialized = true;
    
    return this.seed;
  }

  /**
   * Derive master private key from seed (BIP32)
   */
  async deriveMasterKey() {
    if (!this.seed) {
      throw new Error('Seed not available');
    }
    
    // HMAC-SHA512 with "ed25519 seed" as key
    const key = new TextEncoder().encode('ed25519 seed');
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, this.seed);
    const hash = new Uint8Array(signature);
    
    // Split into private key (32 bytes) and chain code (32 bytes)
    const privateKey = hash.slice(0, 32);
    const chainCode = hash.slice(32, 64);
    
    return {
      privateKey: FieldElement.fromBytes(privateKey),
      chainCode,
      depth: 0,
      parentFingerprint: new Uint8Array(4),
      childNumber: 0
    };
  }

  /**
   * Derive child key using BIP32 derivation
   */
  async deriveChild(parentKey, childNumber, hardened = false) {
    const index = hardened ? childNumber + 0x80000000 : childNumber;
    
    // Prepare data for HMAC
    let data;
    if (hardened) {
      // Hardened derivation: 0x00 || parent_private_key || index
      data = new Uint8Array(37);
      data[0] = 0x00;
      data.set(parentKey.privateKey.toBytes(), 1);
      new DataView(data.buffer).setUint32(33, index, false);
    } else {
      // Non-hardened derivation: parent_public_key || index
      const publicKey = await this.derivePublicKey(parentKey.privateKey);
      data = new Uint8Array(37);
      data.set(publicKey, 0);
      new DataView(data.buffer).setUint32(33, index, false);
    }
    
    // HMAC-SHA512 with parent chain code
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      parentKey.chainCode,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const hash = new Uint8Array(signature);
    
    // Derive child private key and chain code
    const childPrivateKeyBytes = hash.slice(0, 32);
    const childChainCode = hash.slice(32, 64);
    
    // Child private key = (parent_private_key + left_hash) mod n
    const leftHash = FieldElement.fromBytes(childPrivateKeyBytes);
    const childPrivateKey = parentKey.privateKey.add(leftHash);
    
    return {
      privateKey: childPrivateKey,
      chainCode: childChainCode,
      depth: parentKey.depth + 1,
      parentFingerprint: await this.getFingerprint(parentKey.privateKey),
      childNumber: index
    };
  }

  /**
   * Derive account keys following BIP44 path: m/44'/60'/account'/0/address_index
   */
  async deriveAccount(accountIndex = 0) {
    if (!this.initialized) {
      throw new Error('HD wallet not initialized');
    }
    
    console.log(`🔑 Deriving account ${accountIndex}...`);
    
    // BIP44 derivation path: m/44'/60'/account'/0/0
    // 44' = Purpose (BIP44)
    // 60' = Coin type (Ethereum)
    // account' = Account index
    // 0 = Change (external)
    // 0 = Address index
    
    let currentKey = this.masterKey;
    
    // m/44'
    currentKey = await this.deriveChild(currentKey, 44, true);
    
    // m/44'/60'
    currentKey = await this.deriveChild(currentKey, 60, true);
    
    // m/44'/60'/account'
    currentKey = await this.deriveChild(currentKey, accountIndex, true);
    
    // m/44'/60'/account'/0
    currentKey = await this.deriveChild(currentKey, 0, false);
    
    // m/44'/60'/account'/0/0
    const addressKey = await this.deriveChild(currentKey, 0, false);
    
    // Store account
    const account = {
      index: accountIndex,
      privateKey: addressKey.privateKey,
      publicKey: await this.derivePublicKey(addressKey.privateKey),
      chainCode: addressKey.chainCode,
      path: `m/44'/60'/${accountIndex}'/0/0`,
      addresses: new Map()
    };
    
    this.accounts.set(accountIndex, account);
    this.currentAccountIndex = accountIndex;
    
    console.log(`✅ Account ${accountIndex} derived`);
    return account;
  }

  /**
   * Derive multiple addresses for an account
   */
  async deriveAddresses(accountIndex, count = 5) {
    const account = this.accounts.get(accountIndex);
    if (!account) {
      throw new Error(`Account ${accountIndex} not found`);
    }
    
    console.log(`🔑 Deriving ${count} addresses for account ${accountIndex}...`);
    
    // Get account base key (m/44'/60'/account'/0)
    let accountKey = this.masterKey;
    accountKey = await this.deriveChild(accountKey, 44, true);
    accountKey = await this.deriveChild(accountKey, 60, true);
    accountKey = await this.deriveChild(accountKey, accountIndex, true);
    accountKey = await this.deriveChild(accountKey, 0, false);
    
    const addresses = [];
    
    for (let i = 0; i < count; i++) {
      const addressKey = await this.deriveChild(accountKey, i, false);
      const addressInfo = {
        index: i,
        privateKey: addressKey.privateKey,
        publicKey: await this.derivePublicKey(addressKey.privateKey),
        path: `m/44'/60'/${accountIndex}'/0/${i}`,
        address: this.publicKeyToAddress(await this.derivePublicKey(addressKey.privateKey))
      };
      
      addresses.push(addressInfo);
      account.addresses.set(i, addressInfo);
    }
    
    console.log(`✅ ${count} addresses derived`);
    return addresses;
  }

  /**
   * Derive public key from private key (simplified)
   */
  async derivePublicKey(privateKey) {
    // Simplified public key derivation
    // In production, use proper secp256k1 point multiplication
    const publicKeyElement = privateKey.mul(new FieldElement(2n));
    return publicKeyElement.toBytes();
  }

  /**
   * Convert public key to Ethereum address
   */
  publicKeyToAddress(publicKey) {
    // Simplified address derivation
    // In production, use proper Keccak256 hash of public key
    const hash = this.simpleHash(publicKey);
    return '0x' + Array.from(hash.slice(12))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get fingerprint of a key (first 4 bytes of hash160)
   */
  async getFingerprint(privateKey) {
    const publicKey = await this.derivePublicKey(privateKey);
    const hash = this.simpleHash(publicKey);
    return hash.slice(0, 4);
  }

  /**
   * Simple hash function (replace with proper hash in production)
   */
  simpleHash(data) {
    const hash = new Uint8Array(32);
    for (let i = 0; i < data.length; i++) {
      hash[i % 32] ^= data[i];
    }
    return hash;
  }

  /**
   * Validate mnemonic phrase
   */
  validateMnemonic(mnemonic) {
    const words = mnemonic.trim().toLowerCase().split(/\s+/);
    
    // Check word count (12, 15, 18, 21, or 24 words)
    if (![12, 15, 18, 21, 24].includes(words.length)) {
      return false;
    }
    
    // Check if all words exist in wordlist
    for (const word of words) {
      if (!BIP39_WORDLIST.includes(word)) {
        return false;
      }
    }
    
    // In production, verify checksum
    return true;
  }

  /**
   * Get current account
   */
  getCurrentAccount() {
    return this.accounts.get(this.currentAccountIndex);
  }

  /**
   * Get seed hash for verification
   */
  async getSeedHash() {
    if (!this.seed) return null;
    
    const hash = await crypto.subtle.digest('SHA-256', this.seed);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Export account private key for specific purpose
   */
  getAccountPrivateKey(accountIndex = this.currentAccountIndex) {
    const account = this.accounts.get(accountIndex);
    if (!account) {
      throw new Error(`Account ${accountIndex} not found`);
    }
    return account.privateKey;
  }

  /**
   * Get trading keys for TradePrivate
   */
  getTradingKeys(accountIndex = this.currentAccountIndex) {
    const account = this.accounts.get(accountIndex);
    if (!account) {
      throw new Error(`Account ${accountIndex} not found`);
    }
    
    return {
      privateKey: account.privateKey,
      publicKey: account.privateKey.mul(new FieldElement(3n)).toHex(), // Trading public key
      address: this.publicKeyToAddress(account.publicKey),
      path: account.path
    };
  }

  /**
   * Clear sensitive data
   */
  destroy() {
    this.seed = null;
    this.masterKey = null;
    this.accounts.clear();
    this.initialized = false;
    console.log('🧹 HD wallet cleared from memory');
  }

  /**
   * Secure storage methods
   */
  async saveToStorage(password) {
    if (!this.seed) {
      throw new Error('No seed to save');
    }
    
    // Encrypt seed with password
    const passwordBuffer = new TextEncoder().encode(password);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
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
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      this.seed
    );
    
    const data = {
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
      salt: Array.from(salt),
      version: '1.0',
      type: 'hd_seed',
      timestamp: Date.now()
    };
    
    // Save to IndexedDB
    const { openDB } = await import('idb');
    const db = await openDB('TradePrivateHD', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('wallet')) {
          db.createObjectStore('wallet');
        }
      }
    });
    
    await db.put('wallet', data, 'seed');
    console.log('🔒 HD seed saved securely');
    
    return true;
  }

  async loadFromStorage(password) {
    const { openDB } = await import('idb');
    const db = await openDB('TradePrivateHD', 1);
    
    const data = await db.get('wallet', 'seed');
    if (!data) {
      return false;
    }
    
    // Decrypt seed
    const passwordBuffer = new TextEncoder().encode(password);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(data.salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(data.iv) },
        key,
        new Uint8Array(data.encrypted)
      );
      
      this.seed = new Uint8Array(decrypted);
      this.masterKey = await this.deriveMasterKey();
      this.initialized = true;
      
      console.log('🔓 HD seed loaded from storage');
      return true;
    } catch (error) {
      throw new Error('Invalid password or corrupted data');
    }
  }
}

/**
 * Singleton HD wallet instance
 */
let hdWalletInstance = null;

export function getHDWallet() {
  if (!hdWalletInstance) {
    hdWalletInstance = new HDWallet();
  }
  return hdWalletInstance;
}

/**
 * Convenience functions
 */
export async function generateHDWallet() {
  const wallet = getHDWallet();
  return await wallet.generateFromEntropy();
}

export async function restoreHDWallet(mnemonic) {
  const wallet = getHDWallet();
  return await wallet.restoreFromMnemonic(mnemonic);
}

export async function deriveTradePrivateAccount(accountIndex = 0) {
  const wallet = getHDWallet();
  const account = await wallet.deriveAccount(accountIndex);
  return wallet.getTradingKeys(accountIndex);
}

export default HDWallet; 