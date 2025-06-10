// ===== src/lib/stores/index.js =====
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
      privateAccountInfo.set(info);
      privateBalance.set(info?.balance || '0');
    }
    
    // Check for pending commit
    const pending = await sdkInstance.getPendingCommit();
    pendingCommit.set(pending);
    
    // Load pending orders
    const orders = await sdkInstance.getPendingOrders();
    pendingOrders.set(orders);
    
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
  const message = error.message || 'An error occurred';
  showToast(message, 'error');
}

// ===== src/lib/components/Toast.svelte =====
<script>
  import { fade, fly } from 'svelte/transition';
  import { toasts } from '$lib/stores';

  const typeIcons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  const typeClasses = {
    info: 'toast-info',
    success: 'toast-success',
    warning: 'toast-warning',
    error: 'toast-error'
  };
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div
      class="toast {typeClasses[toast.type] || 'toast-info'}"
      transition:fly={{ y: 50, duration: 300 }}
    >
      <span class="toast-icon">{typeIcons[toast.type] || 'ℹ️'}</span>
      <span class="toast-message">{toast.message}</span>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 400px;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);
    box-shadow: var(--shadow-lg);
    animation: slideIn 0.3s ease-out;
  }

  .toast-info {
    border-left: 4px solid var(--color-primary);
  }

  .toast-success {
    border-left: 4px solid var(--color-success);
  }

  .toast-warning {
    border-left: 4px solid var(--color-warning);
  }

  .toast-error {
    border-left: 4px solid var(--color-danger);
  }

  .toast-icon {
    font-size: 1.2em;
  }

  .toast-message {
    flex: 1;
    color: var(--text-primary);
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>

// ===== src/lib/components/Modal.svelte =====
<script>
  import { fade, scale } from 'svelte/transition';
  import { activeModal, hideModal } from '$lib/stores';
  
  export let name;
  export let title = '';
  export let maxWidth = '500px';
  
  $: isOpen = $activeModal === name;
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      hideModal();
    }
  }
  
  function handleEscape(event) {
    if (event.key === 'Escape' && isOpen) {
      hideModal();
    }
  }
</script>

<svelte:window on:keydown={handleEscape} />

{#if isOpen}
  <div 
    class="modal-backdrop" 
    on:click={handleBackdropClick}
    transition:fade={{ duration: 200 }}
  >
    <div 
      class="modal"
      style="max-width: {maxWidth}"
      transition:scale={{ duration: 200, start: 0.9 }}
    >
      {#if title}
        <div class="modal-header">
          <h2>{title}</h2>
          <button class="modal-close" on:click={hideModal}>×</button>
        </div>
      {/if}
      
      <div class="modal-content">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
    padding: 20px;
  }

  .modal {
    background-color: var(--bg-secondary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid var(--bg-tertiary);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary);
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 2rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    transition: all 0.2s;
  }

  .modal-close:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .modal-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }
</style>

// ===== src/lib/components/AccountStatus.svelte =====
<script>
  import { onMount } from 'svelte';
  import { 
    sdk, 
    hasPrivateAccount, 
    privateAccountInfo, 
    pendingCommit,
    isCreatingAccount,
    privateBalance,
    showToast,
    showError
  } from '$lib/stores';
  
  let blocksRemaining = 0;
  let canReveal = false;
  
  $: if ($pendingCommit) {
    updateBlocksRemaining();
  }
  
  async function updateBlocksRemaining() {
    if (!$sdk || !$pendingCommit) return;
    
    try {
      const provider = await $sdk.checkNetwork();
      const currentBlock = await provider.blockNumber;
      blocksRemaining = Math.max(0, 240 - (currentBlock - $pendingCommit.blockNumber));
      canReveal = blocksRemaining === 0;
    } catch (error) {
      console.error('Failed to get block number:', error);
    }
  }
  
  async function createAccount() {
    if (!$sdk || isCreatingAccount) return;
    
    isCreatingAccount.set(true);
    
    try {
      const result = await $sdk.createPrivateAccount();
      showToast(`Account commitment submitted. Wait ${result.waitBlocks} blocks to reveal.`, 'success');
      
      // Refresh pending commit
      const pending = await $sdk.getPendingCommit();
      pendingCommit.set(pending);
    } catch (error) {
      showError(error);
    } finally {
      isCreatingAccount.set(false);
    }
  }
  
  async function revealAccount() {
    if (!$sdk || !canReveal) return;
    
    isCreatingAccount.set(true);
    
    try {
      const result = await $sdk.revealPrivateAccount();
      showToast('Private account created successfully!', 'success');
      
      // Update account status
      hasPrivateAccount.set(true);
      const info = await $sdk.getAccountInfo();
      privateAccountInfo.set(info);
      privateBalance.set(info?.balance || '0');
      pendingCommit.set(null);
    } catch (error) {
      showError(error);
    } finally {
      isCreatingAccount.set(false);
    }
  }
  
  onMount(() => {
    const interval = setInterval(updateBlocksRemaining, 12000); // Every ~12 seconds
    return () => clearInterval(interval);
  });
