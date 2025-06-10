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