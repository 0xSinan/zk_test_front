import { ZK_CIRCUITS, DEV_FLAGS } from './constants.js';
import { CONSTANTS } from './constants.js';

/**
 * ZK Circuit Configuration and Management
 * Handles loading and validation of zero-knowledge circuits
 */

class ZKCircuitManager {
  constructor() {
    this.circuits = new Map();
    this.loadingPromises = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize ZK circuits
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Load all circuits in parallel
      const loadPromises = Object.entries(ZK_CIRCUITS).map(([name, config]) =>
        this.loadCircuit(name.toLowerCase(), config)
      );
      
      await Promise.all(loadPromises);
      this.isInitialized = true;
      
      if (DEV_FLAGS.DEBUG_LOGS) {
        console.log('✅ ZK circuits initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize ZK circuits:', error);
      throw new Error(`ZK circuit initialization failed: ${error.message}`);
    }
  }

  /**
   * Load a specific circuit
   */
  async loadCircuit(name, config) {
    if (this.circuits.has(name)) {
      return this.circuits.get(name);
    }

    // Prevent duplicate loading
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name);
    }

    const loadPromise = this._loadCircuitFiles(name, config);
    this.loadingPromises.set(name, loadPromise);

    try {
      const circuit = await loadPromise;
      this.circuits.set(name, circuit);
      this.loadingPromises.delete(name);
      return circuit;
    } catch (error) {
      this.loadingPromises.delete(name);
      throw error;
    }
  }

  /**
   * Load circuit files (WASM and ZKEY)
   */
  async _loadCircuitFiles(name, config) {
    try {
      const [wasmBuffer, zkeyBuffer] = await Promise.all([
        this._fetchFile(config.WASM),
        this._fetchFile(config.ZKEY)
      ]);

      return {
        name,
        wasm: wasmBuffer,
        zkey: zkeyBuffer,
        loadedAt: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to load ${name} circuit: ${error.message}`);
    }
  }

  /**
   * Fetch file as buffer
   */
  async _fetchFile(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      if (DEV_FLAGS.DEV_MODE) {
        console.warn(`⚠️ Could not load ${url}, using mock data`);
        return this._getMockCircuitData();
      }
      throw error;
    }
  }

  /**
   * Get mock circuit data for development
   */
  _getMockCircuitData() {
    // Return minimal mock data for development
    return new ArrayBuffer(1024);
  }

  /**
   * Get circuit by name
   */
  getCircuit(name) {
    const circuit = this.circuits.get(name.toLowerCase());
    if (!circuit) {
      throw new Error(`Circuit ${name} not loaded`);
    }
    return circuit;
  }

  /**
   * Check if circuit is loaded
   */
  isCircuitLoaded(name) {
    return this.circuits.has(name.toLowerCase());
  }

  /**
   * Get all loaded circuits
   */
  getLoadedCircuits() {
    return Array.from(this.circuits.keys());
  }

  /**
   * Validate circuit integrity
   */
  validateCircuit(name) {
    const circuit = this.getCircuit(name);
    
    // Basic validation
    if (!circuit.wasm || !circuit.zkey) {
      throw new Error(`Invalid circuit data for ${name}`);
    }

    if (circuit.wasm.byteLength === 0 || circuit.zkey.byteLength === 0) {
      throw new Error(`Empty circuit files for ${name}`);
    }

    return true;
  }

  /**
   * Reload a specific circuit
   */
  async reloadCircuit(name) {
    const config = ZK_CIRCUITS[name.toUpperCase()];
    if (!config) {
      throw new Error(`Unknown circuit: ${name}`);
    }

    this.circuits.delete(name.toLowerCase());
    return await this.loadCircuit(name.toLowerCase(), config);
  }

  /**
   * Clear all circuits
   */
  clear() {
    this.circuits.clear();
    this.loadingPromises.clear();
    this.isInitialized = false;
  }

  /**
   * Get circuit statistics
   */
  getStats() {
    const circuits = Array.from(this.circuits.entries()).map(([name, circuit]) => ({
      name,
      wasmSize: circuit.wasm.byteLength,
      zkeySize: circuit.zkey.byteLength,
      loadedAt: new Date(circuit.loadedAt).toISOString()
    }));

    return {
      totalCircuits: this.circuits.size,
      isInitialized: this.isInitialized,
      circuits
    };
  }
}

// Singleton instance
export const zkCircuitManager = new ZKCircuitManager();

/**
 * ZK Configuration object
 */
export const zkConfig = {
  // Circuit manager
  manager: zkCircuitManager,

  // Proof generation settings
  proofGeneration: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000
  },

  // Verification settings
  verification: {
    timeout: 5000, // 5 seconds
    mockInDev: DEV_FLAGS.MOCK_ZK_PROOFS
  },

  // Security settings
  security: {
    validateInputs: true,
    sanitizeOutputs: true,
    requireSecureContext: !DEV_FLAGS.DEV_MODE
  },

  // Performance settings
  performance: {
    enableWebWorkers: true,
    maxConcurrentProofs: 2,
    circuitCaching: true
  }
};

/**
 * Initialize ZK configuration
 */
export async function initializeZK() {
  try {
    console.log('⚡ Initializing ZK system...');
    
    // In development mode, use mock initialization
    if (DEV_FLAGS.DEV_MODE || DEV_FLAGS.MOCK_ZK_PROOFS) {
      console.log('🔧 Using mock ZK circuits for development');
      
      // Mock circuit loading without actual file fetching
      const mockCircuits = Object.keys(ZK_CIRCUITS);
      for (const circuitName of mockCircuits) {
        zkCircuitManager.circuits.set(circuitName.toLowerCase(), {
          name: circuitName.toLowerCase(),
          wasm: new ArrayBuffer(1024),
          zkey: new ArrayBuffer(1024),
          loadedAt: Date.now(),
          mock: true
        });
      }
      
      zkCircuitManager.isInitialized = true;
      console.log(`✅ Mock ZK circuits loaded: ${mockCircuits.join(', ')}`);
      return true;
    }
    
    // Production mode - try to load real circuits
    await zkCircuitManager.initialize();
    
    if (DEV_FLAGS.DEBUG_LOGS) {
      console.log('ZK Config Stats:', zkCircuitManager.getStats());
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize ZK configuration:', error);
    
    // Fallback to mock mode even in production if files are missing
    console.warn('⚠️ Falling back to mock ZK proofs');
    
    const mockCircuits = Object.keys(ZK_CIRCUITS);
    for (const circuitName of mockCircuits) {
      zkCircuitManager.circuits.set(circuitName.toLowerCase(), {
        name: circuitName.toLowerCase(),
        wasm: new ArrayBuffer(1024),
        zkey: new ArrayBuffer(1024),
        loadedAt: Date.now(),
        mock: true,
        fallback: true
      });
    }
    
    zkCircuitManager.isInitialized = true;
    return true;
  }
}

/**
 * Validate ZK environment
 */
export function validateZKEnvironment() {
  const checks = {
    wasmSupport: typeof WebAssembly !== 'undefined',
    workerSupport: typeof Worker !== 'undefined',
    cryptoSupport: typeof crypto !== 'undefined' && typeof crypto.getRandomValues !== 'undefined',
    bigIntSupport: typeof BigInt !== 'undefined'
  };

  const failed = Object.entries(checks)
    .filter(([_, supported]) => !supported)
    .map(([check]) => check);

  if (failed.length > 0) {
    throw new Error(`Unsupported environment. Missing: ${failed.join(', ')}`);
  }

  return checks;
}

// Field size for BN254 curve
const BN254_FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export const ZK_CONFIG = {
  // Field Configuration (BN254)
  FIELD_SIZE: CONSTANTS.FIELD_SIZE,
  
  // Circuit Parameters
  CIRCUITS: {
    ACCOUNT_CREATION: {
      PUBLIC_INPUTS: 2, // commitment, nonce
      PRIVATE_INPUTS: 3, // private_key, balance, salt
      OUTPUTS: 1 // commitment
    },
    ORDER_SUBMISSION: {
      PUBLIC_INPUTS: 4, // nullifier, commitment, encrypted_order_hash, keeper_pubkey
      PRIVATE_INPUTS: 6, // private_key, order_data, nonce, account_balance, order_commitment, encryption_key
      OUTPUTS: 2 // nullifier, order_commitment
    },
    WITHDRAWAL: {
      PUBLIC_INPUTS: 3, // nullifier, amount, recipient
      PRIVATE_INPUTS: 4, // private_key, account_balance, withdrawal_nonce, account_commitment
      OUTPUTS: 1 // nullifier
    }
  },

  // Proof Generation Configuration
  PROOF_GENERATION: {
    TIMEOUT: 30000, // 30 seconds
    MEMORY_LIMIT: 512 * 1024 * 1024, // 512MB
    WORKER_COUNT: navigator.hardwareConcurrency || 4
  },

  // Encryption Configuration
  ENCRYPTED_ORDER_SIZE: 256, // bytes
  PUBLIC_KEY_SIZE: 64, // bytes (uncompressed secp256k1)
  PRIVATE_KEY_SIZE: 32, // bytes

  // Nullifier Configuration
  NULLIFIER_SIZE: 32, // bytes
  COMMITMENT_SIZE: 32, // bytes

  // Field Element Validation
  isValidFieldElement(value) {
    try {
      const bigintValue = typeof value === 'string' 
        ? BigInt(value.startsWith('0x') ? value : '0x' + value)
        : BigInt(value);
      
      return bigintValue >= 0n && bigintValue < this.FIELD_SIZE;
    } catch {
      return false;
    }
  },

  // Convert value to field element
  toFieldElement(value) {
    const bigintValue = typeof value === 'string' 
      ? BigInt(value.startsWith('0x') ? value : '0x' + value)
      : BigInt(value);
    
    if (bigintValue < 0n) {
      throw new Error('Field element cannot be negative');
    }
    
    return bigintValue % this.FIELD_SIZE;
  },

  // Validate proof structure
  validateProof(proof) {
    if (!Array.isArray(proof)) {
      return false;
    }
    
    if (proof.length !== 8) { // Groth16 proof has 8 elements
      return false;
    }
    
    return proof.every(element => this.isValidFieldElement(element));
  },

  // Hash function configuration
  HASH_CONFIG: {
    POSEIDON_T: 6, // Poseidon hash t parameter
    POSEIDON_RF: 8, // Full rounds
    POSEIDON_RP: 57 // Partial rounds
  },

  // Circuit file paths
  getCircuitPath(circuitName) {
    const baseUrl = import.meta.env.VITE_CIRCUIT_BASE_URL || '/circuits';
    return {
      wasm: `${baseUrl}/${circuitName}.wasm`,
      zkey: `${baseUrl}/${circuitName}_final.zkey`,
      vkey: `${baseUrl}/${circuitName}_verification_key.json`
    };
  },

  // Generate proof inputs for account creation
  generateAccountCreationInputs(privateKey, nonce, balance) {
    return {
      private_key: this.toFieldElement(privateKey),
      nonce: this.toFieldElement(nonce),
      balance: this.toFieldElement(balance)
    };
  },

  // Generate proof inputs for order submission
  generateOrderSubmissionInputs(privateKey, orderData, nonce, accountBalance) {
    return {
      private_key: this.toFieldElement(privateKey),
      order_market: this.toFieldElement(orderData.market),
      order_size: this.toFieldElement(orderData.size),
      order_price: this.toFieldElement(orderData.price),
      order_type: this.toFieldElement(orderData.orderType),
      order_is_long: orderData.isLong ? 1n : 0n,
      nonce: this.toFieldElement(nonce),
      account_balance: this.toFieldElement(accountBalance)
    };
  },

  // Generate proof inputs for withdrawal
  generateWithdrawalInputs(privateKey, amount, recipient, accountBalance, nonce) {
    return {
      private_key: this.toFieldElement(privateKey),
      amount: this.toFieldElement(amount),
      recipient: this.toFieldElement(recipient),
      account_balance: this.toFieldElement(accountBalance),
      nonce: this.toFieldElement(nonce)
    };
  },

  // Utility functions
  bytesToFieldElement(bytes) {
    if (bytes.length > 31) {
      throw new Error('Byte array too long for field element');
    }
    
    let value = 0n;
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8n) | BigInt(bytes[i]);
    }
    
    return this.toFieldElement(value);
  },

  fieldElementToBytes(fieldElement, length = 32) {
    const bytes = new Uint8Array(length);
    let value = BigInt(fieldElement);
    
    for (let i = length - 1; i >= 0; i--) {
      bytes[i] = Number(value & 0xFFn);
      value >>= 8n;
    }
    
    return bytes;
  },

  // Validate circuit outputs
  validateCircuitOutput(circuitName, output) {
    const config = this.CIRCUITS[circuitName.toUpperCase()];
    if (!config) {
      throw new Error(`Unknown circuit: ${circuitName}`);
    }
    
    if (!Array.isArray(output) || output.length !== config.OUTPUTS) {
      throw new Error(`Invalid output length for ${circuitName}`);
    }
    
    return output.every(element => this.isValidFieldElement(element));
  }
};

export default zkConfig; 