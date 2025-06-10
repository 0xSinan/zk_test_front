// ===== src/lib/crypto/fieldElement.js =====
import { ZK_CONFIG } from '../config/zkConfig.js';

export class FieldElement {
  constructor(value) {
    this.value = BigInt(value) % ZK_CONFIG.FIELD_SIZE;
    if (this.value < 0n) {
      this.value += ZK_CONFIG.FIELD_SIZE;
    }
  }

  static fromHex(hex) {
    if (!hex.startsWith('0x')) {
      throw new Error('Hex string must start with 0x');
    }
    return new FieldElement(BigInt(hex));
  }

  static fromBytes(bytes) {
    if (!(bytes instanceof Uint8Array)) {
      throw new Error('Input must be Uint8Array');
    }
    const hex = '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return new FieldElement(BigInt(hex));
  }

  static random() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    // Ensure the value is less than field size
    bytes[0] = bytes[0] & 0x0F; // Clear top 4 bits to ensure < field size
    return FieldElement.fromBytes(bytes);
  }

  add(other) {
    if (!(other instanceof FieldElement)) {
      other = new FieldElement(other);
    }
    return new FieldElement((this.value + other.value) % ZK_CONFIG.FIELD_SIZE);
  }

  sub(other) {
    if (!(other instanceof FieldElement)) {
      other = new FieldElement(other);
    }
    let result = (this.value - other.value) % ZK_CONFIG.FIELD_SIZE;
    if (result < 0n) result += ZK_CONFIG.FIELD_SIZE;
    return new FieldElement(result);
  }

  mul(other) {
    if (!(other instanceof FieldElement)) {
      other = new FieldElement(other);
    }
    return new FieldElement((this.value * other.value) % ZK_CONFIG.FIELD_SIZE);
  }

  pow(exponent) {
    let result = 1n;
    let base = this.value;
    let exp = BigInt(exponent);
    
    while (exp > 0n) {
      if (exp & 1n) {
        result = (result * base) % ZK_CONFIG.FIELD_SIZE;
      }
      base = (base * base) % ZK_CONFIG.FIELD_SIZE;
      exp >>= 1n;
    }
    
    return new FieldElement(result);
  }

  inv() {
    // Fermat's little theorem: a^(p-1) ≡ 1 (mod p)
    // Therefore: a^(-1) ≡ a^(p-2) (mod p)
    return this.pow(ZK_CONFIG.FIELD_SIZE - 2n);
  }

  toHex() {
    return '0x' + this.value.toString(16).padStart(64, '0');
  }

  toBytes() {
    const hex = this.value.toString(16).padStart(64, '0');
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  toString() {
    return this.value.toString();
  }

  equals(other) {
    if (!(other instanceof FieldElement)) {
      other = new FieldElement(other);
    }
    return this.value === other.value;
  }

  isZero() {
    return this.value === 0n;
  }
}

// ===== src/lib/crypto/privateKeyManager.js =====
import { FieldElement } from './fieldElement.js';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { randomBytes } from '@noble/hashes/utils';

export class PrivateKeyManager {
  constructor() {
    this.privateKey = null;
    this.publicKey = null;
    this.tradingKeyPair = null;
    this.sessionId = null;
  }

  async initialize() {
    const stored = await this.loadFromSecureStorage();
    if (!stored) {
      await this.generateNewKeys();
    }
  }

  async generateNewKeys() {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Ethereum wallet not available');
    }

    const accounts = await window.ethereum.request({ 
      method: 'eth_accounts' 
    });
    
    if (accounts.length === 0) {
      throw new Error('No wallet connected');
    }

    // Generate unique salt for this application
    const appSalt = sha256(new TextEncoder().encode('TradePrivate_v1_2024'));
    
    // Create message with timestamp to prevent replay attacks
    const timestamp = Date.now();
    const nonce = randomBytes(16);
    const message = `TradePrivate Key Generation\n\nThis signature generates your private trading keys.\n\nTimestamp: ${timestamp}\nNonce: ${Buffer.from(nonce).toString('hex')}\n\nWARNING: Only sign this on the official TradePrivate interface.`;
    
