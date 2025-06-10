// ===== src/lib/contracts/index.js =====
import { ethers } from 'ethers';
import TradePrivateABI from './abis/TradePrivate.json';
import ZKVerifierManagerABI from './abis/ZKVerifierManager.json';
import { CONSTANTS } from '../config/constants.js';

const CONTRACTS = {
  TradePrivate: {
    address: CONSTANTS.CONTRACTS.TRADE_PRIVATE,
    abi: TradePrivateABI.abi
  },
  ZKVerifierManager: {
    address: CONSTANTS.CONTRACTS.ZK_VERIFIER_MANAGER,
    abi: ZKVerifierManagerABI.abi
  },
  USDC: {
    address: CONSTANTS.CONTRACTS.USDC,
    abi: [
      'function balanceOf(address) view returns (uint256)',
      'function allowance(address,address) view returns (uint256)',
      'function approve(address,uint256) returns (bool)',
      'function transfer(address,uint256) returns (bool)',
      'function decimals() view returns (uint8)'
    ]
  }
};

let provider = null;
let signer = null;
let contracts = {};

export async function initializeProvider() {
  if (provider) return provider;
  
  if (typeof window !== 'undefined' && window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
    
    // Request account access if needed
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      signer = await provider.getSigner();
    } catch (error) {
      console.error('User denied account access');
    }
    
    // Listen for account changes
    window.ethereum.on('accountsChanged', async (accounts) => {
      if (accounts.length > 0) {
        signer = await provider.getSigner();
        // Clear contract cache to reinitialize with new signer
        contracts = {};
      }
    });
    
    // Listen for chain changes
    window.ethereum.on('chainChanged', () => {
      window.location.reload();
    });
  } else {
    // Fallback to read-only provider
    provider = new ethers.JsonRpcProvider(CONSTANTS.RPC_URL);
  }
  
  return provider;
}

