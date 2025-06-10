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
  import { CONSTANTS } from '$lib/config/constants.js';
  
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
      
      // If COMMIT_REVEAL_DELAY is 0, reveal immediately
      if (CONSTANTS.COMMIT_REVEAL_DELAY === 0) {
        blocksRemaining = 0;
        canReveal = true;
      } else {
        const blocksPassed = currentBlock - $pendingCommit.blockNumber;
        blocksRemaining = Math.max(0, CONSTANTS.COMMIT_REVEAL_DELAY - blocksPassed);
        canReveal = blocksRemaining === 0;
      }
    } catch (error) {
      console.error('Failed to get block number:', error);
      // If there's an error and delay is 0, allow reveal anyway
      if (CONSTANTS.COMMIT_REVEAL_DELAY === 0) {
        blocksRemaining = 0;
        canReveal = true;
      }
    }
  }
  
  async function createAccount() {
    if (!$sdk || $isCreatingAccount) return;
    
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
  
  function clearPendingCommit() {
    pendingCommit.set(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pendingCommit');
      // Also clear IndexedDB if it exists
      try {
        indexedDB.deleteDatabase('TradePrivate');
        console.log('Cleared IndexedDB storage');
      } catch (error) {
        console.warn('Could not clear IndexedDB:', error);
      }
    }
    showToast('Pending commit and storage cleared', 'info');
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
      <h3>
        {#if CONSTANTS.COMMIT_REVEAL_DELAY === 0 || canReveal}
          ✅ Ready to Reveal Account
        {:else}
          ⏳ Account Creation Pending
        {/if}
      </h3>
      <div class="pending-details">
        {#if CONSTANTS.COMMIT_REVEAL_DELAY === 0}
          <p><strong>Ready to reveal immediately!</strong></p>
        {:else}
          <p>Blocks remaining: <strong>{blocksRemaining}</strong></p>
        {/if}
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            style="width: {CONSTANTS.COMMIT_REVEAL_DELAY === 0 ? 100 : ((CONSTANTS.COMMIT_REVEAL_DELAY - blocksRemaining) / CONSTANTS.COMMIT_REVEAL_DELAY) * 100}%"
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
        
        {#if CONSTANTS.COMMIT_REVEAL_DELAY === 0 || canReveal}
          <button 
            class="btn btn-secondary"
            on:click={clearPendingCommit}
            disabled={$isCreatingAccount}
          >
            Clear Pending Commit
          </button>
          <small class="help-text">
            💡 If you get "Invalid committer" error, clear the pending commit and create a new account.
          </small>
        {/if}
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
  
  .help-text {
    color: var(--text-secondary);
    font-size: 0.875rem;
    text-align: center;
    margin-top: var(--spacing-xs);
  }
</style> 