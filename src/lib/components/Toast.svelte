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