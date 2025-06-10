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