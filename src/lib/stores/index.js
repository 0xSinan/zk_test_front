import { writable, derived, get } from 'svelte/store';
import { TradePrivateSDKSecure } from '../tradeprivate/secure.js';

// SDK instance
export const sdk = writable(null);

// Wallet state
export const address = writable(null);
export const network = writable(null);
export const isConnected = derived(address, $address => !!$address);

// Account state
export const hasPrivateAccount = writable(false);
export const privateAccountInfo = writable(null);
export const pendingCommit = writable(null);
export const isCreatingAccount = writable(false);

// Balances
export const publicBalance = writable('0');
export const privateBalance = writable('0');
export const usdcBalance = writable('0');

// Trading state
export const selectedMarket = writable(null);
export const orderType = writable(0); // 0: market, 1: limit, 2: stop
export const isLong = writable(true);
export const size = writable('');
export const price = writable('');
export const leverage = writable(1);
export const tpPrice = writable('');
export const slPrice = writable('');
export const isReduceOnly = writable(false);

// Orders
export const pendingOrders = writable([]);
export const isSubmittingOrder = writable(false);

// UI state
export const activeModal = writable(null);
export const toasts = writable([]);
export const isLoading = writable(false);

// Protocol stats
export const protocolStats = writable({
  tvl: '0',
  activeKeepers: 0,
  stateRoot: '',
  protocolNonce: '0'
});

// Initialize SDK
export async function initializeSDK() {
  const sdkInstance = new TradePrivateSDKSecure();
  
  try {
    await sdkInstance.initialize();
    sdk.set(sdkInstance);
    
    // Check for existing account
    const hasAccount = await sdkInstance.hasPrivateAccount();
    hasPrivateAccount.set(hasAccount);
    
    if (hasAccount) {
      const info = await sdkInstance.getAccountInfo();
      if (info) {
        privateAccountInfo.set(info);
        privateBalance.set(info.balance || '0');
      }
    }
    
    // Check for pending commit
    const pending = await sdkInstance.getPendingCommit();
    if (pending) {
      pendingCommit.set(pending);
    }
    
    // Load pending orders
    const orders = await sdkInstance.getPendingOrders();
    if (orders && Array.isArray(orders)) {
      pendingOrders.set(orders);
    }
    
    return sdkInstance;
  } catch (error) {
    console.error('Failed to initialize SDK:', error);
    throw error;
  }
}

// Helper functions
export function showToast(message, type = 'info', duration = 5000) {
  const id = Date.now();
  const toast = { id, message, type };
  
  toasts.update(t => [...t, toast]);
  
  if (duration > 0) {
    setTimeout(() => {
      toasts.update(t => t.filter(toast => toast.id !== id));
    }, duration);
  }
  
  return id;
}

export function hideToast(id) {
  toasts.update(t => t.filter(toast => toast.id !== id));
}

export function showModal(modalName) {
  activeModal.set(modalName);
}

export function hideModal() {
  activeModal.set(null);
}

export function showError(error) {
  console.error(error);
  const message = error?.message || 'An error occurred';
  showToast(message, 'error');
} 