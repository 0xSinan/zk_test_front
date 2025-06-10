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