import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

// The go server embeds the `build` directory (see serve.go).
export default defineConfig({
    base: './',
    plugins: [react()],
    resolve: {
        // The locale files of moment require the file moment.js, the app must not use a second copy of moment (the
        // locales would be registered in the copy which is not used and all dates would stay English).
        alias: [{find: /^moment$/, replacement: 'moment/moment.js'}],
    },
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
        // the render tests wait for the (generated) graphql responses
        testTimeout: 60000,
    },
});
