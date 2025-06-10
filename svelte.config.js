import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    
    alias: {
      $lib: './src/lib',
      $components: './src/lib/components',
      $stores: './src/lib/stores',
      $utils: './src/lib/utils',
      $crypto: './src/lib/crypto',
      $tradeprivate: './src/lib/tradeprivate',
      $contracts: './src/lib/contracts'
    },
    
    prerender: {
      handleHttpError: 'warn'
    },
    
    csp: {
      directives: {
        'script-src': ['self', 'unsafe-inline'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'img-src': ['self', 'data:', 'blob:'],
        'font-src': ['self', 'fonts.googleapis.com', 'fonts.gstatic.com'],
        'style-src': ['self', 'unsafe-inline', 'fonts.googleapis.com']
      }
    }
  },
  
  vitePlugin: {
    inspector: true
  }
};

export default config; 