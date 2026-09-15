import path from 'node:path';
import { readFileSync } from 'node:fs';
import { chromium, test as base, type BrowserContext } from '@playwright/test';

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
};

export const test = base.extend<ExtensionFixtures>({
  context: async ({ browserName }, use) => {
    if (browserName !== 'chromium') {
      throw new Error('IssueDock extension E2E requires Chromium.');
    }
    if (!process.env.ISSUEDOCK_DEMO_EXTENSION) throw new Error('Set ISSUEDOCK_DEMO_EXTENSION to the 0.1.0.0 E2E build.');
    const extensionPath = path.resolve(process.env.ISSUEDOCK_DEMO_EXTENSION);
    const manifest = JSON.parse(readFileSync(path.join(extensionPath, 'manifest.json'), 'utf8'));
    if (manifest.version !== '0.1.0.0') throw new Error('Only IssueDock 0.1.0.0 may be captured.');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      offline: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    serviceWorker ??= await context.waitForEvent('serviceworker');
    const extensionId = new URL(serviceWorker.url()).hostname;
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';
