import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, networkInterfaces } from 'node:os';
import { join } from 'node:path';

const WIN_USER = 'justin.valentini';
const WIN_MANIFEST_DIR = `/mnt/c/Users/${WIN_USER}/SpeakStrong`;
const MANIFEST_XML_SRC = join(import.meta.dir, '../manifest.xml');
const CERT_DIR = join(homedir(), '.office-addin-dev-certs');

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

const wslIp = getWslIp() || 'localhost';
const port = 3000;
const baseUrl = `https://${wslIp}:${port}`;

if (!existsSync(WIN_MANIFEST_DIR)) {
  mkdirSync(WIN_MANIFEST_DIR, { recursive: true });
}

let manifestXml = readFileSync(MANIFEST_XML_SRC, 'utf-8');
manifestXml = manifestXml.replace(/https:\/\/172\.26\.130\.233:3000/g, baseUrl);

const manifestDest = join(WIN_MANIFEST_DIR, 'manifest.xml');
writeFileSync(manifestDest, manifestXml);

const caCertSrc = join(CERT_DIR, 'ca.crt');
const localCertSrc = join(CERT_DIR, 'localhost.crt');
const certDest = join(WIN_MANIFEST_DIR, 'localhost-ca.crt');

if (existsSync(caCertSrc)) {
  copyFileSync(caCertSrc, certDest);
} else if (existsSync(localCertSrc)) {
  copyFileSync(localCertSrc, certDest);
}

console.log(`
┌─────────────────────────────────────────────────────────────┐
│           Speak Strong Outlook Add-in Setup                 │
└─────────────────────────────────────────────────────────────┘

WSL IP Address: ${wslIp}
Base URL:       ${baseUrl}

Files created in: C:\\Users\\${WIN_USER}\\SpeakStrong\\
  - manifest.xml (XML manifest for sideloading)
  - localhost-ca.crt (SSL certificate)

═══════════════════════════════════════════════════════════════
STEP 1: Start the Dev Server (in this WSL terminal)
═══════════════════════════════════════════════════════════════

  cd packages/outlook && bun run dev

═══════════════════════════════════════════════════════════════
STEP 2: Trust the Certificate (in Windows browser)
═══════════════════════════════════════════════════════════════

Open this URL in Edge/Chrome and accept the security warning:
  ${baseUrl}/taskpane.html

═══════════════════════════════════════════════════════════════
STEP 3: Sideload via Outlook Web
═══════════════════════════════════════════════════════════════

1. Go to: https://aka.ms/olksideload
   (This opens Outlook Web with the Add-ins dialog)

2. In the dialog, select "My add-ins"

3. Scroll to "Custom Addins" section at the bottom

4. Click "Add a custom add-in" → "Add from File..."

5. Browse to: C:\\Users\\${WIN_USER}\\SpeakStrong\\manifest.xml

6. Click "Install" when prompted

═══════════════════════════════════════════════════════════════
STEP 4: Use the Add-in
═══════════════════════════════════════════════════════════════

1. Compose a new email in Outlook Web

2. Look for "Speak Strong" → "Analyze" button in the toolbar

3. Click it to open the task pane

4. Type some weak language and click "Analyze Email"

   Example: "I just wanted to check if I think we should maybe try this."

═══════════════════════════════════════════════════════════════
TROUBLESHOOTING
═══════════════════════════════════════════════════════════════

If the add-in won't load:
  - Make sure the dev server is running (bun run dev)
  - Make sure you accepted the certificate warning in the browser
  - Try refreshing Outlook Web

If WSL IP changed, re-run: bun run setup:win

`);
