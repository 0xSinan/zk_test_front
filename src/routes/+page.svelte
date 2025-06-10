<script>
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';
  import AccountStatus from '$lib/components/AccountStatus.svelte';
  import OrderForm from '$lib/components/OrderForm.svelte';
  import { 
    sdk,
    address, 
    network,
    publicBalance,
    privateBalance,
    usdcBalance,
    pendingOrders,
    protocolStats,
    isLoading,
    showToast,
    showError,
    initializeSDK
  } from '$lib/stores';
  import { getProvider, getCurrentAddress, switchToNetwork } from '$lib/contracts';
  import { CONSTANTS } from '$lib/config/constants.js';
  import { TradePrivateMonitoring } from '$lib/utils/monitoring.js';
  
  let isConnecting = false;
  let refreshInterval;
  
  async function connectWallet() {
    if (isConnecting) return;
    
    isConnecting = true;
    
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask or another Web3 wallet');
      }
      
      // Request accounts
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get provider and check network
      const provider = await getProvider();
      const networkInfo = await provider.getNetwork();
      
      if (networkInfo.chainId !== BigInt(CONSTANTS.CHAIN_ID)) {
        showToast(`Switching to correct network...`, 'info');
        await switchToNetwork(CONSTANTS.CHAIN_ID);
      }
      
      // Get current address
      const currentAddress = await getCurrentAddress();
      address.set(currentAddress);
      
      // Initialize SDK
      await initializeSDK();
      
      // Load initial data
      await refreshData();
      
      showToast('Wallet connected successfully!', 'success');
      TradePrivateMonitoring.trackUserAction('wallet_connected');
    } catch (error) {
      showError(error);
      TradePrivateMonitoring.trackUserAction('wallet_connect_failed', {
        error: error.message
      });
    } finally {
      isConnecting = false;
    }
  }
  
  async function refreshData() {
    if (!$sdk || !$address) return;
    
    try {
      // Update balances
      const [pubBal, privBal, usdcBal] = await Promise.all([
        $sdk.getPublicBalance($address),
        $sdk.getPrivateBalance(),
        $sdk.getUSDCBalance($address)
      ]);
      
      publicBalance.set(ethers.formatUnits(pubBal, 6));
      privateBalance.set(ethers.formatUnits(privBal, 6));
      usdcBalance.set(ethers.formatUnits(usdcBal, 6));
      
      // Update protocol stats
      const stats = await $sdk.getProtocolStats();
      protocolStats.set(stats);
      
      // Update orders
      const orders = await $sdk.getPendingOrders();
      pendingOrders.set(orders);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }
  
  async function handleDeposit() {
    const amount = prompt('Enter amount to deposit (USDC):');
    if (!amount || isNaN(amount) || amount <= 0) return;
    
    isLoading.set(true);
    
    try {
      const txHash = await $sdk.deposit(amount);
      showToast(`Deposit successful! Tx: ${txHash.slice(0, 10)}...`, 'success');
      await refreshData();
    } catch (error) {
      showError(error);
    } finally {
      isLoading.set(false);
    }
  }
  
  async function handleWithdraw() {
    const amount = prompt('Enter amount to withdraw (USDC):');
    if (!amount || isNaN(amount) || amount <= 0) return;
    
    isLoading.set(true);
    
    try {
      const txHash = await $sdk.withdraw(amount);
      showToast(`Withdrawal successful! Tx: ${txHash.slice(0, 10)}...`, 'success');
      await refreshData();
    } catch (error) {
      showError(error);
    } finally {
      isLoading.set(false);
    }
  }
  
  function formatAddress(addr) {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
  
  function exportMetrics() {
    TradePrivateMonitoring.exportMetrics();
  }
  
  onMount(() => {
    // Auto-connect if wallet available
    if (window.ethereum && window.ethereum.selectedAddress) {
      connectWallet();
    }
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          address.set(accounts[0]);
          refreshData();
        } else {
          address.set(null);
          sdk.update(s => {
            s?.destroy();
            return null;
          });
        }
      });
      
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
    
    // Set up refresh interval
    refreshInterval = setInterval(refreshData, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(refreshInterval);
      $sdk?.destroy();
    };
  });
</script>