</script>

<div class="account-status card">
  {#if $hasPrivateAccount && $privateAccountInfo}
    <div class="status-active">
      <h3>🔐 Private Account Active</h3>
      <div class="account-details">
        <div class="detail-row">
          <span class="label">Balance:</span>
          <span class="value">{$privateBalance} USDC</span>
        </div>
        <div class="detail-row">
          <span class="label">Commitment:</span>
          <span class="value commitment">{$privateAccountInfo.commitment.slice(0, 10)}...</span>
        </div>
      </div>
    </div>
  {:else if $pendingCommit}
    <div class="status-pending">
      <h3>⏳ Account Creation Pending</h3>
      <div class="pending-details">
        <p>Blocks remaining: <strong>{blocksRemaining}</strong></p>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            style="width: {((240 - blocksRemaining) / 240) * 100}%"
          ></div>
        </div>
        <button 
          class="btn btn-primary"
          on:click={revealAccount}
          disabled={!canReveal || $isCreatingAccount}
        >
          {#if $isCreatingAccount}
            <span class="spinner"></span>
            Revealing...
          {:else if canReveal}
            Reveal Account
          {:else}
            Wait {blocksRemaining} blocks
          {/if}
        </button>
      </div>
    </div>
  {:else}
    <div class="status-none">
      <h3>🚀 Create Private Account</h3>
      <p>Start anonymous trading with zero-knowledge proofs</p>
      <button 
        class="btn btn-primary"
        on:click={createAccount}
        disabled={$isCreatingAccount}
      >
        {#if $isCreatingAccount}
          <span class="spinner"></span>
          Creating...
        {:else}
          Create Private Account
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .account-status {
    margin-bottom: var(--spacing-lg);
  }

  h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
  }

  .account-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .value {
    color: var(--text-primary);
    font-weight: 600;
  }

  .commitment {
    font-family: monospace;
    font-size: 0.9em;
  }

  .pending-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background-color: var(--color-primary);
    transition: width 0.3s ease;
  }

  .status-none p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
  }

  button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
  }
</style>

// ===== src/lib/components/OrderForm.svelte =====
<script>
  import { 
    sdk,
    hasPrivateAccount,
    selectedMarket,
    orderType,
    isLong,
    size,
    price,
    leverage,
    tpPrice,
    slPrice,
    isReduceOnly,
    isSubmittingOrder,
    pendingOrders,
    showToast,
    showError
  } from '$lib/stores';
  
  const orderTypes = [
    { value: 0, label: 'Market' },
    { value: 1, label: 'Limit' },
    { value: 2, label: 'Stop' }
  ];
  
  $: showPrice = $orderType !== 0;
  $: canSubmit = $hasPrivateAccount && $size && !$isSubmittingOrder;
  
  async function submitOrder() {
    if (!$sdk || !canSubmit) return;
    
    isSubmittingOrder.set(true);
    
    try {
      const orderParams = {
        market: $selectedMarket || '0x0000000000000000000000000000000000000001', // Mock market
        size: $size,
        price: $price || '0',
        isLong: $isLong,
        isReduceOnly: $isReduceOnly,
        orderType: $orderType,
        leverage: $leverage,
        tpPrice: $tpPrice || '0',
        slPrice: $slPrice || '0'
      };
      
      const result = await $sdk.submitOrder(orderParams);
      
      showToast('Order submitted successfully!', 'success');
      
      // Clear form
      size.set('');
      price.set('');
      tpPrice.set('');
      slPrice.set('');
      
      // Refresh orders
      const orders = await $sdk.getPendingOrders();
      pendingOrders.set(orders);
    } catch (error) {
      showError(error);
    } finally {
      isSubmittingOrder.set(false);
    }
  }