    // Request signature from wallet
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, accounts[0]]
    });
    
    // Remove 0x prefix and convert to bytes
    const signatureBytes = new Uint8Array(
      signature.slice(2).match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );
    
    // Use HKDF to derive keys securely
    const info = new TextEncoder().encode('tradeprivate-keys-v1');
    
    // Derive 64 bytes: 32 for main key, 32 for trading key
    const derived = hkdf(sha256, signatureBytes, appSalt, info, 64);
    
    // Validate derived keys
    const mainKey = derived.slice(0, 32);
    const tradingKey = derived.slice(32, 64);
    
    // Ensure keys are valid for secp256k1
    if (!this.isValidPrivateKey(mainKey) || !this.isValidPrivateKey(tradingKey)) {
      throw new Error('Invalid derived keys');
    }
    
    this.privateKey = mainKey;
    this.publicKey = secp256k1.getPublicKey(mainKey, true); // compressed
    
    this.tradingKeyPair = {
      privateKey: tradingKey,
      publicKey: secp256k1.getPublicKey(tradingKey, true)
    };
    
    // Generate session ID
    this.sessionId = Buffer.from(randomBytes(16)).toString('hex');
    
    await this.saveToSecureStorage();
    return true;
  }

  isValidPrivateKey(key) {
    const keyBigInt = BigInt('0x' + Buffer.from(key).toString('hex'));
    const secp256k1Order = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    return keyBigInt > 0n && keyBigInt < secp256k1Order;
  }

  async saveToSecureStorage() {
    if (typeof window === 'undefined') return;
    
    // Only store session ID, not the keys
    sessionStorage.setItem('tradeprivate-session', this.sessionId);
    
    // Keys remain in memory only
    console.warn('Keys stored in memory only - will be lost on page refresh');
    
    // Set up automatic cleanup
    window.addEventListener('beforeunload', () => {
      this.destroy();
    });
  }

  async loadFromSecureStorage() {
    if (typeof window === 'undefined') return false;
    
    const sessionId = sessionStorage.getItem('tradeprivate-session');
    if (!sessionId) return false;
    
    // In production, implement secure key recovery
    // For now, return false to regenerate keys
    return false;
  }

  validateKeys() {
    if (!this.privateKey || !this.tradingKeyPair) {
      throw new Error('Keys not initialized');
    }
    
    // Additional validation
    if (!this.isValidPrivateKey(this.privateKey)) {
      throw new Error('Invalid private key');
    }
    
    return true;
  }

  getTradingPublicKey() {
    this.validateKeys();
    return '0x' + Buffer.from(this.tradingKeyPair.publicKey).toString('hex');
  }

  getPublicKey() {
    this.validateKeys();
    return '0x' + Buffer.from(this.publicKey).toString('hex');
  }

  async signMessage(message) {
    this.validateKeys();
    
    const msgHash = sha256(message);
    const signature = secp256k1.sign(msgHash, this.privateKey);
    
    return {
      r: signature.r.toString(16).padStart(64, '0'),
      s: signature.s.toString(16).padStart(64, '0'),
      v: signature.recovery + 27
    };
  }

  destroy() {
    // Securely clear keys from memory
    if (this.privateKey) {
      this.privateKey.fill(0);
      this.privateKey = null;
    }
    
    if (this.tradingKeyPair?.privateKey) {
      this.tradingKeyPair.privateKey.fill(0);
      this.tradingKeyPair = null;
    }
    
    this.publicKey = null;
    this.sessionId = null;
    
    // Clear session storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('tradeprivate-session');
    }
  }
}

// ===== src/lib/crypto/commitmentGenerator.js =====
import { sha256 } from '@noble/hashes/sha256';
import { FieldElement } from './fieldElement.js';

export class CommitmentGenerator {
  static generateAccountCommitment(privateKey, nonce) {
    if (!(privateKey instanceof Uint8Array)) {
      throw new Error('Private key must be Uint8Array');
    }
    
    if (privateKey.length !== 32) {
      throw new Error('Private key must be 32 bytes');
    }
    
    const nonceBytes = this.nonceToBytes(nonce);
    const data = new Uint8Array(64); // 32 + 32
    data.set(privateKey, 0);
    data.set(nonceBytes, 32);
    
    const hash = sha256(data);
    return FieldElement.fromBytes(hash);
  }

  static generateOrderCommitment(orderData, nonce) {
    const serialized = this.serializeOrderData(orderData);
    const nonceBytes = this.nonceToBytes(nonce);
    
    const data = new Uint8Array(serialized.length + 32);
    data.set(serialized, 0);
    data.set(nonceBytes, serialized.length);
    
    const hash = sha256(data);
    return FieldElement.fromBytes(hash);
  }

  static generateCommitHash(commitment, nonce, address) {
    // Validate Ethereum address
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Ethereum address format');
    }
    
    const commitmentBytes = commitment.toBytes();
    const nonceBytes = this.nonceToBytes(nonce);
    const addressBytes = this.hexToBytes(address);
    
    const data = new Uint8Array(32 + 32 + 20); // commitment + nonce + address
    data.set(commitmentBytes, 0);
    data.set(nonceBytes, 32);
    data.set(addressBytes, 64);
    
