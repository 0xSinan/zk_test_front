<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { getPrivateKeyManager } from '../crypto/privateKeyManager.js';
  
  const dispatch = createEventDispatcher();
  
  let keyManager = null;
  let walletInfo = null;
  let currentMode = 'check'; // check, generate, restore, manage
  let mnemonic = '';
  let password = '';
  let confirmPassword = '';
  let mnemonicWords = [];
  let accountIndex = 0;
  let accounts = [];
  let loading = false;
  let error = '';
  let success = '';
  
  onMount(async () => {
    keyManager = getPrivateKeyManager();
    await keyManager.initialize();
    walletInfo = keyManager.getWalletInfo();
    
    if (walletInfo.isHDMode) {
      currentMode = 'manage';
      accounts = walletInfo.accounts || [];
    } else if (walletInfo.hasKeys) {
      currentMode = 'migrate';
    } else {
      currentMode = 'generate';
    }
  });
  
  async function generateHDWallet() {
    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }
    
    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      const result = await keyManager.generateHDWallet(password);
      mnemonic = result.mnemonic;
      mnemonicWords = result.mnemonic.split(' ');
      success = 'HD wallet generated successfully!';
      
      // Update state
      walletInfo = keyManager.getWalletInfo();
      accounts = walletInfo.accounts || [];
      
      dispatch('walletGenerated', result);
      currentMode = 'generated';
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  async function restoreHDWallet() {
    if (!mnemonic.trim()) {
      error = 'Please enter your mnemonic phrase';
      return;
    }
    
    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      const result = await keyManager.restoreHDWallet(mnemonic.trim(), password, accountIndex);
      success = 'HD wallet restored successfully!';
      
      // Update state
      walletInfo = keyManager.getWalletInfo();
      accounts = walletInfo.accounts || [];
      
      dispatch('walletRestored', result);
      currentMode = 'manage';
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  async function switchAccount(newAccountIndex) {
    loading = true;
    error = '';
    
    try {
      const result = await keyManager.switchAccount(newAccountIndex, password);
      success = `Switched to account ${newAccountIndex}`;
      
      // Update state
      walletInfo = keyManager.getWalletInfo();
      accounts = walletInfo.accounts || [];
      
      dispatch('accountSwitched', result);
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  async function generateAccounts() {
    loading = true;
    error = '';
    
    try {
      const newAccounts = await keyManager.generateAccounts(5, password);
      accounts = newAccounts;
      success = 'Additional accounts generated';
      
      // Update state
      walletInfo = keyManager.getWalletInfo();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  async function migrateToHD() {
    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      const result = await keyManager.migrateToHD(password);
      success = 'Migration to HD wallet successful!';
      mnemonic = result.mnemonic;
      mnemonicWords = result.mnemonic.split(' ');
      
      // Update state
      walletInfo = keyManager.getWalletInfo();
      accounts = walletInfo.accounts || [];
      
      dispatch('migrated', result);
      currentMode = 'generated';
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  function copyMnemonic() {
    navigator.clipboard.writeText(mnemonic);
    success = 'Mnemonic copied to clipboard';
  }
  
  function clearMessages() {
    error = '';
    success = '';
  }
</script>

<div class="hd-wallet-manager">
  <h2>🔐 HD Wallet Manager</h2>
  
  {#if error}
    <div class="alert alert-error">
      <span>❌ {error}</span>
      <button on:click={clearMessages}>×</button>
    </div>
  {/if}
  
  {#if success}
    <div class="alert alert-success">
      <span>✅ {success}</span>
      <button on:click={clearMessages}>×</button>
    </div>
  {/if}
  
  {#if walletInfo}
    <div class="wallet-status">
      <h3>Wallet Status</h3>
      <div class="status-grid">
        <div class="status-item">
          <span class="label">Mode:</span>
          <span class="value {walletInfo.isHDMode ? 'hd' : 'legacy'}">
            {walletInfo.isHDMode ? '🌟 HD Wallet' : '⚠️ Legacy Keys'}
          </span>
        </div>
        {#if walletInfo.isHDMode}
          <div class="status-item">
            <span class="label">Current Account:</span>
            <span class="value">{walletInfo.currentAccount}</span>
          </div>
          <div class="status-item">
            <span class="label">Total Accounts:</span>
            <span class="value">{walletInfo.totalAccounts}</span>
          </div>
        {/if}
        <div class="status-item">
          <span class="label">Initialized:</span>
          <span class="value">{walletInfo.initialized ? '✅' : '❌'}</span>
        </div>
      </div>
    </div>
  {/if}
  
  {#if currentMode === 'generate'}
    <div class="mode-section">
      <h3>🆕 Generate New HD Wallet</h3>
      <p>Create a new hierarchical deterministic wallet with a mnemonic seed phrase.</p>
      
      <div class="form-group">
        <label for="password">Wallet Password:</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          placeholder="Enter a strong password"
          disabled={loading}
        />
      </div>
      
      <div class="form-group">
        <label for="confirmPassword">Confirm Password:</label>
        <input
          type="password"
          id="confirmPassword"
          bind:value={confirmPassword}
          placeholder="Confirm your password"
          disabled={loading}
        />
      </div>
      
      <button 
        class="btn primary"
        on:click={generateHDWallet}
        disabled={loading || !password || password !== confirmPassword}
      >
        {loading ? 'Generating...' : 'Generate HD Wallet'}
      </button>
      
      <div class="mode-links">
        <button class="link" on:click={() => currentMode = 'restore'}>
          Already have a mnemonic? Restore wallet
        </button>
      </div>
    </div>
  
  {:else if currentMode === 'restore'}
    <div class="mode-section">
      <h3>🔄 Restore HD Wallet</h3>
      <p>Restore your wallet using your mnemonic seed phrase.</p>
      
      <div class="form-group">
        <label for="mnemonic">Mnemonic Phrase:</label>
        <textarea
          id="mnemonic"
          bind:value={mnemonic}
          placeholder="Enter your 12-24 word mnemonic phrase"
          rows="3"
          disabled={loading}
        ></textarea>
      </div>
      
      <div class="form-group">
        <label for="password">Wallet Password:</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          placeholder="Enter wallet password"
          disabled={loading}
        />
      </div>
      
      <div class="form-group">
        <label for="accountIndex">Account Index:</label>
        <input
          type="number"
          id="accountIndex"
          bind:value={accountIndex}
          min="0"
          max="100"
          placeholder="0"
          disabled={loading}
        />
      </div>
      
      <button 
        class="btn primary"
        on:click={restoreHDWallet}
        disabled={loading || !mnemonic.trim() || !password}
      >
        {loading ? 'Restoring...' : 'Restore HD Wallet'}
      </button>
      
      <div class="mode-links">
        <button class="link" on:click={() => currentMode = 'generate'}>
          Don't have a mnemonic? Generate new wallet
        </button>
      </div>
    </div>
  
  {:else if currentMode === 'generated'}
    <div class="mode-section">
      <h3>🎉 HD Wallet Generated</h3>
      <div class="alert alert-warning">
        <p><strong>⚠️ IMPORTANT:</strong> Save your mnemonic phrase safely!</p>
        <p>This is the ONLY way to recover your wallet. Write it down and store it securely.</p>
      </div>
      
      <div class="mnemonic-display">
        <h4>Your Mnemonic Phrase:</h4>
        <div class="mnemonic-grid">
          {#each mnemonicWords as word, index}
            <div class="mnemonic-word">
              <span class="word-number">{index + 1}</span>
              <span class="word">{word}</span>
            </div>
          {/each}
        </div>
        
        <div class="mnemonic-actions">
          <button class="btn secondary" on:click={copyMnemonic}>
            📋 Copy Mnemonic
          </button>
          <button class="btn primary" on:click={() => currentMode = 'manage'}>
            Continue to Wallet
          </button>
        </div>
      </div>
    </div>
  
  {:else if currentMode === 'migrate'}
    <div class="mode-section">
      <h3>🔄 Migrate to HD Wallet</h3>
      <p>You have legacy keys. Migrate to HD wallet for better security and features.</p>
      
      <div class="alert alert-info">
        <p><strong>Benefits of HD Wallet:</strong></p>
        <ul>
          <li>Multiple accounts from one seed</li>
          <li>Easy backup and restore</li>
          <li>Industry standard security</li>
          <li>Better key management</li>
        </ul>
      </div>
      
      <div class="form-group">
        <label for="password">New Wallet Password:</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          placeholder="Enter a strong password"
          disabled={loading}
        />
      </div>
      
      <button 
        class="btn primary"
        on:click={migrateToHD}
        disabled={loading || !password}
      >
        {loading ? 'Migrating...' : 'Migrate to HD Wallet'}
      </button>
      
      <div class="mode-links">
        <button class="link" on:click={() => currentMode = 'manage'}>
          Continue with legacy keys
        </button>
      </div>
    </div>
  
  {:else if currentMode === 'manage'}
    <div class="mode-section">
      <h3>🎛️ Manage HD Wallet</h3>
      
      {#if accounts.length > 0}
        <div class="accounts-section">
          <h4>Accounts</h4>
          <div class="accounts-grid">
            {#each accounts as account}
              <div class="account-card {account.isCurrent ? 'current' : ''}">
                <div class="account-header">
                  <span class="account-number">Account {account.index}</span>
                  {#if account.isCurrent}
                    <span class="current-badge">Current</span>
                  {/if}
                </div>
                <div class="account-details">
                  <div class="detail">
                    <span class="label">Address:</span>
                    <span class="value mono">{account.address}</span>
                  </div>
                  <div class="detail">
                    <span class="label">Path:</span>
                    <span class="value mono">{account.path}</span>
                  </div>
                </div>
                {#if !account.isCurrent}
                  <button 
                    class="btn small"
                    on:click={() => switchAccount(account.index)}
                    disabled={loading}
                  >
                    Switch
                  </button>
                {/if}
              </div>
            {/each}
          </div>
          
          <div class="accounts-actions">
            <button 
              class="btn secondary"
              on:click={generateAccounts}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate More Accounts'}
            </button>
          </div>
        </div>
      {/if}
      
      <div class="wallet-actions">
        <button class="btn secondary" on:click={() => currentMode = 'generate'}>
          Generate New Wallet
        </button>
        <button class="btn secondary" on:click={() => currentMode = 'restore'}>
          Restore Different Wallet
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .hd-wallet-manager {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .hd-wallet-manager h2 {
    text-align: center;
    margin-bottom: 30px;
    color: var(--text-primary);
  }
  
  .alert {
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .alert-error {
    background: var(--error-bg);
    color: var(--error-text);
    border: 1px solid var(--error-border);
  }
  
  .alert-success {
    background: var(--success-bg);
    color: var(--success-text);
    border: 1px solid var(--success-border);
  }
  
  .alert-warning {
    background: var(--warning-bg);
    color: var(--warning-text);
    border: 1px solid var(--warning-border);
  }
  
  .alert-info {
    background: var(--info-bg);
    color: var(--info-text);
    border: 1px solid var(--info-border);
  }
  
  .alert button {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.7;
  }
  
  .wallet-status {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 30px;
  }
  
  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 15px;
  }
  
  .status-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .status-item .label {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .status-item .value {
    font-weight: 600;
  }
  
  .status-item .value.hd {
    color: var(--success-text);
  }
  
  .status-item .value.legacy {
    color: var(--warning-text);
  }
  
  .mode-section {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 30px;
  }
  
  .mode-section h3 {
    margin-bottom: 15px;
    color: var(--text-primary);
  }
  
  .mode-section p {
    color: var(--text-secondary);
    margin-bottom: 25px;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-primary);
    font-size: 14px;
  }
  
  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-color-alpha);
  }
  
  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn.primary {
    background: var(--primary-color);
    color: white;
  }
  
  .btn.primary:hover:not(:disabled) {
    background: var(--primary-color-dark);
  }
  
  .btn.secondary {
    background: var(--secondary-color);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }
  
  .btn.secondary:hover:not(:disabled) {
    background: var(--secondary-color-dark);
  }
  
  .btn.small {
    padding: 8px 16px;
    font-size: 12px;
  }
  
  .mode-links {
    margin-top: 20px;
    text-align: center;
  }
  
  .link {
    background: none;
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    text-decoration: underline;
    font-size: 14px;
  }
  
  .mnemonic-display {
    margin-top: 20px;
  }
  
  .mnemonic-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin: 20px 0;
    padding: 20px;
    background: var(--code-bg);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }
  
  .mnemonic-word {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: var(--card-bg);
    border-radius: 4px;
  }
  
  .word-number {
    font-size: 12px;
    color: var(--text-secondary);
    min-width: 20px;
  }
  
  .word {
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .mnemonic-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 20px;
  }
  
  .accounts-section {
    margin-bottom: 30px;
  }
  
  .accounts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 15px;
    margin: 20px 0;
  }
  
  .account-card {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
    background: var(--card-bg);
  }
  
  .account-card.current {
    border-color: var(--primary-color);
    background: var(--primary-color-alpha);
  }
  
  .account-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .account-number {
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .current-badge {
    background: var(--success-color);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .account-details {
    margin-bottom: 15px;
  }
  
  .detail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
  }
  
  .detail .label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .detail .value {
    font-size: 14px;
    color: var(--text-primary);
  }
  
  .detail .value.mono {
    font-family: monospace;
    font-size: 12px;
    word-break: break-all;
  }
  
  .accounts-actions {
    text-align: center;
  }
  
  .wallet-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
  }
</style> 