<div class="app">
  <header class="header">
    <div class="container header-content">
      <h1 class="logo">🔐 TradePrivate</h1>
      <nav class="nav">
        {#if $address}
          <div class="wallet-info">
            <span class="address">{formatAddress($address)}</span>
            <div class="balances">
              <span>Public: {$publicBalance} USDC</span>
              <span>Private: {$privateBalance} USDC</span>
              <span>Wallet: {$usdcBalance} USDC</span>
            </div>
          </div>
        {:else}
          <button 
            class="btn btn-primary"
            on:click={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        {/if}
      </nav>
    </div>
  </header>

  <main class="main">
    <div class="container">
      {#if $address && $sdk}
        <div class="dashboard">
          <div class="left-panel">
            <AccountStatus />
            <OrderForm />
          </div>
          
          <div class="right-panel">
            <div class="card">
              <h3>Account Actions</h3>
              <div class="actions">
                <button 
                  class="btn btn-secondary"
                  on:click={handleDeposit}
                  disabled={$isLoading}
                >
                  Deposit USDC
                </button>
                <button 
                  class="btn btn-secondary"
                  on:click={handleWithdraw}
                  disabled={$isLoading || !$privateBalance || $privateBalance === '0'}
                >
                  Withdraw USDC
                </button>
              </div>
            </div>
            
            <div class="card">
              <h3>Protocol Stats</h3>
              <div class="stats">
                <div class="stat">
                  <span class="stat-label">Total Value Locked</span>
                  <span class="stat-value">{$protocolStats.tvl} USDC</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Active Keepers</span>
                  <span class="stat-value">{$protocolStats.activeKeepers}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Protocol Nonce</span>
                  <span class="stat-value">{$protocolStats.protocolNonce}</span>
                </div>
              </div>
            </div>
            
            <div class="card">
              <h3>Pending Orders</h3>
              {#if $pendingOrders.length > 0}
                <div class="orders-list">
                  {#each $pendingOrders as order}
                    <div class="order-item">
                      <span class="order-type">
                        {order.isLong ? 'Long' : 'Short'} 
                        {order.size} USDC
                      </span>
                      <span class="order-nullifier">
                        {order.nullifier.slice(0, 10)}...
                      </span>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="empty-state">No pending orders</p>
              {/if}
            </div>
          </div>
        </div>
      {:else}
        <div class="landing">
          <div class="hero card">
            <h2>Anonymous Trading with Zero-Knowledge Proofs</h2>
            <p>Trade perpetuals privately on Ethereum using cutting-edge ZK technology.</p>
            <ul class="features">
              <li>✅ Complete trading privacy with ZK-SNARKs</li>
              <li>✅ No KYC required - fully decentralized</li>
              <li>✅ MEV-resistant order execution</li>
              <li>✅ Trustless keeper network</li>
              <li>✅ On-chain settlement security</li>
            </ul>
            <button 
              class="btn btn-primary hero-cta"
              on:click={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet to Start'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </main>

  <footer class="footer">
    <div class="container footer-content">
      <p>TradePrivate © 2024 - Built with Zero-Knowledge Technology</p>
      {#if import.meta.env.DEV}
        <button class="btn btn-sm" on:click={exportMetrics}>Export Metrics</button>
      {/if}
    </div>
  </footer>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .header {
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--bg-tertiary);
    padding: var(--spacing-md) 0;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary);
  }

  .wallet-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-xs);
  }

  .address {
    font-family: monospace;
    color: var(--color-primary);
    font-weight: 500;
  }

  .balances {
    display: flex;
    gap: var(--spacing-md);
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .main {
    flex: 1;
    padding: var(--spacing-xl) 0;
  }

  .dashboard {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: var(--spacing-xl);
  }

  .actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .actions button {
    flex: 1;
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-label {
    color: var(--text-secondary);
  }

  .stat-value {
    font-weight: 600;
    color: var(--text-primary);
  }

  .orders-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .order-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .order-type {
    font-weight: 500;
  }

  .order-nullifier {
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--text-tertiary);
  }

  .empty-state {
    color: var(--text-tertiary);
    text-align: center;
    padding: var(--spacing-lg);
  }

  .landing {
    max-width: 800px;
    margin: 0 auto;
  }

  .hero {
    text-align: center;
    padding: var(--spacing-xl);
  }

  .hero h2 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: 2.5rem;
    color: var(--text-primary);
  }

  .hero p {
    font-size: 1.25rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xl);
  }

  .features {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--spacing-xl) 0;
    text-align: left;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  .features li {
    padding: var(--spacing-sm) 0;
    color: var(--text-secondary);
  }

  .hero-cta {
    font-size: 1.125rem;
    padding: var(--spacing-md) var(--spacing-xl);
  }

  .footer {
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--bg-tertiary);
    padding: var(--spacing-lg) 0;
    margin-top: auto;
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer p {
    margin: 0;
    color: var(--text-tertiary);
  }

  .btn-sm {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    .dashboard {
      grid-template-columns: 1fr;
    }
    
    .right-panel {
      order: -1;
    }
    
    .header-content {
      flex-direction: column;
      gap: var(--spacing-md);
    }
    
    .wallet-info {
      align-items: center;
    }
    
    .balances {
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-xs);
    }
  }
</style> 