/**
 * TradePrivate Cryptographic Module
 * 
 * Provides secure cryptographic operations for:
 * - Private key management
 * - Field element operations
 * - Commitment generation
 * - Nullifier generation
 * - Order encryption/decryption
 * - ECDH key exchange
 * - HKDF key derivation
 */

// Field Element implementation
export { FieldElement } from './fieldElement.js';

// Private Key Management
export { PrivateKeyManager } from './privateKeyManager.js';

// Commitment Generation
export { CommitmentGenerator } from './commitmentGenerator.js';

// Nullifier Generation
export { NullifierGenerator } from './nullifierGenerator.js';

// Order Encryption
export { 
  OrderEncryption,
  encryptOrder,
  decryptOrder,
  encryptOrderForMultipleRecipients,
  createEncryptedOrderCommitment,
  verifyOrderIntegrity,
  generateOrderMetadata
} from './orderEncryption.js';

/**
 * Initialize cryptographic libraries
 */
export async function initializeCrypto() {
  try {
    console.log('🔐 Initializing crypto libraries...');
    
    // Test crypto availability
    if (typeof crypto === 'undefined') {
      throw new Error('Crypto API not available');
    }
    
    // Test random number generation
    const testBytes = new Uint8Array(32);
    crypto.getRandomValues(testBytes);
    
    console.log('✅ Crypto libraries initialized successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to initialize crypto:', error);
    throw error;
  }
}

/**
 * Generate secure random bytes
 */
export function getRandomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generate secure random field element
 */
export async function getRandomFieldElement() {
  const { FieldElement } = await import('./fieldElement.js');
  const randomBytes = getRandomBytes(32);
  const randomBigInt = BigInt('0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
  return new FieldElement(randomBigInt);
}

/**
 * Constant-time comparison
 */
export function constantTimeEquals(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

/**
 * Secure memory clear (best effort)
 */
export function secureClear(data) {
  if (data instanceof Uint8Array) {
    crypto.getRandomValues(data);
  } else if (typeof data === 'string') {
    // Can't truly clear strings in JS, but we can try
    data = '';
  }
  // For other types, rely on GC
}

export default {
  initializeCrypto,
  getRandomBytes,
  getRandomFieldElement,
  constantTimeEquals,
  secureClear
}; 