<script>
  import { page } from '$app/stores';
  import { ui, wallet, account } from '$lib/stores';

  const navigationItems = [
    { href: '/', label: 'Tableau de bord', icon: '🏠' },
    { href: '/trade', label: 'Trading', icon: '📈' },
    { href: '/account', label: 'Compte', icon: '👤' },
    { href: '/orders', label: 'Ordres', icon: '📋' },
    { href: '/settings', label: 'Paramètres', icon: '⚙️' }
  ];

  function closeSidebar() {
    ui.toggleSidebar();
  }

  function handleNavigation() {
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      ui.toggleSidebar();
    }
  }
</script>

<aside class="sidebar" class:open={$ui.sidebarOpen}>
  <div class="sidebar-content">
    <!-- Logo -->
    <div class="sidebar-header">
      <div class="logo">
        <h1>TradePrivate</h1>
        <span class="beta-badge">BETA</span>
      </div>
      <button 
        class="sidebar-close"
        on:click={closeSidebar}
        aria-label="Fermer la navigation"
      >
        ✕
      </button>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <ul class="nav-list">
        {#each navigationItems as item}
          <li class="nav-item">
            <a 
              href={item.href}
              class="nav-link"
              class:active={$page.url.pathname === item.href}
              on:click={handleNavigation}
            >
              <span class="nav-icon">{item.icon}</span>
              <span class="nav-label">{item.label}</span>
            </a>
          </li>
        {/each}
      </ul>
    </nav>

    <!-- Wallet Status -->
    <div class="sidebar-wallet">
      {#if $wallet.connected}
        <div class="wallet-info">
          <div class="wallet-status connected">
            <span class="status-dot"></span>
            <span>Connecté</span>
          </div>
          <div class="wallet-address">
            {$wallet.address ? 
              `${$wallet.address.slice(0, 6)}...${$wallet.address.slice(-4)}` : 
              'Non disponible'
            }
          </div>
          {#if $account.hasAccount}
            <div class="account-status">
              <span class="account-badge">Compte créé</span>
            </div>
          {/if}
        </div>
      {:else}
        <div class="wallet-info">
          <div class="wallet-status disconnected">
            <span class="status-dot"></span>
            <span>Non connecté</span>
          </div>
          <button 
            class="connect-button"
            on:click={() => wallet.connect()}
          >
            Connecter le portefeuille
          </button>
        </div>
      {/if}
    </div>
  </div>
</aside>

<!-- Backdrop pour mobile -->
{#if $ui.sidebarOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="sidebar-backdrop"
    on:click={closeSidebar}
  ></div>
{/if}

<style>
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    background: var(--bg-primary);
    border-right: 1px solid var(--border-primary);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 100;
    overflow-y: auto;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid var(--border-primary);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .beta-badge {
    background: var(--accent);
    color: white;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .sidebar-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 18px;
    padding: 8px;
    border-radius: 6px;
    display: none;
  }

  .sidebar-close:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .sidebar-nav {
    flex: 1;
    padding: 20px 0;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-item {
    margin-bottom: 4px;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    color: var(--text-secondary);
    text-decoration: none;
    transition: all 0.2s ease;
    border-right: 3px solid transparent;
  }

  .nav-link:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .nav-link.active {
    background: var(--bg-accent);
    color: var(--accent);
    border-right-color: var(--accent);
  }

  .nav-icon {
    font-size: 18px;
    width: 24px;
    text-align: center;
  }

  .nav-label {
    font-weight: 500;
  }

  .sidebar-wallet {
    padding: 20px;
    border-top: 1px solid var(--border-primary);
    margin-top: auto;
  }

  .wallet-info {
    text-align: center;
  }

  .wallet-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .wallet-status.connected {
    color: var(--success);
  }

  .wallet-status.connected .status-dot {
    background: var(--success);
  }

  .wallet-status.disconnected {
    color: var(--text-secondary);
  }

  .wallet-status.disconnected .status-dot {
    background: var(--text-secondary);
  }

  .wallet-address {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 12px;
    font-family: monospace;
  }

  .account-badge {
    background: var(--success);
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 12px;
    text-transform: uppercase;
  }

  .connect-button {
    background: var(--accent);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
    margin-top: 8px;
  }

  .connect-button:hover {
    background: var(--accent-hover);
  }

  .sidebar-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
    display: none;
  }

  /* Desktop */
  @media (min-width: 768px) {
    .sidebar {
      position: relative;
      transform: translateX(0);
      z-index: auto;
    }

    .sidebar-backdrop {
      display: none !important;
    }
  }

  /* Mobile */
  @media (max-width: 767px) {
    .sidebar-close {
      display: block;
    }

    .sidebar-backdrop {
      display: block;
    }

    .sidebar.open + .sidebar-backdrop {
      display: block;
    }
  }
</style> 