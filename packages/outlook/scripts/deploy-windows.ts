import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const WIN_USER = 'justin.valentini';
const WIN_DEPLOY_DIR = `/mnt/c/Users/${WIN_USER}/SpeakStrong`;
const DIST_DIR = join(import.meta.dir, '../dist');
const MANIFEST_SRC = join(import.meta.dir, '../manifest.json');

console.log('Deploying Speak Strong Outlook Add-in to Windows...\n');

if (!existsSync(DIST_DIR)) {
  console.error('Error: dist/ directory not found. Run "bun run build" first.');
  process.exit(1);
}

if (!existsSync(WIN_DEPLOY_DIR)) {
  console.log(`Creating ${WIN_DEPLOY_DIR}...`);
  mkdirSync(WIN_DEPLOY_DIR, { recursive: true });
}

console.log(`Copying dist/ to ${WIN_DEPLOY_DIR}...`);
cpSync(DIST_DIR, WIN_DEPLOY_DIR, { recursive: true });

const manifest = JSON.parse(readFileSync(MANIFEST_SRC, 'utf-8'));

const updateUrls = (obj: Record<string, unknown>): void => {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === 'string' && value.includes('localhost:3000')) {
      obj[key] = value.replace(
        'https://localhost:3000',
        `file:///C:/Users/${WIN_USER}/SpeakStrong`
      );
    } else if (typeof value === 'object' && value !== null) {
      updateUrls(value as Record<string, unknown>);
    }
  }
};

updateUrls(manifest);

const manifestDest = join(WIN_DEPLOY_DIR, 'manifest.json');
writeFileSync(manifestDest, JSON.stringify(manifest, null, 2));

console.log(`\nDeployed to: ${WIN_DEPLOY_DIR}`);
console.log(`Manifest: ${manifestDest}\n`);

console.log('To sideload in Outlook:');
console.log('1. Open Outlook on Windows');
console.log('2. Go to File → Manage Add-ins (or Get Add-ins → My add-ins)');
console.log('3. Click "Upload My Add-in" or "Add a custom add-in"');
console.log(`4. Browse to: C:\\Users\\${WIN_USER}\\SpeakStrong\\manifest.json`);
console.log('\nNote: For file:// URLs to work, you may need to use the dev server instead.');
console.log('Run "bun run dev" in WSL, then use the localhost manifest.\n');
