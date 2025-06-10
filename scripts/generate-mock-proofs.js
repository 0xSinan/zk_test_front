#!/usr/bin/env node

/**
 * Generate Mock ZK Proofs for Development
 * Creates realistic-looking mock proofs for testing without actual ZK computation
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Field size for BN254 curve
const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

console.log('🔮 Generating mock ZK proofs for development...\n');

/**
 * Generate a random field element
 */
function randomFieldElement() {
  const randomBytes = crypto.randomBytes(32);
  const randomBigInt = BigInt('0x' + randomBytes.toString('hex'));
  return (randomBigInt % FIELD_SIZE).toString();
}

/**
 * Generate mock ZK proof
 */
function generateMockProof(circuitName, publicInputs = []) {
  const proof = {
    pi_a: [randomFieldElement(), randomFieldElement(), "1"],
    pi_b: [
      [randomFieldElement(), randomFieldElement()],
      [randomFieldElement(), randomFieldElement()],
      ["1", "0"]
    ],
    pi_c: [randomFieldElement(), randomFieldElement(), "1"],
    protocol: "groth16",
    curve: "bn128"
  };

  return {
    proof,
    publicSignals: publicInputs.map(() => randomFieldElement()),
    circuit: circuitName,
    timestamp: Date.now(),
    mockData: true
  };
}

/**
 * Generate mock account creation proof
 */
function generateAccountCreationProof() {
  const commitment = randomFieldElement();
  const balance = "0";
  const timestamp = Date.now().toString();
  const nullifier = randomFieldElement();

  const publicInputs = [commitment, balance, timestamp, nullifier];
  const mockProof = generateMockProof('account_creation', publicInputs);

  return {
    ...mockProof,
    metadata: {
      type: 'account_creation',
      commitment,
      balance,
      timestamp,
      nullifier,
      description: 'Mock proof for private account creation'
    }
  };
}

/**
 * Generate mock order submission proof
 */
function generateOrderSubmissionProof(orderData = {}) {
  const {
    size = "1000",
    price = "2500",
    isLong = true,
    market = "0x" + "0".repeat(40)
  } = orderData;

  const nullifier = randomFieldElement();
  const orderCommitment = randomFieldElement();
  const accountCommitment = randomFieldElement();
  const amount = size;

  const publicInputs = [nullifier, orderCommitment, accountCommitment, amount];
  const mockProof = generateMockProof('order_submission', publicInputs);

  return {
    ...mockProof,
    metadata: {
      type: 'order_submission',
      nullifier,
      orderCommitment,
      accountCommitment,
      amount,
      orderData: {
        size,
        price,
        isLong,
        market
      },
      description: 'Mock proof for private order submission'
    }
  };
}

/**
 * Generate mock withdrawal proof
 */
function generateWithdrawalProof(amount = "500", recipient = null) {
  const nullifier = randomFieldElement();
  const withdrawalAmount = amount;
  const recipientAddress = recipient || "0x" + crypto.randomBytes(20).toString('hex');
  const balanceAfter = randomFieldElement();

  const publicInputs = [nullifier, withdrawalAmount, recipientAddress, balanceAfter];
  const mockProof = generateMockProof('withdrawal', publicInputs);

  return {
    ...mockProof,
    metadata: {
      type: 'withdrawal',
      nullifier,
      amount: withdrawalAmount,
      recipient: recipientAddress,
      balanceAfter,
      description: 'Mock proof for private withdrawal'
    }
  };
}

/**
 * Generate verification key
 */
function generateVerificationKey(circuitName) {
  return {
    protocol: "groth16",
    curve: "bn128",
    nPublic: 4,
    vk_alpha_1: [randomFieldElement(), randomFieldElement(), "1"],
    vk_beta_2: [
      [randomFieldElement(), randomFieldElement()],
      [randomFieldElement(), randomFieldElement()],
      ["1", "0"]
    ],
    vk_gamma_2: [
      [randomFieldElement(), randomFieldElement()],
      [randomFieldElement(), randomFieldElement()],
      ["1", "0"]
    ],
    vk_delta_2: [
      [randomFieldElement(), randomFieldElement()],
      [randomFieldElement(), randomFieldElement()],
      ["1", "0"]
    ],
    vk_alphabeta_12: Array(12).fill().map(() => [randomFieldElement(), randomFieldElement()]),
    IC: Array(5).fill().map(() => [randomFieldElement(), randomFieldElement(), "1"]),
    circuit: circuitName,
    generated: new Date().toISOString(),
    mockData: true
  };
}

