// ===== BLOCKCHAIN CONSTANTS =====
export const CHAIN_IDS = {
  MAINNET: 1,
  SEPOLIA: 11155111,
  HARDHAT: 31337,
};

export const SUPPORTED_CHAINS = [CHAIN_IDS.MAINNET, CHAIN_IDS.SEPOLIA];

export const RPC_URLS = {
  [CHAIN_IDS.MAINNET]: import.meta.env.VITE_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
  [CHAIN_IDS.SEPOLIA]: import.meta.env.VITE_RPC_URL_TESTNET || 'https://eth-sepolia.g.alchemy.com/v2/vxz68BNmu4mmylbpscUiS_BszkE_TnUz',
  [CHAIN_IDS.HARDHAT]: 'http://127.0.0.1:8545'
};

// ===== CONTRACT ADDRESSES =====
export const CONTRACT_ADDRESSES = {
  [CHAIN_IDS.MAINNET]: {
    TRADE_PRIVATE: '0xC7f9bDe6F483205282064219a8aa084fb5a05b97',
    ZK_VERIFIER_MANAGER: '0x2BE2cEB1016Bb5aa15c95032E82b46Fd7C0E595c',
    TOKEN: '0xAfb77C2408AC6d3704d7476B2002BD7d035cF8D6' // Mock USDC
  },
  [CHAIN_IDS.SEPOLIA]: {
    TRADE_PRIVATE: '0xC7f9bDe6F483205282064219a8aa084fb5a05b97',
    ZK_VERIFIER_MANAGER: '0x2BE2cEB1016Bb5aa15c95032E82b46Fd7C0E595c',
    TOKEN: '0xAfb77C2408AC6d3704d7476B2002BD7d035cF8D6' // Mock USDC
  }
};

// ===== ZK CIRCUIT CONSTANTS =====
export const ZK_CIRCUITS = {
  ACCOUNT_CREATION: {
    // WASM: '/circuits/account_creation.wasm',
    ZKEY: '/circuits/account_creation.zkey'
  },
  ORDER_SUBMISSION: {
    // WASM: '/circuits/order_submission.wasm',
    ZKEY: '/circuits/order_submission.zkey'
  },
  BATCH_EXECUTION: {
    // WASM: '/circuits/batch_execution.wasm',
    ZKEY: '/circuits/batch_execution.zkey'
  }
};

// ===== CRYPTO CONSTANTS =====
export const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
export const ENCRYPTED_ORDER_SIZE = 512;
export const MAX_ORDER_SIZE = parseInt(import.meta.env.VITE_MAX_ORDER_SIZE) || 1000000;
export const MAX_BATCH_SIZE = parseInt(import.meta.env.VITE_MAX_BATCH_SIZE) || 10;

// ===== TIMEOUTS & LIMITS =====
export const TIMEOUTS = {
  COMMIT_REVEAL_DELAY: 240, // blocks (~1 hour)
  ORDER_EXPIRATION: 7200, // blocks (~24 hours)
  KEEPER_COOLDOWN: 50, // blocks
  SESSION_TIMEOUT: parseInt(import.meta.env.VITE_SESSION_TIMEOUT) || 3600000, // 1 hour in ms
  PROOF_GENERATION_TIMEOUT: 30000, // 30 seconds
  TRANSACTION_TIMEOUT: 60000 // 1 minute
};

// ===== SECURITY CONSTANTS =====
export const SECURITY = {
  MIN_KEEPER_STAKE: BigInt('10000000000'), // 10,000 USDC (6 decimals)
  MAX_KEEPERS: 100,
  SLASH_THRESHOLD: 10, // 10% failed batches
  MAX_CONCURRENT_SESSIONS: parseInt(import.meta.env.VITE_MAX_CONCURRENT_SESSIONS) || 5,
  HKDF_SALT: import.meta.env.VITE_HKDF_SALT || 'tradeprivate-default-salt-32bytes',
  ENCRYPTION_ENABLED: import.meta.env.VITE_ENCRYPTION_ENABLED === 'true'
};

// ===== API ENDPOINTS =====
export const API_ENDPOINTS = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://api.tradeprivate.finance',
  WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL || 'wss://ws.tradeprivate.finance',
  IPFS_GATEWAY: import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
  METRICS_ENDPOINT: '/metrics'
};

// ===== WALLET CONNECT =====
export const WALLETCONNECT_CONFIG = {
  PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'default-project-id',
  CHAINS: SUPPORTED_CHAINS,
  METADATA: {
    name: 'TradePrivate',
    description: 'Privacy-First Perpetual DEX',
    url: 'https://tradeprivate.finance',
    icons: ['https://tradeprivate.finance/icon.png']
  }
};

// ===== DEVELOPMENT FLAGS =====
export const DEV_FLAGS = {
  DEV_MODE: import.meta.env.VITE_DEV_MODE === 'true',
  DEBUG_LOGS: import.meta.env.VITE_DEBUG_LOGS === 'true',
  MOCK_ZK_PROOFS: import.meta.env.VITE_MOCK_ZK_PROOFS === 'true',
  SKIP_SIGNATURE_VERIFICATION: import.meta.env.VITE_SKIP_SIGNATURE_VERIFICATION === 'true',
  ANALYTICS_ENABLED: import.meta.env.VITE_ANALYTICS_ENABLED === 'true'
};

