import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

// The go server embeds the `build` directory (see serve.go).
export default defineConfig({
    base: './',
    plugins: [react()],
    build: {
        outDir: 'build',
        assetsDir: 'assets',
        emptyOutDir: true,
    },
    server: {
        port: 3000,
        // the go server runs on 3030 (see .env.sample)
        proxy: {'/graphql': 'http://localhost:3030'},
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
