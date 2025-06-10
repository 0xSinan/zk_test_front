<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { 
    address, 
    activeModal,
    toasts
  } from '$lib/stores';
  import '../app.css';

  // Components
  import Toast from '$lib/components/Toast.svelte';
  import Modal from '$lib/components/Modal.svelte';

  let loading = true;
  let initError = null;

  onMount(async () => {
    try {
      // Simple initialization - just check for wallet
      console.log('Initializing TradePrivate dApp...');
      
      if (window.ethereum && window.ethereum.selectedAddress) {
        console.log('Wallet detected:', window.ethereum.selectedAddress);
        address.set(window.ethereum.selectedAddress);
      }
      
      console.log('TradePrivate dApp ready');
      loading = false;
    } catch (error) {
      console.error('Failed to initialize application:', error);
      initError = error.message;
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>TradePrivate - Privacy-First Perpetual DEX</title>
</svelte:head>

{#if loading}
  <div class="loading-screen">
    <div class="container">
      <div class="loading-content">
        <div class="loading-logo">
          <h1>🔐 TradePrivate</h1>
          <p>Privacy-First Perpetual DEX</p>
        </div>
        <div class="loading-spinner spinner"></div>
        <p>Initializing application...</p>
      </div>
    </div>
  </div>
{:else if initError}
  <div class="error-screen">
    <div class="container">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h1>Initialization Error</h1>
        <p>{initError}</p>
        <button class="btn btn-primary" on:click={() => window.location.reload()}>
          Retry
        </button>
      </div>
    </div>
  </div>
{:else}
  <div class="app-layout">
    <!-- Main Content -->
    <main class="main-content">
      <!-- Page Content -->
      <div class="page-content">
        <slot />
      </div>
    </main>
    
    <!-- Toast Notifications -->
    <Toast />
  </div>
{/if}

<style>
  .loading-screen,
  .error-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg-primary);
  }

  .loading-content,
  .error-content {
    text-align: center;
    padding: var(--spacing-xl);
  }

  .loading-logo h1 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: 2.5rem;
    color: var(--text-primary);
  }

  .loading-logo p {
    margin: 0 0 var(--spacing-lg) 0;
    color: var(--text-secondary);
    font-size: 1.125rem;
  }

  .loading-spinner {
    margin: var(--spacing-lg) auto;
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
  }

  .error-content h1 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--color-danger);
  }

  .error-content p {
    margin: 0 0 var(--spacing-lg) 0;
    color: var(--text-secondary);
  }

  .app-layout {
    min-height: 100vh;
    background: var(--bg-primary);
  }

  .main-content {
    width: 100%;
    min-height: 100vh;
  }

  .page-content {
    width: 100%;
    height: 100%;
  }
</style> 