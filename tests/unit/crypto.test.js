import { describe, it, expect, beforeEach } from 'vitest';
import { FieldElement } from '../../src/lib/crypto/fieldElement.js';
import { CommitmentGenerator } from '../../src/lib/crypto/commitmentGenerator.js';
import { NullifierGenerator } from '../../src/lib/crypto/nullifierGenerator.js';

describe('FieldElement', () => {
  it('should create field element from bigint', () => {
    const value = 123n;
    const element = new FieldElement(value);
    expect(element.value).toBe(value);
  });

  it('should create field element from string', () => {
    const element = FieldElement.fromString('123');
    expect(element.value).toBe(123n);
  });

  it('should handle field size modulo', () => {
    const largeValue = FieldElement.FIELD_SIZE + 1n;
    const element = new FieldElement(largeValue);
    expect(element.value).toBe(1n);
  });

  it('should add field elements correctly', () => {
    const a = new FieldElement(100n);
    const b = new FieldElement(200n);
    const result = a.add(b);
    expect(result.value).toBe(300n);
  });

  it('should multiply field elements correctly', () => {
    const a = new FieldElement(10n);
    const b = new FieldElement(20n);
    const result = a.multiply(b);
    expect(result.value).toBe(200n);
  });

  it('should generate random field elements', () => {
    const element1 = FieldElement.random();
    const element2 = FieldElement.random();
    
    expect(element1.value).not.toBe(element2.value);
    expect(element1.value).toBeLessThan(FieldElement.FIELD_SIZE);
    expect(element2.value).toBeLessThan(FieldElement.FIELD_SIZE);
  });

  it('should convert to hex string', () => {
    const element = new FieldElement(255n);
    expect(element.toHex()).toBe('ff');
  });

  it('should convert to bytes', () => {
    const element = new FieldElement(255n);
    const bytes = element.toBytes();
    expect(bytes[bytes.length - 1]).toBe(255);
  });
});

describe('CommitmentGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new CommitmentGenerator();
  });

  it('should generate salt', () => {
    const salt1 = generator.generateSalt();
    const salt2 = generator.generateSalt();
    
    expect(salt1).not.toBe(salt2);
    expect(typeof salt1).toBe('bigint');
  });

  it('should create commitment with salt', () => {
    const value = 'test_value';
    const commitment = generator.createCommitment(value);
    
    expect(commitment).toHaveProperty('commitment');
    expect(commitment).toHaveProperty('salt');
    expect(commitment).toHaveProperty('value');
    expect(typeof commitment.commitment).toBe('string');
  });

  it('should verify commitment correctly', () => {
    const value = 'test_value';
    const commitment = generator.createCommitment(value);
    
    const isValid = generator.verifyCommitment(
      commitment.commitment,
      commitment.value,
      commitment.salt
    );
    
    expect(isValid).toBe(true);
  });

  it('should create account commitment', () => {
    const publicKey = 123n;
    const balance = '1000';
    
    const commitment = generator.createAccountCommitment(publicKey, balance);
    
    expect(commitment).toHaveProperty('commitment');
    expect(commitment).toHaveProperty('publicKey');
    expect(commitment).toHaveProperty('balance');
    expect(commitment).toHaveProperty('timestamp');
    expect(commitment.balance).toBe(balance);
  });

  it('should create order commitment', () => {
    const orderData = {
      market: '0x0000000000000000000000000000000000000001',
      size: '1000',
      price: '2500',
      isLong: true,
      orderType: 0,
      leverage: 10,
      accountCommitment: 'abc123'
    };
    
    const commitment = generator.createOrderCommitment(orderData);
    
    expect(commitment).toHaveProperty('commitment');
    expect(commitment).toHaveProperty('orderData');
    expect(commitment).toHaveProperty('salt');
    expect(commitment.orderData).toEqual(orderData);
  });

  it('should create merkle commitment from array', () => {
    const commitments = ['abc123', 'def456', 'ghi789'];
    const merkleRoot = generator.createMerkleCommitment(commitments);
    
    expect(typeof merkleRoot).toBe('string');
    expect(merkleRoot).not.toBe('0');
  });

  it('should handle empty merkle commitment', () => {
    const merkleRoot = generator.createMerkleCommitment([]);
    expect(merkleRoot).toBe('0');
  });
});

describe('NullifierGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new NullifierGenerator();
    generator.clearUsedNullifiers();
  });

  it('should generate account nullifier', () => {
    const privateKey = 123n;
    const commitment = 'abc123';
    
    const nullifier = generator.generateAccountNullifier(privateKey, commitment);
    
    expect(nullifier).toHaveProperty('nullifier');
    expect(nullifier).toHaveProperty('context');
    expect(nullifier).toHaveProperty('nonce');
    expect(nullifier.context).toBe('account_creation');
  });

  it('should generate order nullifier', () => {
    const privateKey = 123n;
    const orderHash = 'def456';
    const nonce = 1;
    
    const nullifier = generator.generateOrderNullifier(privateKey, orderHash, nonce);
    
    expect(nullifier).toHaveProperty('nullifier');
    expect(nullifier.context).toBe('order_submission');
  });

  it('should generate withdrawal nullifier', () => {
    const privateKey = 123n;
    const amount = '500';
    const recipient = '0x1234567890123456789012345678901234567890';
    
    const nullifier = generator.generateWithdrawalNullifier(privateKey, amount, recipient);
    
    expect(nullifier).toHaveProperty('nullifier');
    expect(nullifier.context).toBe('withdrawal');
  });

  it('should track used nullifiers', () => {
    const privateKey = 123n;
    const commitment = 'abc123';
    
    const nullifier = generator.generateAccountNullifier(privateKey, commitment);
    
    expect(generator.isNullifierUsed(nullifier.nullifier)).toBe(false);
    
    generator.markNullifierUsed(nullifier.nullifier);
    expect(generator.isNullifierUsed(nullifier.nullifier)).toBe(true);
  });

  it('should validate nullifier format', () => {
    const validNullifier = 'abc123';
    const invalidNullifier = 'not_hex';
    
    expect(generator.validateNullifierFormat(validNullifier)).toBe(true);
    expect(generator.validateNullifierFormat(invalidNullifier)).toBe(false);
  });

  it('should generate deterministic nullifier', () => {
    const seed = 'test_seed';
    const context = 'test_context';
    
    const nullifier1 = generator.generateDeterministicNullifier(seed, context);
    const nullifier2 = generator.generateDeterministicNullifier(seed, context);
    
    expect(nullifier1.nullifier).toBe(nullifier2.nullifier);
    expect(nullifier1.deterministic).toBe(true);
  });

  it('should build nullifier merkle tree', () => {
    const operations = [
      {
        type: 'account_creation',
        privateKey: 123n,
        commitment: 'abc123'
      },
      {
        type: 'order_submission',
        privateKey: 456n,
        orderHash: 'def456',
        nonce: 1
      }
    ];
    
    const tree = generator.generateNullifierTree(operations);
    
    expect(tree).toHaveProperty('root');
    expect(tree).toHaveProperty('leaves');
    expect(tree).toHaveProperty('tree');
    expect(tree.leaves).toHaveLength(2);
  });

  it('should export and import state', () => {
    const nullifier = 'test_nullifier';
    generator.markNullifierUsed(nullifier);
    
    const state = generator.exportState();
    expect(state.usedNullifiers).toContain(nullifier);
    
    const newGenerator = new NullifierGenerator();
    newGenerator.importState(state);
    
    expect(newGenerator.isNullifierUsed(nullifier)).toBe(true);
  });
}); 