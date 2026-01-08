import { networkInterfaces } from 'node:os';
import { spawn } from 'bun';

function getWslIp(): string | null {
  const interfaces = networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal && name.startsWith('eth')) {
        return addr.address;
      }
    }
  }
  for (const [_name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return null;
}

const wslIp = getWslIp();
const port = 3000;

console.log(`
┌─────────────────────────────────────────────────────────────┐
│             Speak Strong Dev Server                         │
└─────────────────────────────────────────────────────────────┘

Starting Vite dev server...

Access from Windows using one of these URLs:

  Local:    https://localhost:${port}
  WSL IP:   https://${wslIp}:${port}

Task Pane: https://${wslIp}:${port}/taskpane.html

If localhost doesn't work, use the WSL IP address.
Update manifest.json URLs if needed.

Press Ctrl+C to stop.
─────────────────────────────────────────────────────────────
`);

const vite = spawn(['bun', 'run', 'dev:vite'], {
  cwd: `${import.meta.dir}/..`,
  stdio: ['inherit', 'inherit', 'inherit'],
});

await vite.exited;
