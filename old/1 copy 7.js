// ===== src/lib/config/constants.js =====
export const CONSTANTS = {
  // Network
  CHAIN_ID: parseInt(import.meta.env.VITE_CHAIN_ID || '1'),
  RPC_URL: import.meta.env.VITE_RPC_URL,
  BACKUP_RPC_URL: import.meta.env.VITE_BACKUP_RPC_URL,
  
  // Contracts
  CONTRACTS: {
    TRADE_PRIVATE: import.meta.env.VITE_TRADE_PRIVATE_ADDRESS,
    ZK_VERIFIER_MANAGER: import.meta.env.VITE_ZK_VERIFIER_MANAGER_ADDRESS,
    USDC: import.meta.env.VITE_USDC_ADDRESS
  },
  
  // Protocol Parameters
  COMMIT_REVEAL_DELAY: 240, // blocks (~1 hour on mainnet)
  MIN_KEEPER_STAKE: '10000000000', // 10,000 USDC (6 decimals)
  KEEPER_COOLDOWN: 50, // blocks
  ORDER_EXPIRATION: 7200, // blocks (~24 hours)
  MAX_BATCH_SIZE: 10,
  ENCRYPTED_ORDER_SIZE: 512,
  
  // UI
  POLLING_INTERVAL: 12000, // 12 seconds
  SESSION_DURATION: 30 * 60 * 1000, // 30 minutes
  WARNING_TIME: 5 * 60 * 1000, // 5 minutes before expiry
  
  // Validation
  MAX_ORDER_SIZE: '1000000', // 1M USDC
  MIN_ORDER_SIZE: '100', // 100 USDC
  MAX_LEVERAGE: 50,
  
  // Error messages
  ERRORS: {
    NO_WALLET: 'Please connect your wallet',
    WRONG_NETWORK: 'Please switch to Ethereum Mainnet',
    INSUFFICIENT_BALANCE: 'Insufficient balance',
    NO_KEEPERS: 'No active keepers available',
    NULLIFIER_USED: 'This order has already been submitted',
    INVALID_PROOF: 'Invalid zero-knowledge proof',
    SESSION_EXPIRED: 'Your session has expired'
  }
};

// ===== src/lib/config/zkConfig.js =====
export const ZK_CONFIG = {
  // Field parameters for BN254 curve
  FIELD_SIZE: BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617'),
  
  // Circuit endpoints
  CIRCUIT_BASE_URL: import.meta.env.VITE_CIRCUIT_BASE_URL || '',
  CIRCUIT_URLS: {
    accountCreation: '/account_creation.wasm',
    orderSubmission: '/order_submission.wasm',
    batchExecution: '/batch_execution.wasm'
  },
  
  // Proving keys
  PROVING_KEYS: {
    accountCreation: '/account_creation_pk.bin',
    orderSubmission: '/order_submission_pk.bin',
    batchExecution: '/batch_execution_pk.bin'
  },
  
  // Circuit parameters
  ENCRYPTED_ORDER_SIZE: 512,
  COMMITMENT_LEVELS: 20, // Merkle tree depth
  MAX_BATCH_SIZE: 10,
  
  // Performance
  PROOF_GENERATION_TIMEOUT: 30000, // 30 seconds
  CIRCUIT_CACHE_SIZE: 3,
  
  // Validation
  isValidFieldElement(value) {
    try {
      const bigIntValue = BigInt(value);
      return bigIntValue >= 0n && bigIntValue < this.FIELD_SIZE;
    } catch {
      return false;
    }
  }
};

