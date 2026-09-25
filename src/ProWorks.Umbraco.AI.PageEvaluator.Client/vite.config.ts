/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/entry-point.ts',
      formats: ['es'],
      fileName: 'entry-point',
    },
    sourcemap: true,
    rollupOptions: {
      external: [
        // All Umbraco CMS, UI Library, and Umbraco.AI imports MUST remain external.
        // Bundling these would conflict with the CMS shell's own copies at runtime.
        // Lit is consumed via @umbraco-cms/backoffice/external/lit (covered by the rule above).
        /^@umbraco-cms\//,
        /^@umbraco-ui\//,
        /^@umbraco-ai\//,
      ],
      output: {
        // Ensure a clean, single ES module entry in the App_Plugins dist folder.
        entryFileNames: '[name].js',
      },
    },
    // Output into wwwroot/dist — served as /App_Plugins/ProWorks.AI.PageEvaluator/dist/ via Static Web Assets middleware.
    outDir: '../ProWorks.Umbraco.AI.PageEvaluator/wwwroot/dist',
    emptyOutDir: true,
  },
  server: {
    hmr: true,
  },
  test: {
    // Use happy-dom for Lit web component testing.
    environment: 'happy-dom',
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    setupFiles: ['tests/setup/vitest.setup.ts'],
    exclude: ['tests/e2e/**'],
    server: {
      deps: {
        inline: [/^@umbraco-cms\//, /^@umbraco-ui\//, /^@umbraco-ai\//],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
