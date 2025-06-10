import { FieldElement, validateFieldElement } from './fieldElement.js';
import { CONSTANTS } from '../config/constants.js';

/**
 * Comprehensive input validation for TradePrivate
 */

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate trading order parameters
 */
export function validateOrderParams(orderParams) {
  if (!orderParams || typeof orderParams !== 'object') {
    throw new ValidationError('Order parameters must be an object');
  }

  // Validate market address
  if (!orderParams.market || typeof orderParams.market !== 'string') {
    throw new ValidationError('Market address is required', 'market');
  }
  
  if (!/^0x[a-fA-F0-9]{40}$/.test(orderParams.market)) {
    throw new ValidationError('Invalid market address format', 'market');
  }

  // Validate size
  if (!orderParams.size) {
    throw new ValidationError('Order size is required', 'size');
  }
  
  const size = parseFloat(orderParams.size);
  if (isNaN(size) || size <= 0) {
    throw new ValidationError('Order size must be a positive number', 'size');
  }
  
  const minSize = parseFloat(CONSTANTS.TRADING.MIN_ORDER_AMOUNT) / 1e6; // Convert from wei
  const maxSize = parseFloat(CONSTANTS.MAX_ORDER_SIZE);
  
  if (size < minSize) {
    throw new ValidationError(`Order size too small. Minimum: ${minSize} USDC`, 'size');
  }
  
  if (size > maxSize) {
    throw new ValidationError(`Order size too large. Maximum: ${maxSize} USDC`, 'size');
  }

  // Validate leverage
  if (orderParams.leverage !== undefined) {
    const leverage = parseInt(orderParams.leverage);
    if (isNaN(leverage) || leverage < 1 || leverage > CONSTANTS.TRADING.MAX_LEVERAGE) {
      throw new ValidationError(`Invalid leverage. Must be between 1 and ${CONSTANTS.TRADING.MAX_LEVERAGE}`, 'leverage');
    }
  }

  // Validate order type
  if (orderParams.orderType !== undefined) {
    const orderType = parseInt(orderParams.orderType);
    if (![0, 1, 2].includes(orderType)) {
      throw new ValidationError('Invalid order type. Must be 0 (market), 1 (limit), or 2 (stop)', 'orderType');
    }
  }

  // Validate price for limit orders
  if (orderParams.orderType === 1 && orderParams.price) {
    const price = parseFloat(orderParams.price);
    if (isNaN(price) || price <= 0) {
      throw new ValidationError('Price must be a positive number for limit orders', 'price');
    }
  }

  return true;
}

/**
 * Validate deposit/withdrawal amounts
 */
export function validateAmount(amount, type = 'amount') {
  if (amount === undefined || amount === null) {
    throw new ValidationError(`${type} is required`);
  }
  
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) {
    throw new ValidationError(`${type} must be a valid number`);
  }
  
  if (numericAmount <= 0) {
    throw new ValidationError(`${type} must be positive`);
  }
  
  if (numericAmount > 1e15) { // Reasonable upper limit
    throw new ValidationError(`${type} is too large`);
  }
  
  return numericAmount;
}

/**
 * Validate Ethereum addresses
 */
export function validateAddress(address, name = 'address') {
  if (!address || typeof address !== 'string') {
    throw new ValidationError(`${name} is required and must be a string`);
  }
  
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new ValidationError(`Invalid ${name} format`);
  }
  
  return address.toLowerCase();
}

/**
 * Validate field elements for ZK proofs
 */
export function validateZKInputs(inputs) {
  if (!inputs || typeof inputs !== 'object') {
    throw new ValidationError('ZK inputs must be an object');
  }
  
  for (const [key, value] of Object.entries(inputs)) {
    try {
      validateFieldElement(value);
    } catch (error) {
      throw new ValidationError(`Invalid field element for ${key}: ${error.message}`, key);
    }
  }
  
  return true;
}

/**
 * Validate nullifier uniqueness
 */
export function validateNullifier(nullifier) {
  if (!nullifier) {
    throw new ValidationError('Nullifier is required');
  }
  
  try {
    if (typeof nullifier === 'string') {
      // Should be hex string
      if (!/^0x[a-fA-F0-9]{64}$/.test(nullifier)) {
        throw new ValidationError('Nullifier must be a 64-character hex string');
      }
    } else {
      validateFieldElement(nullifier);
    }
  } catch (error) {
    throw new ValidationError(`Invalid nullifier: ${error.message}`);
  }
  
  return true;
}

/**
 * Validate commitment values
 */
export function validateCommitment(commitment) {
  if (!commitment) {
    throw new ValidationError('Commitment is required');
  }
  
  try {
    if (typeof commitment === 'string') {
      if (!/^0x[a-fA-F0-9]{64}$/.test(commitment)) {
        throw new ValidationError('Commitment must be a 64-character hex string');
      }
    } else {
      validateFieldElement(commitment);
    }
  } catch (error) {
    throw new ValidationError(`Invalid commitment: ${error.message}`);
  }
  
  return true;
}

/**
 * Sanitize string inputs to prevent XSS
 */
export function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }
  
  if (input.length > maxLength) {
    throw new ValidationError(`Input too long. Maximum ${maxLength} characters`);
  }
  
  // Remove potentially dangerous characters
  const sanitized = input
    .replace(/[<>'"&]/g, '') // Remove HTML/XSS chars
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
  
  return sanitized;
}

/**
 * Validate API rate limiting parameters
 */
export function validateRateLimit(windowMs, maxRequests) {
  if (typeof windowMs !== 'number' || windowMs <= 0) {
    throw new ValidationError('Window duration must be a positive number');
  }
  
  if (typeof maxRequests !== 'number' || maxRequests <= 0) {
    throw new ValidationError('Max requests must be a positive number');
  }
  
  if (windowMs > 24 * 60 * 60 * 1000) { // 24 hours max
    throw new ValidationError('Window duration too long');
  }
  
  if (maxRequests > 10000) {
    throw new ValidationError('Max requests too high');
  }
  
  return true;
}

/**
 * Comprehensive validation for batch operations
 */
export function validateBatch(items, maxBatchSize = CONSTANTS.MAX_BATCH_SIZE) {
  if (!Array.isArray(items)) {
    throw new ValidationError('Batch must be an array');
  }
  
  if (items.length === 0) {
    throw new ValidationError('Batch cannot be empty');
  }
  
  if (items.length > maxBatchSize) {
    throw new ValidationError(`Batch too large. Maximum ${maxBatchSize} items`);
  }
  
  return true;
}

/**
 * Validate time-based parameters
 */
export function validateTimestamp(timestamp, name = 'timestamp') {
  const ts = parseInt(timestamp);
  if (isNaN(ts)) {
    throw new ValidationError(`${name} must be a valid number`);
  }
  
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  if (ts < now - oneDay) {
    throw new ValidationError(`${name} is too old`);
  }
  
  if (ts > now + oneDay) {
    throw new ValidationError(`${name} is too far in the future`);
  }
  
  return ts;
}

export default {
  ValidationError,
  validateOrderParams,
  validateAmount,
  validateAddress,
  validateZKInputs,
  validateNullifier,
  validateCommitment,
  sanitizeString,
  validateRateLimit,
  validateBatch,
  validateTimestamp
}; 