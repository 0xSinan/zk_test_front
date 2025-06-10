/**
 * Cryptographic utilities for TradePrivate
 */

/**
 * Generate secure random bytes
 */
export function getRandomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Constant-time equality comparison
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
 * Convert bytes to hex string
 */
export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex) {
  const cleanHex = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert BigInt to little-endian bytes
 */
export function bigIntToBytes(value, length = 32) {
  const bytes = new Uint8Array(length);
  let tempValue = value;
  
  for (let i = 0; i < length; i++) {
    bytes[i] = Number(tempValue & BigInt(255));
    tempValue = tempValue >> BigInt(8);
  }
  
  return bytes;
}

/**
 * Convert little-endian bytes to BigInt
 */
export function bytesToBigInt(bytes) {
  let result = BigInt(0);
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << BigInt(8)) + BigInt(bytes[i]);
  }
  return result;
}

/**
 * Secure hash combination
 */
export function hashCombine(...hashes) {
  let combined = new Uint8Array(0);
  for (const hash of hashes) {
    const newCombined = new Uint8Array(combined.length + hash.length);
    newCombined.set(combined);
    newCombined.set(hash, combined.length);
    combined = newCombined;
  }
  return combined;
}

/**
 * Timing-safe string comparison
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new TypeError('Arguments must be strings');
  }
  
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  
  return constantTimeEquals(aBytes, bBytes);
} 