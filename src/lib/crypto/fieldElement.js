import { ZK_CONFIG } from '../config/zkConfig.js';

/**
 * Field Element class for BN254 curve operations
 * Used for zero-knowledge proof computations
 */
export class FieldElement {
  constructor(value) {
    if (typeof value === 'string') {
      this.value = BigInt(value.startsWith('0x') ? value : '0x' + value);
    } else {
      this.value = BigInt(value);
    }
    
    // Ensure value is within field
    this.value = this.value % ZK_CONFIG.FIELD_SIZE;
    if (this.value < 0n) {
      this.value += ZK_CONFIG.FIELD_SIZE;
    }
  }

  static fromHex(hex) {
    if (!hex.startsWith('0x')) {
      hex = '0x' + hex;
    }
    return new FieldElement(hex);
  }

  static fromBytes(bytes) {
    let value = 0n;
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8n) | BigInt(bytes[i]);
    }
    return new FieldElement(value);
  }

  static fromString(str) {
    // Handle hex strings and decimal strings
    if (typeof str !== 'string') {
      throw new Error('Input must be a string');
    }
    
    // If it's a hex string
    if (str.startsWith('0x')) {
      return new FieldElement(str);
    }
    
    // If it's a decimal string or other format
    try {
      return new FieldElement(str);
    } catch (error) {
      throw new Error(`Invalid string format for field element: ${str}`);
    }
  }

  static random() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    // Ensure it's less than field size
    bytes[0] = bytes[0] & 0x0F;
    return FieldElement.fromBytes(bytes);
  }

  add(other) {
    const otherElement = other instanceof FieldElement ? other : new FieldElement(other);
    return new FieldElement((this.value + otherElement.value) % ZK_CONFIG.FIELD_SIZE);
  }

  sub(other) {
    const otherElement = other instanceof FieldElement ? other : new FieldElement(other);
    let result = this.value - otherElement.value;
    if (result < 0n) {
      result += ZK_CONFIG.FIELD_SIZE;
    }
    return new FieldElement(result);
  }

  mul(other) {
    const otherElement = other instanceof FieldElement ? other : new FieldElement(other);
    return new FieldElement((this.value * otherElement.value) % ZK_CONFIG.FIELD_SIZE);
  }

  // Alias for mul for compatibility
  multiply(other) {
    return this.mul(other);
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
    // Fermat's little theorem: a^(p-1) = 1, so a^(p-2) = a^(-1)
    return this.pow(ZK_CONFIG.FIELD_SIZE - 2n);
  }

  toHex() {
    return '0x' + this.value.toString(16).padStart(64, '0');
  }

  toBytes() {
    const hex = this.value.toString(16).padStart(64, '0');
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  toString() {
    return this.value.toString();
  }

  equals(other) {
    const otherElement = other instanceof FieldElement ? other : new FieldElement(other);
    return this.value === otherElement.value;
  }

  isZero() {
    return this.value === 0n;
  }

  // Static helper methods
  static ZERO = new FieldElement(0n);
  static ONE = new FieldElement(1n);
  
  static FIELD_SIZE = ZK_CONFIG.FIELD_SIZE;
}

/**
 * Convert a value to a field element
 */
export function toFieldElement(value) {
  let bigIntValue;

  if (typeof value === 'bigint') {
    bigIntValue = value;
  } else if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('Number must be a non-negative integer');
    }
    bigIntValue = BigInt(value);
  } else if (typeof value === 'string') {
    try {
      bigIntValue = BigInt(value);
    } catch (error) {
      throw new Error(`Invalid string format for field element: ${value}`);
    }
  } else if (value instanceof Uint8Array) {
    bigIntValue = bytesToBigInt(value);
  } else {
    throw new Error(`Unsupported type for field element: ${typeof value}`);
  }

  // Reduce modulo field size
  bigIntValue = bigIntValue % ZK_CONFIG.FIELD_SIZE;
  if (bigIntValue < 0n) {
    bigIntValue += ZK_CONFIG.FIELD_SIZE;
  }

  return bigIntValue;
}