    return '0x' + Buffer.from(sha256(data)).toString('hex');
  }

  static serializeOrderData(orderData) {
    // Create deterministic serialization
    const buffer = new ArrayBuffer(256);
    const view = new DataView(buffer);
    
    let offset = 0;
    
    // Market address (32 bytes, padded)
    const marketBytes = this.hexToBytes(orderData.market);
    const paddedMarket = new Uint8Array(32);
    paddedMarket.set(marketBytes, 12); // Right-align in 32 bytes
    new Uint8Array(buffer, offset, 32).set(paddedMarket);
    offset += 32;
    
    // Size (32 bytes as uint256)
    const sizeBytes = this.bigintToBytes32(BigInt(orderData.size));
    new Uint8Array(buffer, offset, 32).set(sizeBytes);
    offset += 32;
    
    // Price (32 bytes as uint256)
    const priceBytes = this.bigintToBytes32(BigInt(orderData.price || 0));
    new Uint8Array(buffer, offset, 32).set(priceBytes);
    offset += 32;
    
    // Flags (1 byte each)
    view.setUint8(offset++, orderData.isLong ? 1 : 0);
    view.setUint8(offset++, orderData.isReduceOnly ? 1 : 0);
    view.setUint8(offset++, orderData.orderType || 0);
    
    // Leverage (1 byte)
    view.setUint8(offset++, Math.min(255, orderData.leverage || 1));
    
    // TP Price (32 bytes)
    const tpBytes = this.bigintToBytes32(BigInt(orderData.tpPrice || 0));
    new Uint8Array(buffer, offset, 32).set(tpBytes);
    offset += 32;
    
    // SL Price (32 bytes)
    const slBytes = this.bigintToBytes32(BigInt(orderData.slPrice || 0));
    new Uint8Array(buffer, offset, 32).set(slBytes);
    offset += 32;
    
    return new Uint8Array(buffer, 0, offset);
  }

  static nonceToBytes(nonce) {
    return this.bigintToBytes32(BigInt(nonce));
  }

  static bigintToBytes32(value) {
    const bytes = new Uint8Array(32);
    let n = BigInt(value);
    
    for (let i = 31; i >= 0; i--) {
      bytes[i] = Number(n & 0xFFn);
      n >>= 8n;
    }
    
    return bytes;
  }

  static hexToBytes(hex) {
    if (hex.startsWith('0x')) hex = hex.slice(2);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    
    return bytes;
  }
}

// ===== src/lib/crypto/nullifierGenerator.js =====
import { sha256 } from '@noble/hashes/sha256';
import { FieldElement } from './fieldElement.js';

export class NullifierGenerator {
  static generateOrderNullifier(privateKey, orderCommitment, nonce) {
    if (!(privateKey instanceof Uint8Array) || privateKey.length !== 32) {
      throw new Error('Private key must be 32-byte Uint8Array');
    }
    
    const commitmentBytes = orderCommitment.toBytes();
    const nonceBytes = this.nonceToBytes(nonce);
    
    const data = new Uint8Array(32 + 32 + 32); // privkey + commitment + nonce
    data.set(privateKey, 0);
    data.set(commitmentBytes, 32);
    data.set(nonceBytes, 64);
    
    // Double hash for extra security
    const firstHash = sha256(data);
    const finalHash = sha256(firstHash);
    
    return '0x' + Buffer.from(finalHash).toString('hex');
  }

  static generateAccountNullifier(privateKey, accountCommitment) {
    if (!(privateKey instanceof Uint8Array) || privateKey.length !== 32) {
      throw new Error('Private key must be 32-byte Uint8Array');
    }
    
    const commitmentBytes = accountCommitment.toBytes();
    const salt = new TextEncoder().encode('account_nullifier_v1');
    
    const data = new Uint8Array(32 + 32 + salt.length);
    data.set(privateKey, 0);
    data.set(commitmentBytes, 32);
    data.set(salt, 64);
    
    const hash = sha256(data);
    return '0x' + Buffer.from(hash).toString('hex');
  }

  static nonceToBytes(nonce) {
    const bytes = new Uint8Array(32);
    let n = BigInt(nonce);
    
    for (let i = 31; i >= 0; i--) {
      bytes[i] = Number(n & 0xFFn);
      n >>= 8n;
    }
    
    return bytes;
  }

  static async isNullifierUsed(contract, nullifier) {
    try {
      return await contract.usedNullifiers(nullifier);
    } catch (error) {
      console.error('Error checking nullifier:', error);
      throw new Error('Failed to check nullifier status');
    }
  }

