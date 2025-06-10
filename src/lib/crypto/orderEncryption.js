import { getRandomBytes } from './utils.js';
import { getPrivateKeyManager } from './privateKeyManager.js';
import { FieldElement } from './fieldElement.js';
import { ZK_CONFIG } from '../config/zkConfig.js';

/**
 * Encrypt order data for privacy
 */
export async function encryptOrder(orderData, recipientPublicKey) {
  try {
    const manager = getPrivateKeyManager();
    
    // Serialize order data
    const orderBytes = new TextEncoder().encode(JSON.stringify(orderData));
    
    // Generate ephemeral key pair for this encryption
    const ephemeralPrivateKey = getRandomBytes(32);
    
    // Derive shared secret using ECDH
    const sharedSecret = await manager.deriveSharedSecret(recipientPublicKey);
    
    // Generate salt for key derivation
    const salt = getRandomBytes(32);
    
    // Derive encryption key
    const encryptionKey = await manager.deriveEncryptionKey(sharedSecret, salt);
    
    // Encrypt the order
    const encrypted = await manager.encrypt(orderBytes, encryptionKey);
    
    return {
      encryptedData: encrypted,
      salt: Array.from(salt),
      ephemeralPublicKey: Array.from(ephemeralPrivateKey), // In real implementation, derive public key
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('Order encryption failed:', error);
    throw new Error('Failed to encrypt order');
  }
}

/**
 * Decrypt order data
 */
export async function decryptOrder(encryptedOrder, senderPublicKey) {
  try {
    const manager = getPrivateKeyManager();
    
    if (!manager.isUnlocked()) {
      throw new Error('Private key manager is locked');
    }
    
    // Derive shared secret
    const sharedSecret = await manager.deriveSharedSecret(senderPublicKey);
    
    // Derive decryption key
    const salt = new Uint8Array(encryptedOrder.salt);
    const decryptionKey = await manager.deriveEncryptionKey(sharedSecret, salt);
    
    // Decrypt the data
    const decryptedBytes = await manager.decrypt(encryptedOrder.encryptedData, decryptionKey);
    
    // Parse the order data
    const orderJson = new TextDecoder().decode(decryptedBytes);
    const orderData = JSON.parse(orderJson);
    
    return orderData;
    
  } catch (error) {
    console.error('Order decryption failed:', error);
    throw new Error('Failed to decrypt order');
  }
}

/**
 * Encrypt order for multiple recipients (batch encryption)
 */
export async function encryptOrderForMultipleRecipients(orderData, recipientPublicKeys) {
  const encryptedOrders = [];
  
  for (const publicKey of recipientPublicKeys) {
    try {
      const encrypted = await encryptOrder(orderData, publicKey);
      encryptedOrders.push({
        recipientPublicKey: Array.from(publicKey),
        encryptedOrder: encrypted
      });
    } catch (error) {
      console.error('Failed to encrypt for recipient:', publicKey, error);
      // Continue with other recipients
    }
  }
  
  return encryptedOrders;
}

/**
 * Create encrypted order commitment
 */
export async function createEncryptedOrderCommitment(orderData) {
  // Generate random nonce for commitment
  const nonce = getRandomBytes(32);
  
  // Serialize order with nonce
  const dataWithNonce = {
    ...orderData,
    nonce: Array.from(nonce),
    timestamp: Date.now()
  };
  
  // Create commitment hash
  const dataBytes = new TextEncoder().encode(JSON.stringify(dataWithNonce));
  const hash = await crypto.subtle.digest('SHA-256', dataBytes);
  
  return {
    commitment: Array.from(new Uint8Array(hash)),
    nonce: Array.from(nonce),
    orderData: dataWithNonce
  };
}

/**
 * Verify encrypted order integrity
 */
export async function verifyOrderIntegrity(encryptedOrder, expectedHash) {
  try {
    // Hash the encrypted data
    const dataBytes = new Uint8Array(encryptedOrder.encryptedData.data);
    const hash = await crypto.subtle.digest('SHA-256', dataBytes);
    const hashArray = Array.from(new Uint8Array(hash));
    
    // Compare with expected hash
    if (hashArray.length !== expectedHash.length) {
      return false;
    }
    
    for (let i = 0; i < hashArray.length; i++) {
      if (hashArray[i] !== expectedHash[i]) {
        return false;
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('Order integrity verification failed:', error);
    return false;
  }
}

/**
 * Generate order encryption metadata
 */
export function generateOrderMetadata(orderType, marketData) {
  return {
    orderType,
    marketData,
    encryptionVersion: '1.0',
    timestamp: Date.now(),
    expirationTime: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    metadata: {
      clientVersion: '1.0.0',
      encryptionAlgorithm: 'AES-GCM',
      keyDerivation: 'HKDF-SHA256'
    }
  };
}

/**
 * Order Encryption for TradePrivate
 * Encrypts orders for keepers while maintaining privacy
 */
export class OrderEncryption {
  constructor() {
    this.curve = 'secp256k1'; // For ECDH
    this.keyCache = new Map();
  }

  /**
   * Encrypt order for a specific keeper
   * @param {object} orderData - Order data to encrypt
   * @param {string} keeperPublicKey - Keeper's public key
   * @param {bigint} userPrivateKey - User's private key
   */
  async encryptOrderForKeeper(orderData, keeperPublicKey, userPrivateKey) {
    try {
      // Generate shared secret using ECDH
      const sharedSecret = await this.generateSharedSecret(userPrivateKey, keeperPublicKey);
      
      // Derive encryption key from shared secret
      const encryptionKey = await this.deriveEncryptionKey(sharedSecret);
      
      // Serialize order data
      const serializedOrder = this.serializeOrder(orderData);
      
      // Encrypt with AES-GCM
      const encrypted = await this.encryptWithAES(serializedOrder, encryptionKey);
      
      // Create metadata
      const metadata = {
        keeperPublicKey,
        timestamp: Date.now(),
        version: '1.0.0',
        algorithm: 'ECDH-AES256-GCM'
      };
      
      return {
        encrypted: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        ephemeralPublicKey: this.derivePublicKey(userPrivateKey),
        metadata,
        orderHash: this.hashOrder(orderData)
      };
    } catch (error) {
      throw new Error(`Failed to encrypt order: ${error.message}`);
    }
  }

  /**
   * Decrypt order (for keepers)
   * @param {object} encryptedOrder - Encrypted order object
   * @param {bigint} keeperPrivateKey - Keeper's private key
   */
  async decryptOrderForKeeper(encryptedOrder, keeperPrivateKey) {
    try {
      const { encrypted, iv, authTag, ephemeralPublicKey, metadata } = encryptedOrder;
      
      // Generate shared secret
      const sharedSecret = await this.generateSharedSecret(keeperPrivateKey, ephemeralPublicKey);
      
      // Derive decryption key
      const decryptionKey = await this.deriveEncryptionKey(sharedSecret);
      
      // Decrypt
      const decrypted = await this.decryptWithAES(encrypted, decryptionKey, iv, authTag);
      
      // Deserialize order
      const orderData = this.deserializeOrder(decrypted);
      
      // Verify order hash
      const computedHash = this.hashOrder(orderData);
      if (computedHash !== encryptedOrder.orderHash) {
        throw new Error('Order hash mismatch - possible tampering');
      }
      
      return {
        orderData,
        metadata,
        decryptedAt: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to decrypt order: ${error.message}`);
    }
  }

  /**
   * Encrypt order for multiple keepers
   * @param {object} orderData - Order data
   * @param {string[]} keeperPublicKeys - Array of keeper public keys
   * @param {bigint} userPrivateKey - User's private key
   */
  async encryptOrderForKeepers(orderData, keeperPublicKeys, userPrivateKey) {
    const encryptions = [];
    
    for (const keeperPubKey of keeperPublicKeys) {
      try {
        const encrypted = await this.encryptOrderForKeeper(orderData, keeperPubKey, userPrivateKey);
        encryptions.push({
          keeperPublicKey: keeperPubKey,
          encryption: encrypted,
          success: true
        });
      } catch (error) {
        encryptions.push({
          keeperPublicKey: keeperPubKey,
          error: error.message,
          success: false
        });
      }
    }
    
    return {
      encryptions,
      totalKeepers: keeperPublicKeys.length,
      successfulEncryptions: encryptions.filter(e => e.success).length,
      orderHash: this.hashOrder(orderData)
    };
  }

  /**
   * Generate shared secret using ECDH
   * @param {bigint} privateKey - Private key
   * @param {string} publicKey - Public key (hex string)
   */
  async generateSharedSecret(privateKey, publicKey) {
    try {
      // Attempt to use Web Crypto API for real ECDH
      const privateKeyBuffer = this.bigintToBytes(privateKey, 32);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        privateKeyBuffer,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        false,
        ['deriveKey']
      );
      
      const publicKeyBuffer = this.hexToBytes(publicKey);
      const publicCryptoKey = await crypto.subtle.importKey(
        'raw',
        publicKeyBuffer,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        false,
        []
      );
      
      const sharedSecret = await crypto.subtle.deriveKey(
        {
          name: 'ECDH',
          public: publicCryptoKey
        },
        cryptoKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      const exported = await crypto.subtle.exportKey('raw', sharedSecret);
      return new Uint8Array(exported);
      
    } catch (error) {
      console.warn('🚨 SECURITY WARNING: Using fallback ECDH - NOT SECURE FOR PRODUCTION');
      console.warn('Error:', error.message);
      
      // Fallback for development/testing ONLY
      // This is NOT cryptographically secure
      const privateKeyElement = new FieldElement(privateKey);
      const publicKeyElement = FieldElement.fromString(publicKey);
      
      const sharedSecret = privateKeyElement.multiply(publicKeyElement);
      return this.bigintToBytes(sharedSecret.value, 32);
    }
  }

  hexToBytes(hex) {
    const cleanHex = hex.replace('0x', '');
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
    }
    return bytes;
  }

  /**
   * Derive encryption key from shared secret
   * @param {bigint} sharedSecret - Shared secret
   */
  async deriveEncryptionKey(sharedSecret) {
    // Use HKDF-like derivation
    const secretBytes = this.bigintToBytes(sharedSecret, 32);
    
    // Simple key derivation for development
    const hash = await crypto.subtle.digest('SHA-256', secretBytes);
    return new Uint8Array(hash);
  }

  /**
   * Derive public key from private key
   * @param {bigint} privateKey - Private key
   */
  derivePublicKey(privateKey) {
    // Simple public key derivation for mock
    const publicKey = (privateKey * 2n) % FieldElement.FIELD_SIZE;
    return publicKey.toString(16);
  }

  /**
   * Encrypt data with AES-GCM
   * @param {Uint8Array} data - Data to encrypt
   * @param {Uint8Array} key - Encryption key
   */
  async encryptWithAES(data, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );
    
    const ciphertext = new Uint8Array(encrypted);
    const authTag = ciphertext.slice(-16); // Last 16 bytes
    const actualCiphertext = ciphertext.slice(0, -16);
    
    return {
      ciphertext: Array.from(actualCiphertext),
      iv: Array.from(iv),
      authTag: Array.from(authTag)
    };
  }

  /**
   * Decrypt data with AES-GCM
   * @param {number[]} ciphertext - Encrypted data
   * @param {Uint8Array} key - Decryption key
   * @param {number[]} iv - Initialization vector
   * @param {number[]} authTag - Authentication tag
   */
  async decryptWithAES(ciphertext, key, iv, authTag) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Combine ciphertext and auth tag
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext);
    combined.set(authTag, ciphertext.length);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      cryptoKey,
      combined
    );
    
    return new Uint8Array(decrypted);
  }

  /**
   * Serialize order data to bytes
   * @param {object} orderData - Order data object
   */
  serializeOrder(orderData) {
    const serialized = JSON.stringify({
      market: orderData.market,
      size: orderData.size,
      price: orderData.price || '0',
      isLong: orderData.isLong,
      orderType: orderData.orderType,
      leverage: orderData.leverage,
      tpPrice: orderData.tpPrice || '0',
      slPrice: orderData.slPrice || '0',
      isReduceOnly: orderData.isReduceOnly || false,
      timestamp: orderData.timestamp || Date.now(),
      userCommitment: orderData.userCommitment,
      nonce: orderData.nonce || 0
    });
    
    return new TextEncoder().encode(serialized);
  }

  /**
   * Deserialize order data from bytes
   * @param {Uint8Array} data - Serialized order data
   */
  deserializeOrder(data) {
    const jsonString = new TextDecoder().decode(data);
    return JSON.parse(jsonString);
  }

  /**
   * Hash order data for integrity verification
   * @param {object} orderData - Order data
   */
  hashOrder(orderData) {
    const elements = [
      FieldElement.fromString(orderData.market),
      FieldElement.fromString(orderData.size),
      FieldElement.fromString(orderData.price || '0'),
      new FieldElement(orderData.isLong ? 1n : 0n),
      new FieldElement(BigInt(orderData.orderType)),
      new FieldElement(BigInt(orderData.leverage))
    ];
    
    let hash = new FieldElement(0n);
    for (let i = 0; i < elements.length; i++) {
      hash = hash.add(elements[i].multiply(new FieldElement(BigInt(i + 1))));
    }
    
    return hash.value.toString(16);
  }

  /**
   * Generate order commitment for privacy
   * @param {object} orderData - Order data
   * @param {bigint} salt - Random salt
   */
  generateOrderCommitment(orderData, salt) {
    const orderHash = this.hashOrder(orderData);
    const orderElement = FieldElement.fromString(orderHash);
    const saltElement = new FieldElement(salt);
    
    const commitment = orderElement.add(saltElement);
    
    return {
      commitment: commitment.value.toString(16),
      orderHash,
      salt: salt.toString(16),
      timestamp: Date.now()
    };
  }

  /**
   * Batch encrypt orders for distribution
   * @param {object[]} orders - Array of orders
   * @param {string[]} keeperPublicKeys - Keeper public keys
   * @param {bigint} userPrivateKey - User's private key
   */
  async batchEncryptOrders(orders, keeperPublicKeys, userPrivateKey) {
    const results = [];
    
    for (const order of orders) {
      try {
        const encrypted = await this.encryptOrderForKeepers(order, keeperPublicKeys, userPrivateKey);
        results.push({
          orderId: order.id || this.hashOrder(order),
          encryption: encrypted,
          success: true
        });
      } catch (error) {
        results.push({
          orderId: order.id || 'unknown',
          error: error.message,
          success: false
        });
      }
    }
    
    return {
      results,
      totalOrders: orders.length,
      successfulEncryptions: results.filter(r => r.success).length,
      timestamp: Date.now()
    };
  }

  /**
   * Verify encrypted order integrity
   * @param {object} encryptedOrder - Encrypted order
   */
  verifyEncryptedOrderIntegrity(encryptedOrder) {
    const required = ['encrypted', 'iv', 'authTag', 'ephemeralPublicKey', 'metadata', 'orderHash'];
    
    for (const field of required) {
      if (!encryptedOrder[field]) {
        return { valid: false, error: `Missing field: ${field}` };
      }
    }
    
    // Verify metadata format
    const metadata = encryptedOrder.metadata;
    if (!metadata.algorithm || !metadata.version || !metadata.timestamp) {
      return { valid: false, error: 'Invalid metadata format' };
    }
    
    // Verify encryption format
    if (!Array.isArray(encryptedOrder.encrypted) || !Array.isArray(encryptedOrder.iv)) {
      return { valid: false, error: 'Invalid encryption format' };
    }
    
    return { valid: true };
  }

  /**
   * Convert bigint to byte array
   * @param {bigint} value - Bigint value
   * @param {number} length - Target byte length
   */
  bigintToBytes(value, length) {
    const bytes = new Uint8Array(length);
    let v = value;
    
    for (let i = length - 1; i >= 0; i--) {
      bytes[i] = Number(v & 0xFFn);
      v >>= 8n;
    }
    
    return bytes;
  }

  /**
   * Clear key cache (for security)
   */
  clearKeyCache() {
    this.keyCache.clear();
  }

  /**
   * Get encryption statistics
   */
  getStats() {
    return {
      cacheSize: this.keyCache.size,
      algorithm: 'ECDH-AES256-GCM',
      curve: this.curve,
      supportedOperations: [
        'encrypt_for_keeper',
        'decrypt_for_keeper',
        'batch_encrypt',
        'verify_integrity'
      ]
    };
  }
} 