export async function getContract(name, requireSigner = false) {
  const key = `${name}_${requireSigner}`;
  
  if (contracts[key]) {
    return contracts[key];
  }
  
  if (!provider) {
    await initializeProvider();
  }
  
  const contractInfo = CONTRACTS[name];
  if (!contractInfo) {
    throw new Error(`Contract ${name} not found`);
  }
  
  if (!contractInfo.address || contractInfo.address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Contract ${name} address not configured`);
  }
  
  let contractSigner = provider;
  
  if (requireSigner) {
    if (!signer) {
      throw new Error('No signer available. Please connect wallet.');
    }
    contractSigner = signer;
  }
  
  const contract = new ethers.Contract(
    contractInfo.address,
    contractInfo.abi,
    contractSigner
  );
  
  contracts[key] = contract;
  return contract;
}

export async function getSigner() {
  if (!signer) {
    await initializeProvider();
  }
  return signer;
}

export async function getProvider() {
  if (!provider) {
    await initializeProvider();
  }
  return provider;
}

export async function getCurrentAddress() {
  const signer = await getSigner();
  if (!signer) return null;
  return await signer.getAddress();
}

export async function getNetwork() {
  const provider = await getProvider();
  const network = await provider.getNetwork();
  return network;
}

export async function switchToNetwork(chainId) {
  if (!window.ethereum) {
    throw new Error('No wallet available');
  }
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error) {
    // This error code indicates that the chain has not been added to MetaMask
    if (error.code === 4902) {
      throw new Error('Please add this network to your wallet');
    }
    throw error;
  }
}

// ===== src/lib/utils/errors.js =====
export class TradePrivateError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'TradePrivateError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends TradePrivateError {
  constructor(errors) {
    super('Validation failed', 'VALIDATION_ERROR', errors);
    this.errors = errors;
  }
}

export class NetworkError extends TradePrivateError {
  constructor(message, details) {
    super(message, 'NETWORK_ERROR', details);
  }
}

export class ContractError extends TradePrivateError {
  constructor(message, details) {
    super(message, 'CONTRACT_ERROR', details);
  }
}

export class ZKProofError extends TradePrivateError {
  constructor(message, details) {
    super(message, 'ZKPROOF_ERROR', details);
  }
}

export function parseContractError(error) {
  // Check for common revert reasons
  const errorString = error.toString();
  
  if (errorString.includes('NullifierAlreadyUsed')) {
    return new ContractError('This order has already been submitted', error);
  }
  
  if (errorString.includes('InsufficientBalance')) {
    return new ContractError('Insufficient balance', error);
  }
  
  if (errorString.includes('AccountDoesNotExist')) {
    return new ContractError('Trading account does not exist', error);
  }
  
  if (errorString.includes('InvalidProof')) {
    return new ZKProofError('Invalid zero-knowledge proof', error);
  }
  
  if (errorString.includes('UnauthorizedKeeper')) {
    return new ContractError('No authorized keeper available', error);
  }
  
  if (errorString.includes('CommitRevealTooEarly')) {
    return new ContractError('Please wait before revealing account', error);
  }
  
  if (errorString.includes('user rejected')) {
    return new ContractError('Transaction rejected by user', error);
  }
  
  // Generic error
  return new ContractError('Transaction failed', error);
}

export class ErrorHandler {
  static async withRetry(fn, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      shouldRetry = (error) => true,
      onRetry = (attempt, error) => {}
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i === maxRetries || !shouldRetry(error)) {
          throw error;
        }

        console.warn(`Attempt ${i + 1} failed:`, error.message);
        onRetry(i + 1, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffFactor, maxDelay);
      }
    }

    throw lastError;
  }

  static isRetryableError(error) {
    const message = error.message || error.toString();
    
    // Network errors - retry
    if (message.includes('network') || 
        message.includes('timeout') ||
        message.includes('ETIMEDOUT') ||
        message.includes('ECONNREFUSED')) {
      return true;
    }
    
    // Nonce errors - retry
    if (message.includes('nonce') || message.includes('replacement fee too low')) {
      return true;
    }
    
    // Rate limiting - retry with backoff
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }
    
    // User rejection - don't retry
    if (message.includes('user rejected') || message.includes('User denied')) {
      return false;
    }
    
    // Insufficient funds - don't retry
    if (message.includes('insufficient funds') || 
        message.includes('InsufficientBalance')) {
      return false;
    }
    
    // Contract reverts - don't retry
    if (message.includes('revert') || 
        message.includes('NullifierAlreadyUsed') ||
        message.includes('AccountDoesNotExist')) {
      return false;
    }
    
    // ZK proof errors - don't retry
    if (message.includes('InvalidProof') || message.includes('proof')) {
      return false;
    }
    
    return true;
  }
}

// ===== src/lib/utils/validation.js =====
import { ethers } from 'ethers';
import { CONSTANTS } from '../config/constants.js';
import { ZK_CONFIG } from '../config/zkConfig.js';
import { ValidationError } from './errors.js';

export class InputValidator {
  static validateAddress(address, fieldName = 'address') {
    const errors = [];
    
    if (!address) {
      errors.push(`${fieldName} is required`);
      return errors;
    }
    
    try {
      ethers.getAddress(address); // Will throw if invalid
    } catch {
      errors.push(`Invalid ${fieldName} format`);
    }
    
    return errors;
  }
  
  static validateAmount(amount, fieldName = 'amount', min = '0', max = null) {
    const errors = [];
    
    if (!amount && amount !== 0) {
      errors.push(`${fieldName} is required`);
      return errors;
    }
    
    const value = parseFloat(amount);
    if (isNaN(value)) {
      errors.push(`${fieldName} must be a number`);
      return errors;
    }
    
    if (value <= parseFloat(min)) {
      errors.push(`${fieldName} must be greater than ${min}`);
    }
    
    if (max && value > parseFloat(max)) {
      errors.push(`${fieldName} must be less than or equal to ${max}`);
    }
    
    return errors;
  }
  
  static validateOrderParams(params) {
    const errors = [];
    
    // Market validation
    errors.push(...this.validateAddress(params.market, 'market'));
    
    // Size validation
    errors.push(...this.validateAmount(
      params.size,
      'size',
      CONSTANTS.MIN_ORDER_SIZE,
      CONSTANTS.MAX_ORDER_SIZE
    ));
    
    // Price validation for limit/stop orders
    if (params.orderType === 1 || params.orderType === 2) {
      errors.push(...this.validateAmount(params.price, 'price', '0'));
    }
    
    // Leverage validation
    if (params.leverage) {
      const leverage = parseFloat(params.leverage);
      if (leverage < 1 || leverage > CONSTANTS.MAX_LEVERAGE) {
        errors.push(`Leverage must be between 1 and ${CONSTANTS.MAX_LEVERAGE}`);
      }
    }
    
    // TP/SL validation
    if (params.tpPrice) {
      errors.push(...this.validateAmount(params.tpPrice, 'take profit', '0'));
    }
    
    if (params.slPrice) {
      errors.push(...this.validateAmount(params.slPrice, 'stop loss', '0'));
    }
    
    // Logical validation for TP/SL
    if (params.tpPrice && params.slPrice) {
      const tp = parseFloat(params.tpPrice);
      const sl = parseFloat(params.slPrice);
      
      if (params.isLong) {
        if (tp <= sl) {
          errors.push('Take profit must be higher than stop loss for long positions');
        }
      } else {
        if (tp >= sl) {
          errors.push('Take profit must be lower than stop loss for short positions');
        }
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
    
    return true;
  }
  
  static validateFieldElement(value, fieldName = 'value') {
    if (!ZK_CONFIG.isValidFieldElement(value)) {
      throw new ValidationError([`${fieldName} is not a valid field element`]);
    }
    return true;
  }
  
  static validateCommitment(commitment) {
    const errors = [];
    
    if (!commitment) {
      errors.push('Commitment is required');
    } else if (!commitment.match(/^0x[a-fA-F0-9]{64}$/)) {
      errors.push('Invalid commitment format');
    } else {
      try {
        this.validateFieldElement(commitment, 'commitment');
      } catch (e) {
        errors.push(e.errors[0]);
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
    
    return true;
  }
  
  static validateNullifier(nullifier) {
    const errors = [];
    
    if (!nullifier) {
      errors.push('Nullifier is required');
    } else if (!nullifier.match(/^0x[a-fA-F0-9]{64}$/)) {
      errors.push('Invalid nullifier format');
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
    
    return true;
  }
  
  static sanitizeAddress(address) {
    if (!address) throw new ValidationError(['Address is required']);
    
    // Remove whitespace
    address = address.trim();
    
    // Add 0x prefix if missing
    if (!address.startsWith('0x')) {
      address = '0x' + address;
    }
    
    // Validate and convert to checksum address
    try {
      return ethers.getAddress(address);
    } catch {
      throw new ValidationError(['Invalid Ethereum address']);
    }
  }
  
  static sanitizeAmount(amount) {
    if (!amount && amount !== 0) {
      throw new ValidationError(['Amount is required']);
    }
    
    // Convert to string and remove any non-numeric characters except . and -
    const cleaned = amount.toString().replace(/[^0-9.-]/g, '');
    
    const value = parseFloat(cleaned);
    if (isNaN(value)) {
      throw new ValidationError(['Invalid amount']);
    }
    
    // Limit decimal places
    return value.toFixed(6);
  }
}

// ===== src/lib/utils/monitoring.js =====
import { CONSTANTS } from '../config/constants.js';

export class TradePrivateMonitoring {
  static events = [];
  static metrics = {
    proofGenerationTimes: [],
    transactionFailures: 0,
    nullifierCollisions: 0,
    keeperFailures: new Map(),
    networkErrors: 0,
    userActions: new Map()
  };

  static logEvent(type, data) {
    const event = {
      type,
      data,
      timestamp: Date.now(),
      sessionId: sessionStorage.getItem('tradeprivate-session'),
      userAgent: navigator.userAgent,
      network: window.ethereum?.networkVersion
    };

    this.events.push(event);

    // Send to analytics service if configured
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', `tradeprivate_${type}`, {
        event_category: 'TradePrivate',
        event_label: data.label || type,
        value: data.value
      });
    }

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[TradePrivate] ${type}:`, data);
    }
  }

  static trackProofGeneration(type, duration) {
    this.metrics.proofGenerationTimes.push({
      type,
      duration,
      timestamp: Date.now()
    });

    this.logEvent('proof_generation', { type, duration });

    // Alert if generation is slow
    if (duration > 5000) {
      console.warn(`Slow proof generation: ${type} took ${duration}ms`);
      this.logEvent('slow_proof_generation', { type, duration });
    }
  }

  static trackTransactionFailure(error, context) {
    this.metrics.transactionFailures++;
    
    const errorData = {
      message: error.message,
      code: error.code,
      context,
      stack: import.meta.env.DEV ? error.stack : undefined
    };

    this.logEvent('transaction_failure', errorData);

    // Track specific error types
    if (error.message.includes('NullifierAlreadyUsed')) {
      this.metrics.nullifierCollisions++;
    } else if (error.message.includes('network')) {
      this.metrics.networkErrors++;
    }

    // Alert on high failure rate
    if (this.metrics.transactionFailures % 5 === 0) {
      console.error('High transaction failure rate detected:', this.metrics.transactionFailures);
    }
  }

  static trackKeeperFailure(keeperAddress, reason) {
    const failures = this.metrics.keeperFailures.get(keeperAddress) || 0;
    this.metrics.keeperFailures.set(keeperAddress, failures + 1);

    this.logEvent('keeper_failure', {
      keeper: keeperAddress,
      reason,
      totalFailures: failures + 1
    });
  }

  static trackUserAction(action, data = {}) {
    const count = this.metrics.userActions.get(action) || 0;
    this.metrics.userActions.set(action, count + 1);

    this.logEvent('user_action', {
      action,
      ...data
    });
  }

  static getMetricsSummary() {
    const proofTimes = this.metrics.proofGenerationTimes;
    const avgProofTime = proofTimes.length > 0
      ? proofTimes.reduce((sum, p) => sum + p.duration, 0) / proofTimes.length
      : 0;

    const recentProofTimes = proofTimes.filter(
      p => Date.now() - p.timestamp < 3600000 // Last hour
    );

    return {
      avgProofGenerationTime: Math.round(avgProofTime),
      recentAvgProofTime: recentProofTimes.length > 0
        ? Math.round(recentProofTimes.reduce((sum, p) => sum + p.duration, 0) / recentProofTimes.length)
        : 0,
      totalTransactions: this.events.filter(e => e.type === 'transaction_success').length,
      transactionFailures: this.metrics.transactionFailures,
      failureRate: this.metrics.transactionFailures / 
        (this.events.filter(e => e.type.includes('transaction')).length || 1),
      nullifierCollisions: this.metrics.nullifierCollisions,
      networkErrors: this.metrics.networkErrors,
      topFailingKeepers: Array.from(this.metrics.keeperFailures.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      userActions: Object.fromEntries(this.metrics.userActions)
    };
  }

  static exportMetrics() {
    const summary = this.getMetricsSummary();
    const data = {
      summary,
      events: this.events,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeprivate-metrics-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}