  static validateNullifier(nullifier) {
    if (!nullifier || typeof nullifier !== 'string') {
      throw new Error('Invalid nullifier format');
    }
    
    if (!nullifier.match(/^0x[a-fA-F0-9]{64}$/)) {
      throw new Error('Nullifier must be 32-byte hex string');
    }
    
    return true;
  }
}

// ===== src/lib/crypto/orderEncryption.js =====
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import { secp256k1 } from '@noble/curves/secp256k1';

export class OrderEncryption {
  static async encryptOrder(orderData, recipientPublicKey) {
    // Validate and parse recipient public key
    const pubKeyBytes = this.parsePublicKey(recipientPublicKey);
    
    // Generate ephemeral keypair
    const ephemeralPrivKey = secp256k1.utils.randomPrivateKey();
    const ephemeralPubKey = secp256k1.getPublicKey(ephemeralPrivKey, true); // compressed
    
    // Compute shared secret using ECDH
    const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivKey, pubKeyBytes);
    // Remove the prefix byte (0x02 or 0x03 for compressed points)
    const sharedSecret = sha256(sharedPoint.slice(1));
    
    // Serialize order data
    const plaintext = JSON.stringify(orderData);
    const plaintextBytes = new TextEncoder().encode(plaintext);
    
    if (plaintextBytes.length > 400) {
      throw new Error('Order data too large (max 400 bytes)');
    }
    
    // Create padded data with length prefix
    const dataWithLength = new Uint8Array(514); // 2 bytes length + 512 bytes data
    new DataView(dataWithLength.buffer).setUint16(0, plaintextBytes.length, false);
    dataWithLength.set(plaintextBytes, 2);
    
    // Fill remaining space with random padding
    const randomPadding = randomBytes(512 - plaintextBytes.length);
    dataWithLength.set(randomPadding, 2 + plaintextBytes.length);
    
    // Encrypt using XChaCha20-Poly1305
    const nonce = randomBytes(24);
    const cipher = xchacha20poly1305(sharedSecret, nonce);
    const ciphertext = cipher.encrypt(dataWithLength);
    
    // Format: ephemeralPubKey (33) + nonce (24) + ciphertext (514 + 16 auth tag)
    const totalSize = 33 + 24 + ciphertext.length;
    
    // Ensure final size is exactly 512 bytes
    if (totalSize !== 587) { // 33 + 24 + 514 + 16
      throw new Error(`Unexpected encrypted size: ${totalSize}`);
    }
    
    // Truncate to exactly 512 bytes for the smart contract
    const result = new Uint8Array(512);
    result.set(ephemeralPubKey, 0);
    result.set(nonce, 33);
    result.set(ciphertext.slice(0, 512 - 57), 57);
    
    return result;
  }

  static async decryptOrder(encryptedData, privateKey) {
    if (encryptedData.length !== 512) {
      throw new Error('Invalid encrypted data size');
    }
    
    if (!(privateKey instanceof Uint8Array) || privateKey.length !== 32) {
      throw new Error('Private key must be 32-byte Uint8Array');
    }
    
    // Extract components
    const ephemeralPubKey = encryptedData.slice(0, 33);
    const nonce = encryptedData.slice(33, 57);
    const truncatedCiphertext = encryptedData.slice(57);
    
    // Compute shared secret
    const sharedPoint = secp256k1.getSharedSecret(privateKey, ephemeralPubKey);
    const sharedSecret = sha256(sharedPoint.slice(1));
    
    // Note: In production, you'd need the full ciphertext with auth tag
    // This is a limitation of the 512-byte constraint
    // Consider storing auth tag separately on-chain or in IPFS
    
    throw new Error('Decryption requires full ciphertext with auth tag');
  }

  static parsePublicKey(publicKey) {
    if (typeof publicKey !== 'string' || !publicKey.startsWith('0x')) {
      throw new Error('Public key must be hex string starting with 0x');
    }
    
    const hex = publicKey.slice(2);
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    // Validate public key format
    if (bytes.length === 33) {
      // Compressed public key
      if (bytes[0] !== 0x02 && bytes[0] !== 0x03) {
        throw new Error('Invalid compressed public key prefix');
      }
    } else if (bytes.length === 65) {
      // Uncompressed public key
      if (bytes[0] !== 0x04) {
        throw new Error('Invalid uncompressed public key prefix');
      }
    } else {
      throw new Error('Invalid public key length');
    }
    
    return bytes;
  }
}

// ===== src/lib/crypto/index.js =====
export { FieldElement } from './fieldElement.js';
export { PrivateKeyManager } from './privateKeyManager.js';
export { CommitmentGenerator } from './commitmentGenerator.js';
export { NullifierGenerator } from './nullifierGenerator.js';
export { OrderEncryption } from './orderEncryption.js';