// ===== src/lib/contracts/abis/TradePrivate.json =====
{
  "abi": [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_verifierManager",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "AccountDoesNotExist",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "CommitRevealTooEarly",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InsufficientBalance",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidBatchSize",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidCommitment",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidFieldElement",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidProof",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidStateTransition",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "MaxKeeperCapReached",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NullifierAlreadyUsed",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "OrderExpired",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "UnauthorizedKeeper",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "batchHash",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "ordersProcessed",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "keeper",
          "type": "address"
        }
      ],
      "name": "BatchExecuted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "DepositMade",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "EmergencyPauseActivated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "keeper",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "stake",
          "type": "uint256"
        }
      ],
      "name": "KeeperRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "keeper",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "KeeperSlashed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "nullifier",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "expirationBlock",
          "type": "uint256"
        }
      ],
      "name": "PrivateOrderSubmitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "oldRoot",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "newRoot",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "StateTransition",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "commitment",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "TradingAccountCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "WithdrawalMade",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "DOMAIN_SEPARATOR",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "TOKEN",
      "outputs": [
        {
          "internalType": "contract IERC20",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "VERIFIER_MANAGER",
      "outputs": [
        {
          "internalType": "contract ZKVerifierManager",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "accountBalances",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "activeKeeperList",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "balances",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "commitHash",
          "type": "bytes32"
        }
      ],
      "name": "commitTradingAccount",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "deposit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "emergencyPause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "emergencyPauseTime",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "emergencyUnpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32[]",
          "name": "nullifiers",
          "type": "bytes32[]"
        },
        {
          "internalType": "uint256[8]",
          "name": "batchProof",
          "type": "uint256[8]"
        },
        {
          "internalType": "bytes32",
          "name": "newStateRoot",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "executionData",
          "type": "bytes"
        }
      ],
      "name": "executeBatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "keeperAddr",
          "type": "address"
        }
      ],
      "name": "getKeeperReputation",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTVL",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "nullifier",
          "type": "bytes32"
        }
      ],
      "name": "isOrderValid",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "keepers",
      "outputs": [
        {
          "internalType": "address",
          "name": "addr",
          "type": "address"
        },
        {
          "internalType": "uint96",
          "name": "stake",
          "type": "uint96"
        },
        {
          "internalType": "uint128",
          "name": "lastActionBlock",
          "type": "uint128"
        },
        {
          "internalType": "uint64",
          "name": "reputationScore",
          "type": "uint64"
        },
        {
          "internalType": "uint32",
          "name": "successfulBatches",
          "type": "uint32"
        },
        {
          "internalType": "uint32",
          "name": "failedBatches",
          "type": "uint32"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "isSlashed",
          "type": "bool"
        },
        {
          "internalType": "bytes32",
          "name": "publicKey",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "lastStateUpdate",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pendingStateRoot",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "protocolNonce",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "publicKey",
          "type": "bytes32"
        }
      ],
      "name": "registerKeeper",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "commitment",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        },
        {
          "internalType": "uint256[8]",
          "name": "proof",
          "type": "uint256[8]"
        }
      ],
      "name": "revealTradingAccount",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "keeperAddr",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "slashAmount",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "slashKeeper",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "slashingPool",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "stateRoot",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256[8]",
          "name": "proof",
          "type": "uint256[8]"
        },
        {
          "internalType": "bytes32",
          "name": "nullifier",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "commitment",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "orderCommitment",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "encryptedOrder",
          "type": "bytes"
        }
      ],
      "name": "submitOrderPrivate",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalKeeperStake",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "tradingAccounts",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "usedNullifiers",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "userPrimaryAccount",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256[8]",
          "name": "proof",
          "type": "uint256[8]"
        }
      ],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
}

// ===== src/lib/contracts/abis/ZKVerifierManager.json =====
{
  "abi": [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_governance",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "circuitId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "verifier",
          "type": "address"
        }
      ],
      "name": "VerifierUpdated",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "ACCOUNT_CREATION_CIRCUIT",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "BATCH_EXECUTION_CIRCUIT",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "ORDER_SUBMISSION_CIRCUIT",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "governance",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "circuitId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "verifierAddress",
          "type": "address"
        }
      ],
      "name": "updateVerifier",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256[8]",
          "name": "proof",
          "type": "uint256[8]"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "commitment",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "balance",
          "type": "uint256"
        }
      ],
      "name": "verifyAccountCreation",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256[8]",
          "name": "proof",
          "type": "uint256[8]"
        },
        {
          "internalType": "bytes32",
          "name": "oldStateRoot",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "newStateRoot",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "batchHash",
          "type": "bytes32"
        }
      ],
      "name": "verifyBatchExecution",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256[8]",
          "name": "proof",
          "type": "uint256[8]"
        },
        {
          "internalType": "bytes32",
          "name": "nullifier",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "commitment",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "orderCommitment",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "orderDataHash",
          "type": "bytes32"
        }
      ],
      "name": "verifyOrderSubmission",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "verifiers",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
}