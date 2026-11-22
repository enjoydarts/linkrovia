import adapter from '@sveltejs/adapter-cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    fs: {
      deny: [
        '.env',
        '.env.*',
        '*.{crt,pem,key,p12,pfx,cer,der}',
        '.npmrc',
        '.yarnrc.yml',
        '**/.git/**',
        '.dev.vars',
        '.dev.vars.*',
        'AGENTS.override.md',
        '**/.local/**',
        '**/.wrangler/**',
      ],
    },
    watch: {
      ignored: [
        '**/.local/**',
        '**/.wrangler/**',
        '**/test-results/**',
        '**/tests/**',
      ],
    },
  },
  plugins: [
    tailwindcss(),
    sveltekit({
      preprocess: vitePreprocess(),
      alias: { $lib: 'src/lib' },
      adapter: adapter({
        config: 'wrangler.jsonc',
        platformProxy: {
          configPath:
            process.env.LINKROVIA_E2E_WRANGLER_CONFIG ?? 'wrangler.local.jsonc',
          persist: process.env.LINKROVIA_E2E_WORKER_STATE
            ? { path: process.env.LINKROVIA_E2E_WORKER_STATE }
            : undefined,
          remoteBindings: false,
        },
      }),
      csp: {
        mode: 'auto',
        directives: {
          'script-src': ['self', 'https://challenges.cloudflare.com'],
          'frame-src': ['https://challenges.cloudflare.com'],
          'form-action': ['self'],
          'base-uri': ['self'],
          'object-src': ['none'],
          'frame-ancestors': ['none'],
        },
      },
    }),
  ],
});