// ===== FEATURE FLAGS =====
export const FEATURES = {
  DARK_MODE: import.meta.env.VITE_FEATURE_DARK_MODE === 'true',
  ADVANCED_TRADING: import.meta.env.VITE_FEATURE_ADVANCED_TRADING === 'true',
  ANALYTICS_DASHBOARD: import.meta.env.VITE_FEATURE_ANALYTICS_DASHBOARD === 'true',
  SOCIAL_TRADING: import.meta.env.VITE_FEATURE_SOCIAL_TRADING === 'true'
};

// ===== UI CONSTANTS =====
export const UI = {
  ANIMATION_DURATION: 200,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 5000,
  CONFIRMATION_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// ===== TRADING CONSTANTS =====
export const TRADING = {
  MIN_ORDER_AMOUNT: BigInt('1000000'), // 1 USDC
  MAX_LEVERAGE: 100,
  DEFAULT_SLIPPAGE: 0.5, // 0.5%
  MAX_SLIPPAGE: 10, // 10%
  PRECISION_DECIMALS: 6 // USDC decimals
};

// ===== ERROR MESSAGES =====
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INVALID_AMOUNT: 'Invalid amount',
  PROOF_GENERATION_FAILED: 'Failed to generate zero-knowledge proof',
  TRANSACTION_FAILED: 'Transaction failed',
  NETWORK_ERROR: 'Network error occurred',
  UNAUTHORIZED: 'Unauthorized access',
  SESSION_EXPIRED: 'Session expired',
  CIRCUIT_NOT_LOADED: 'ZK circuit not loaded',
  INVALID_SIGNATURE: 'Invalid signature'
};

// ===== LOCAL STORAGE KEYS =====
export const STORAGE_KEYS = {
  PRIVATE_KEY: 'tp_private_key',
  SESSION_TOKEN: 'tp_session_token',
  USER_PREFERENCES: 'tp_user_preferences',
  ACCOUNT_COMMITMENTS: 'tp_account_commitments',
  CACHED_PROOFS: 'tp_cached_proofs',
  THEME: 'tp_theme'
};

// ===== MONITORING =====
export const MONITORING = {
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  PROMETHEUS_ENABLED: import.meta.env.VITE_PROMETHEUS_ENABLED === 'true',
  PERFORMANCE_THRESHOLD: 1000, // ms
  ERROR_THRESHOLD: 5, // errors per minute
  HEALTH_CHECK_INTERVAL: 30000 // 30 seconds
};

export const CONSTANTS = {
  // Network Configuration
  CHAIN_ID: parseInt(import.meta.env.VITE_CHAIN_ID || '11155111'), // Sepolia testnet by default
  RPC_URL: import.meta.env.VITE_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/vxz68BNmu4mmylbpscUiS_BszkE_TnUz',
  BACKUP_RPC_URL: import.meta.env.VITE_BACKUP_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY',

  // Contract Addresses
  CONTRACTS: {
    TRADE_PRIVATE: '0xC7f9bDe6F483205282064219a8aa084fb5a05b97',
    ZK_VERIFIER_MANAGER: '0x2BE2cEB1016Bb5aa15c95032E82b46Fd7C0E595c',
    USDC: '0xAfb77C2408AC6d3704d7476B2002BD7d035cF8D6' // Mock USDC
  },

  // Trading Parameters
  MIN_ORDER_SIZE: '100', // Minimum order size in USDC
  MAX_ORDER_SIZE: '1000000', // Maximum order size in USDC
  MAX_LEVERAGE: 50,
  
  // Privacy Parameters
  COMMIT_REVEAL_DELAY: 240, // blocks
  SESSION_DURATION: 4 * 60 * 60 * 1000, // 4 hours in ms
  WARNING_TIME: 15 * 60 * 1000, // 15 minutes before expiry
  
  // ZK Circuit Configuration
  CIRCUITS: {
    ACCOUNT_CREATION: {
      // WASM: '/circuits/account_creation.wasm',
      ZKEY: '/circuits/account_creation.zkey'
    },
    ORDER_SUBMISSION: {
      // WASM: '/circuits/order_submission.wasm',
      ZKEY: '/circuits/order_submission.zkey'
    },
    WITHDRAWAL: {
      // WASM: '/circuits/withdrawal.wasm',
      ZKEY: '/circuits/withdrawal.zkey'
    }
  },

  // Field Element Configuration (BN254)
  FIELD_SIZE: BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617'),
  
  // Encryption Configuration
  ENCRYPTION: {
    KEY_LENGTH: 32, // bytes
    IV_LENGTH: 16, // bytes for AES
    TAG_LENGTH: 16, // bytes for auth tag
    SALT_LENGTH: 32 // bytes for HKDF
  },

  // Gas Configuration
  GAS_LIMITS: {
    COMMIT_ACCOUNT: 100000,
    REVEAL_ACCOUNT: 200000,
    SUBMIT_ORDER: 300000,
    WITHDRAW: 150000,
    DEPOSIT: 100000
  },

  // Retry Configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 10000,
    BACKOFF_FACTOR: 2
  },

  // Storage Keys
  STORAGE_KEYS: {
    SESSION_ID: 'tradeprivate-session',
    ACCOUNT_DATA: 'tradeprivate-account',
    PENDING_COMMIT: 'tradeprivate-pending',
    ORDER_HISTORY: 'tradeprivate-orders',
    SETTINGS: 'tradeprivate-settings'
  },

  // Monitoring
  METRICS: {
    MAX_EVENTS: 1000,
    SLOW_PROOF_THRESHOLD: 5000, // ms
    HIGH_FAILURE_THRESHOLD: 5
  },

  // UI Configuration
  UI: {
    TOAST_DURATION: 5000,
    REFRESH_INTERVAL: 30000,
    BLOCK_UPDATE_INTERVAL: 12000
  }
}; 