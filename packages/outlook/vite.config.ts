import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const certPath = path.join(process.env.HOME || '', '.office-addin-dev-certs');
const keyFile = path.join(certPath, 'localhost.key');
const certFile = path.join(certPath, 'localhost.crt');

const httpsConfig =
  fs.existsSync(keyFile) && fs.existsSync(certFile)
    ? { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }
    : true;

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        taskpane: 'taskpane.html',
        commands: 'commands.html',
      },
    },
  },
  server: {
    port: 3000,
    https: httpsConfig,
    host: '0.0.0.0',
  },
});