/**
 * Convert field element to other formats
 */
export function fromFieldElement(fieldElement, format = 'bigint') {
  const value = typeof fieldElement === 'bigint' ? fieldElement : fieldElement.value;
  
  switch (format.toLowerCase()) {
    case 'bigint':
      return value;
    case 'string':
      return value.toString();
    case 'hex':
      return '0x' + value.toString(16).padStart(64, '0');
    case 'bytes':
      return bigIntToBytes(value, 32);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Validate field element
 */
export function validateFieldElement(value) {
  const fieldElement = typeof value === 'bigint' ? value : toFieldElement(value);
  
  if (fieldElement >= ZK_CONFIG.FIELD_SIZE) {
    throw new Error(`Field element too large: ${fieldElement} >= ${ZK_CONFIG.FIELD_SIZE}`);
  }
  
  if (fieldElement < 0n) {
    throw new Error('Field element cannot be negative');
  }
  
  return true;
}

/**
 * Field arithmetic operations
 */
export function addFieldElements(a, b) {
  const result = (toFieldElement(a) + toFieldElement(b)) % ZK_CONFIG.FIELD_SIZE;
  return result;
}

export function subtractFieldElements(a, b) {
  let result = (toFieldElement(a) - toFieldElement(b)) % ZK_CONFIG.FIELD_SIZE;
  if (result < 0n) {
    result += ZK_CONFIG.FIELD_SIZE;
  }
  return result;
}

export function multiplyFieldElements(a, b) {
  const result = (toFieldElement(a) * toFieldElement(b)) % ZK_CONFIG.FIELD_SIZE;
  return result;
}

export function negateFieldElement(a) {
  const element = toFieldElement(a);
  return element === 0n ? 0n : ZK_CONFIG.FIELD_SIZE - element;
}

export function inverseFieldElement(a) {
  const element = toFieldElement(a);
  if (element === 0n) {
    throw new Error('Cannot compute inverse of zero');
  }
  
  // Use extended Euclidean algorithm
  return modInverse(element, ZK_CONFIG.FIELD_SIZE);
}

/**
 * Utility functions
 */
function bytesToBigInt(bytes) {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) + BigInt(bytes[i]);
  }
  return result;
}

function bigIntToBytes(bigint, length) {
  const bytes = new Uint8Array(length);
  let value = bigint;
  
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(value & 0xFFn);
    value >>= 8n;
  }
  
  return bytes;
}

function modInverse(a, m) {
  // Extended Euclidean Algorithm
  function extendedGCD(a, b) {
    if (a === 0n) {
      return [b, 0n, 1n];
    }
    
    const [gcd, x1, y1] = extendedGCD(b % a, a);
    const x = y1 - (b / a) * x1;
    const y = x1;
    
    return [gcd, x, y];
  }
  
  const [gcd, x, _] = extendedGCD(a % m, m);
  
  if (gcd !== 1n) {
    throw new Error('Modular inverse does not exist');
  }
  
  return ((x % m) + m) % m;
}

/**
 * Array operations
 */
export function addFieldElementArrays(a, b) {
  if (a.length !== b.length) {
    throw new Error('Arrays must have the same length');
  }
  
  return a.map((val, i) => addFieldElements(val, b[i]));
}

export function multiplyFieldElementArrays(a, b) {
  if (a.length !== b.length) {
    throw new Error('Arrays must have the same length');
  }
  
  return a.map((val, i) => multiplyFieldElements(val, b[i]));
}

/**
 * Hash-to-field operation
 */
export function hashToField(data) {
  // Simple hash-to-field using keccak256
  // In production, use a proper hash-to-field function
  const encoder = new TextEncoder();
  const bytes = typeof data === 'string' ? encoder.encode(data) : data;
  
  return crypto.subtle.digest('SHA-256', bytes)
    .then(hashBuffer => {
      const hashBytes = new Uint8Array(hashBuffer);
      return toFieldElement(bytesToBigInt(hashBytes));
    });
}

export default FieldElement; 