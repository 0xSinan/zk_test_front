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