</script>

<div class="order-form card">
  <h3>Submit Private Order</h3>
  
  {#if !$hasPrivateAccount}
    <div class="warning">
      <p>⚠️ Create a private account first to submit orders</p>
    </div>
  {:else}
    <div class="form-group">
      <label class="label">Direction</label>
      <div class="direction-toggle">
        <button 
          class="toggle-btn {$isLong ? 'active-long' : ''}"
          on:click={() => isLong.set(true)}
        >
          Long
        </button>
        <button 
          class="toggle-btn {!$isLong ? 'active-short' : ''}"
          on:click={() => isLong.set(false)}
        >
          Short
        </button>
      </div>
    </div>
    
    <div class="form-group">
      <label class="label">Order Type</label>
      <select class="input" bind:value={$orderType}>
        {#each orderTypes as type}
          <option value={type.value}>{type.label}</option>
        {/each}
      </select>
    </div>
    
    <div class="form-group">
      <label class="label">Size (USDC)</label>
      <input 
        type="number" 
        class="input" 
        placeholder="1000"
        bind:value={$size}
        min="100"
        max="1000000"
        step="100"
      />
    </div>
    
    {#if showPrice}
      <div class="form-group">
        <label class="label">Price</label>
        <input 
          type="number" 
          class="input" 
          placeholder="2500"
          bind:value={$price}
          min="0"
          step="0.01"
        />
      </div>
    {/if}
    
    <div class="form-group">
      <label class="label">Leverage</label>
      <div class="leverage-slider">
        <input 
          type="range" 
          bind:value={$leverage}
          min="1"
          max="50"
          step="1"
        />
        <span class="leverage-value">{$leverage}x</span>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label class="label">Take Profit</label>
        <input 
          type="number" 
          class="input" 
          placeholder="Optional"
          bind:value={$tpPrice}
          min="0"
          step="0.01"
        />
      </div>
      
      <div class="form-group">
        <label class="label">Stop Loss</label>
        <input 
          type="number" 
          class="input" 
          placeholder="Optional"
          bind:value={$slPrice}
          min="0"
          step="0.01"
        />
      </div>
    </div>
    
    <div class="form-group">
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          bind:checked={$isReduceOnly}
        />
        Reduce Only
      </label>
    </div>
    
    <button 
      class="btn btn-primary submit-btn"
      on:click={submitOrder}
      disabled={!canSubmit}
    >
      {#if $isSubmittingOrder}
        <span class="spinner"></span>
        Submitting...
      {:else}
        Submit Private Order
      {/if}
    </button>
  {/if}
</div>

<style>
  .order-form {
    margin-bottom: var(--spacing-lg);
  }

  h3 {
    margin: 0 0 var(--spacing-lg) 0;
    color: var(--text-primary);
  }

  .warning {
    background-color: var(--bg-tertiary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--color-warning);
  }

  .warning p {
    margin: 0;
    color: var(--text-secondary);
  }

  .form-group {
    margin-bottom: var(--spacing-md);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  .direction-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-sm);
  }

  .toggle-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--bg-tertiary);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-btn:hover {
    background-color: var(--bg-secondary);
  }

  .toggle-btn.active-long {
    background-color: var(--color-success);
    border-color: var(--color-success);
    color: white;
  }

  .toggle-btn.active-short {
    background-color: var(--color-danger);
    border-color: var(--color-danger);
    color: white;
  }

  .leverage-slider {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .leverage-slider input[type="range"] {
    flex: 1;
  }

  .leverage-value {
    min-width: 40px;
    text-align: right;
    font-weight: 600;
    color: var(--text-primary);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
  }

  .submit-btn {
    width: 100%;
    margin-top: var(--spacing-lg);
  }
</style>