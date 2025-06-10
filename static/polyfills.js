// Browser polyfills for TradePrivate
// This file handles compatibility with Node.js modules in the browser

// Ensure global is available (backup check)
if (typeof globalThis.global === 'undefined') {
  globalThis.global = globalThis;
}

// Ensure process is available (backup check)
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { 
    env: { NODE_ENV: 'development' },
    browser: true,
    version: 'v18.0.0',
    platform: 'browser',
    nextTick: (fn) => setTimeout(fn, 0)
  };
}

// Buffer polyfill will be handled by Vite
if (typeof globalThis.Buffer === 'undefined') {
  console.log('📦 Buffer polyfill will be loaded by Vite');
}

// Remove loading spinner with smooth animation
document.addEventListener('DOMContentLoaded', () => {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    // Wait a bit for the app to start loading
    setTimeout(() => {
      spinner.style.transition = 'opacity 0.3s ease-out';
      spinner.style.opacity = '0';
      setTimeout(() => {
        spinner.style.display = 'none';
      }, 300);
    }, 500);
  }
});

// Enhanced global error handlers
window.addEventListener('error', (event) => {
  // Filter out some non-critical errors
  if (event.filename && event.filename.includes('extension')) {
    return; // Ignore browser extension errors
  }
  console.error('🚨 Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  // Filter out some non-critical promise rejections
  const reason = event.reason;
  if (reason && typeof reason === 'object' && reason.message) {
    if (reason.message.includes('NotFound') || reason.message.includes('favicon')) {
      return; // Ignore favicon and other non-critical 404s
    }
  }
  console.error('🚨 Unhandled promise rejection:', reason);
  event.preventDefault();
});

// Performance monitoring
if (typeof performance !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        console.log(`⚡ App loaded in ${Math.round(perfData.loadEventEnd - perfData.loadEventStart)}ms`);
      }
    }, 0);
  });
}

// Console branding
console.log('%c🔐 TradePrivate', 'font-size: 20px; font-weight: bold; color: #3b82f6;');
console.log('%cPrivacy-First Perpetual DEX', 'font-size: 14px; color: #10b981;');
console.log('✅ Browser polyfills loaded successfully'); 