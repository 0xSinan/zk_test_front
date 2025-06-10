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