/**
 * Save proofs to file system
 */
function saveProofs() {
  const proofsDir = path.join(rootDir, '.dev-storage', 'proofs');
  if (!fs.existsSync(proofsDir)) {
    fs.mkdirSync(proofsDir, { recursive: true });
  }

  // Generate sample proofs
  const accountProof = generateAccountCreationProof();
  const orderProof1 = generateOrderSubmissionProof({
    size: "1000",
    price: "2500",
    isLong: true
  });
  const orderProof2 = generateOrderSubmissionProof({
    size: "500",
    price: "2400",
    isLong: false
  });
  const withdrawalProof = generateWithdrawalProof("250");

  // Save proofs
  fs.writeFileSync(
    path.join(proofsDir, 'account_creation_sample.json'),
    JSON.stringify(accountProof, null, 2)
  );

  fs.writeFileSync(
    path.join(proofsDir, 'order_submission_long_sample.json'),
    JSON.stringify(orderProof1, null, 2)
  );

  fs.writeFileSync(
    path.join(proofsDir, 'order_submission_short_sample.json'),
    JSON.stringify(orderProof2, null, 2)
  );

  fs.writeFileSync(
    path.join(proofsDir, 'withdrawal_sample.json'),
    JSON.stringify(withdrawalProof, null, 2)
  );

  console.log('✅ Generated sample proofs');
}

/**
 * Save verification keys
 */
function saveVerificationKeys() {
  const vkDir = path.join(rootDir, 'public', 'circuits', 'verification_keys');
  if (!fs.existsSync(vkDir)) {
    fs.mkdirSync(vkDir, { recursive: true });
  }

  const circuits = ['account_creation', 'order_submission', 'withdrawal'];
  
  circuits.forEach(circuit => {
    const vk = generateVerificationKey(circuit);
    fs.writeFileSync(
      path.join(vkDir, `${circuit}_vk.json`),
      JSON.stringify(vk, null, 2)
    );
    console.log(`✅ Generated verification key for ${circuit}`);
  });
}

/**
 * Generate proof library for testing
 */
function generateProofLibrary() {
  const libraryPath = path.join(rootDir, '.dev-storage', 'proof_library.js');
  
  const libraryContent = `/**
 * Mock Proof Library for Development
 * Generated at: ${new Date().toISOString()}
 */

// Import this in your test files
export const MockProofs = {
  async generateAccountCreationProof(commitment, balance = "0") {
    return ${JSON.stringify(generateAccountCreationProof(), null, 4)};
  },

  async generateOrderSubmissionProof(orderData) {
    return ${JSON.stringify(generateOrderSubmissionProof(), null, 4)};
  },

  async generateWithdrawalProof(amount, recipient) {
    return ${JSON.stringify(generateWithdrawalProof(), null, 4)};
  },

  async verifyProof(proof, verificationKey, publicInputs) {
    // Mock verification - always returns true in development
    console.log('🔮 Mock proof verification (always passes in dev mode)');
    return true;
  },

  getRandomFieldElement() {
    return "${randomFieldElement()}";
  }
};

export default MockProofs;
`;

  fs.writeFileSync(libraryPath, libraryContent);
  console.log('✅ Generated proof library for testing');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('📁 Creating directories...');
    
    saveProofs();
    saveVerificationKeys();
    generateProofLibrary();

    console.log('\n🎉 Mock proof generation complete!');
    console.log('\n📚 Generated files:');
    console.log('• Sample proofs in .dev-storage/proofs/');
    console.log('• Verification keys in public/circuits/verification_keys/');
    console.log('• Proof library in .dev-storage/proof_library.js');
    console.log('\n⚠️  Note: These are MOCK proofs for development only!');
    console.log('   In production, use real ZK proof generation.');

  } catch (error) {
    console.error('❌ Mock proof generation failed:', error.message);
    process.exit(1);
  }
}

main(); 