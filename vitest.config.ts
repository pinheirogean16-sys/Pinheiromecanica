import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Ambiente Node.js (testes de backend/lógica)
    environment: 'node',

    // Globals (describe, it, expect sem import)
    globals: true,

    // Onde procurar testes
    include: ['tests/**/*.test.ts'],

    // Excluir
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '**/e2e/**',
    ],

    // Timeout padrão (5s)
    testTimeout: 10000,

    // Reporter
    reporters: ['verbose'],

    // Cobertura (opcional, mais lento)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/**/*.d.ts',
        'lib/prisma.ts',
        'lib/console-override.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
