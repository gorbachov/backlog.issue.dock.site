import { mkdir } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

type StorageSeed = {
  sync: Record<string, unknown>;
  local: Record<string, unknown>;
};

type DatabaseSeed = {
  connections: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  issues: Record<string, unknown>[];
  issueDetails: Record<string, unknown>[];
  syncStates: Record<string, unknown>[];
};

async function openDashboard(
  page: Page,
  extensionId: string,
  route = '',
): Promise<void> {
  await page.goto(
    `chrome-extension://${extensionId}/dashboard.html${route ? `#${route}` : ''}`,
  );
}

async function seedStorage(page: Page, seed: StorageSeed): Promise<void> {
  await page.evaluate(async (input) => {
    const chromeApi = (
      globalThis as typeof globalThis & {
        chrome: {
          storage: {
            sync: { set(items: Record<string, unknown>): Promise<void> };
            local: { set(items: Record<string, unknown>): Promise<void> };
          };
        };
      }
    ).chrome;
    await chromeApi.storage.sync.set(input.sync);
    await chromeApi.storage.local.set(input.local);
  }, seed);
}

async function seedDatabase(page: Page, seed: DatabaseSeed): Promise<void> {
  await page.evaluate(async (input) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('issuedock');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const entries = Object.entries(input) as Array<
      [keyof DatabaseSeed, Record<string, unknown>[]]
    >;
    const transaction = database.transaction(
      entries.map(([store]) => store),
      'readwrite',
    );
    for (const [store, records] of entries) {
      const objectStore = transaction.objectStore(store);
      for (const record of records) {
        objectStore.put(record);
      }
    }
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }, seed);
}

function connectionRecord(
  id: string,
  displayName: string,
  canonicalOrigin: string,
  now: string,
) {
  return {
    id,
    displayName,
    canonicalOrigin,
    credentialMode: 'sync',
    connectedUserId: 8,
    connectedUserName: 'デモ担当者',
    createdAt: now,
    updatedAt: now,
  };
}

function projectRecord(
  canonicalSpaceOrigin: string,
  projectId: number,
  projectKey: string,
  name: string,
  now: string,
) {
  return {
    identity: `${canonicalSpaceOrigin}#${projectId}`,
    canonicalSpaceOrigin,
    projectId,
    projectKey,
    name,
    archived: false,
    textFormattingRule: 'backlog',
    updatedAt: now,
  };
}

function issueRecord(input: {
  canonicalSpaceOrigin: string;
  id: number;
  projectId: number;
  issueKey: string;
  summary: string;
  status: string;
  dueDate: string;
  now: string;
}) {
  return {
    identity: `${input.canonicalSpaceOrigin}#${input.id}`,
    canonicalSpaceOrigin: input.canonicalSpaceOrigin,
    id: input.id,
    projectId: input.projectId,
    issueKey: input.issueKey,
    summary: input.summary,
    description: `${input.summary}のデモ説明`,
    statusId: input.status === '処理中' ? 2 : 1,
    status: input.status,
    priority: '中',
    assigneeId: 8,
    assigneeName: 'デモ担当者',
    createdUserId: 8,
    dueDate: input.dueDate,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: input.now,
    sources: ['assigned'],
    unread: false,
    cachedAt: input.now,
  };
}

function syncState(canonicalSpaceOrigin: string, now: string) {
  return {
    canonicalSpaceOrigin,
    status: 'success',
    lastSyncedAt: now,
    issuesUpdatedSince: '2026-08-01',
    notificationsMaxId: 48,
    errorCode: null,
    errorMessage: null,
    progressStage: null,
    progressCompleted: 4,
    progressTotal: 4,
    rateLimitResetAt: null,
  };
}

function credentialEntry(
  id: string,
  displayName: string,
  canonicalOrigin: string,
  now: string,
) {
  return {
    id,
    displayName,
    canonicalOrigin,
    envelope: {
      formatVersion: 1,
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA-256',
      iterations: 100_000,
      salt: 'c2FsdA==',
      iv: 'aXY=',
      ciphertext: 'Y2lwaGVy',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function tagStorageKey(tagId: string): string {
  return `issuedock.personal.v1.tag.${encodeURIComponent(tagId)}.store-demo`;
}

function issueStorageKey(issueIdentity: string): string {
  return `issuedock.personal.v1.issue.${encodeURIComponent(issueIdentity)}.store-demo`;
}

test('captures 0.1.0.0 product screens with offline fictional data', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openDashboard(page, extensionId, '/settings');

  const now = new Date().toISOString();
  await context.route('https://**/*', async route => {
    const u = new URL(route.request().url());
    if (!['_demo-a_.backlog.jp', '_demo-b_.backlog.jp'].includes(u.hostname)) return route.abort();
    const user = {id: 8, name: 'デモ担当者'};
    let data: unknown;
    if (u.pathname.endsWith('/comments')) data = [{id:12802, content:'公開前チェックを進めます。', createdUser:{id:9,name:'デモ確認者'},created:now},{id:12801,content:'確認項目を最新版へ更新しました。',createdUser:user,created:now}];
    else if (u.pathname.endsWith('/attachments')) data = [];
    else if (u.pathname.endsWith('/issues/WEB-128')) data = {id:128,projectId:10,issueKey:'WEB-128',summary:'公開前チェックリストを更新する',description:'サンプルサイト公開前の確認項目を整理し、担当者と完了条件を更新します。',status:{id:2,name:'処理中'},priority:{id:3,name:'中'},assignee:user,createdUser:user,created:now,updated:now};
    else return route.abort();
    await route.fulfill({json:data});
  });
  const alphaOrigin = 'https://_demo-a_.backlog.jp';
  const betaOrigin = 'https://_demo-b_.backlog.jp';
  const alphaId = 'connection-alpha-demo';
  const betaId = 'connection-beta-studio';
  const webIdentity = `${alphaOrigin}#128`;
  const opsIdentity = `${alphaOrigin}#42`;
  const appIdentity = `${betaOrigin}#76`;
  const designIdentity = `${betaOrigin}#18`;
  const tags = [
    {
      id: 'tag-release',
      name: '今週リリース',
      color: '#7aa51a',
      updatedAt: now,
      updatedByDeviceId: 'store-demo',
    },
    {
      id: 'tag-review',
      name: '確認待ち',
      color: '#4a8ccc',
      updatedAt: now,
      updatedByDeviceId: 'store-demo',
    },
    {
      id: 'tag-customer',
      name: '顧客対応',
      color: '#e87758',
      updatedAt: now,
      updatedByDeviceId: 'store-demo',
    },
  ];
  const personalMetadata = [
    {
      issueIdentity: webIdentity,
      stage: 'next',
      today: true,
      waitingReviewDate: null,
      queueOrder: 100,
      pinned: true,
      lastViewedAt: now,
      tagIds: ['tag-release', 'tag-review'],
      updatedAt: now,
      updatedByDeviceId: 'store-demo',
    },
    {
      issueIdentity: opsIdentity,
      stage: 'waiting',
      today: false,
      waitingReviewDate: '2026-08-15',
      queueOrder: 200,
      pinned: true,
      lastViewedAt: null,
      tagIds: ['tag-customer'],
      updatedAt: now,
      updatedByDeviceId: 'store-demo',
    },
    {
      issueIdentity: appIdentity,
      stage: 'next',
      today: true,
      waitingReviewDate: null,
      queueOrder: 300,
      pinned: false,
      lastViewedAt: null,
      tagIds: [],
      updatedAt: now,
      updatedByDeviceId: 'store-demo',
    },
    {
      issueIdentity: designIdentity,
      stage: 'later',
      today: false,
      waitingReviewDate: null,
      queueOrder: 400,
      pinned: false,
      lastViewedAt: null,
      tagIds: ['tag-review'],
      updatedAt: now,
      updatedByDeviceId: 'store-demo',
    },
  ];

  await seedStorage(page, {
    sync: {
      'issuedock.sync.v1': {
        schemaVersion: 1,
        updatedAt: now,
        settings: {
          theme: 'light',
          spaceThemes: { [alphaOrigin]: 'sky', [betaOrigin]: 'coral' },
          defaultUnlockRetention: 'local',
          notificationInitialLimit: 2_000,
        },
        tags: [],
        issueMetadata: [],
        credentials: [
          credentialEntry(alphaId, 'デモ開発', alphaOrigin, now),
          credentialEntry(betaId, 'デモデザイン', betaOrigin, now),
        ],
      },
      ...Object.fromEntries(tags.map((tag) => [tagStorageKey(tag.id), tag])),
      ...Object.fromEntries(
        personalMetadata.map((metadata) => [
          issueStorageKey(metadata.issueIdentity),
          metadata,
        ]),
      ),
    },
    local: {
      'issuedock.personal.device.v1': {
        schemaVersion: 1,
        deviceId: 'store-demo',
      },
      'issuedock.credentials.unlocked.v1': {
        schemaVersion: 1,
        credentials: {
          [alphaId]: {
            connectionId: alphaId,
            canonicalOrigin: alphaOrigin,
            apiKey: 'store-demo-alpha-key',
            unlockedAt: now,
          },
          [betaId]: {
            connectionId: betaId,
            canonicalOrigin: betaOrigin,
            apiKey: 'store-demo-beta-key',
            unlockedAt: now,
          },
        },
      },
    },
  });
  await page.reload();
  await expect(page.getByText('デモ開発', { exact: true })).toBeVisible();

  await seedDatabase(page, {
    connections: [
      connectionRecord(alphaId, 'デモ開発', alphaOrigin, now),
      connectionRecord(betaId, 'デモデザイン', betaOrigin, now),
    ],
    projects: [
      projectRecord(alphaOrigin, 10, 'WEB', 'Webサイト', now),
      projectRecord(alphaOrigin, 11, 'OPS', '運用改善', now),
      projectRecord(betaOrigin, 20, 'APP', 'アプリ開発', now),
      projectRecord(betaOrigin, 21, 'DESIGN', 'デザイン', now),
      projectRecord(alphaOrigin, 99, 'EMPTY', '課題なし', now),
    ],
    issues: [
      issueRecord({
        canonicalSpaceOrigin: alphaOrigin,
        id: 128,
        projectId: 10,
        issueKey: 'WEB-128',
        summary: '公開前チェックリストを更新する',
        status: '処理中',
        dueDate: '2026-08-14',
        now,
      }),
      issueRecord({
        canonicalSpaceOrigin: alphaOrigin,
        id: 42,
        projectId: 11,
        issueKey: 'OPS-42',
        summary: '同期エラー時の再試行表示を確認する',
        status: '未対応',
        dueDate: '2026-08-15',
        now,
      }),
      issueRecord({
        canonicalSpaceOrigin: betaOrigin,
        id: 76,
        projectId: 20,
        issueKey: 'APP-76',
        summary: '検索と絞り込みの操作性を改善する',
        status: '処理中',
        dueDate: '2026-08-18',
        now,
      }),
      issueRecord({
        canonicalSpaceOrigin: betaOrigin,
        id: 18,
        projectId: 21,
        issueKey: 'DESIGN-18',
        summary: '設定画面の説明文を見直す',
        status: '未対応',
        dueDate: '2026-08-21',
        now,
      }),
    ],
    issueDetails: [
      {
        identity: webIdentity,
        canonicalSpaceOrigin: alphaOrigin,
        issueId: 128,
        description:
          'サンプルサイト公開前の確認項目を整理し、担当者と完了条件を更新します。',
        comments: [
          {
            id: 12802,
            content: '公開前チェックを進めます。',
            createdUser: { id: 9, name: 'デモ確認者' },
            created: '2026-08-12T02:42:00.000Z',
            updated: '2026-08-12T02:42:00.000Z',
            stars: [],
            notifications: [],
          },
          {
            id: 12801,
            content: '確認項目を最新版へ更新しました。',
            createdUser: { id: 8, name: 'デモ担当者' },
            created: '2026-08-12T02:10:00.000Z',
            updated: '2026-08-12T02:10:00.000Z',
            stars: [],
            notifications: [],
          },
        ],
        attachments: [],
        issueUpdatedAt: now,
        fetchedAt: now,
      },
    ],
    syncStates: [syncState(alphaOrigin, now), syncState(betaOrigin, now)],
  });

  await openDashboard(page, extensionId);
  const webProject = page
    .locator('.project-nav-item')
    .filter({ hasText: 'Webサイト' });
  await expect(webProject.locator('strong')).toHaveText('WEB');
  await expect(webProject.locator('small')).toHaveText('Webサイト');
  await expect(
    page.locator('.project-nav-item').filter({ hasText: '課題なし' }),
  ).toHaveCount(0);
  await expect(page.getByText('WEB-128', { exact: true })).toBeVisible();
  await expect(page.getByText('DESIGN-18', { exact: true })).toBeVisible();
  await page.getByText('WEB-128', { exact: true }).click();
  await expect(page.locator('.detail-header .issue-key')).toHaveText('WEB-128');
  await expect(page.getByText('公開前チェックを進めます。')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  await mkdir('test-results/store', { recursive: true });
  await page.getByText('課題内容', {exact:true}).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/store/dashboard.png' });
  for (const [name, clip] of Object.entries({
    organize: { x: 1110, y: 238, width: 320, height: 274 },
    detail: { x: 1100, y: 65, width: 340, height: 800 },
    spaces: { x: 0, y: 545, width: 240, height: 455 },
    queue: { x: 0, y: 65, width: 240, height: 475 },
  })) await page.screenshot({path: `test-results/store/${name}.png`, clip});
  await page.getByPlaceholder('課題キー・件名・説明を検索').fill('公開前');
  await expect(page.getByText('APP-76', {exact: true})).toHaveCount(0);
  await page.screenshot({ path: 'test-results/store/search.png', clip: { x: 244, y: 145, width: 850, height: 200 } });
  await page.setViewportSize({width:500,height:1000});
  await page.locator('.issue-filter-bar').screenshot({path:'test-results/store/search-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});
  await openDashboard(page, extensionId, '/settings');
  await page.screenshot({ path: 'test-results/store/settings.png', fullPage: true });
  await page.screenshot({ path: 'test-results/store/theme.png', clip:{x:404,y:433,width:872,height:206} });
  await page.screenshot({ path: 'test-results/store/sync.png', fullPage:true, clip:{x:380,y:1008,width:918,height:248} });
  await page.setViewportSize({width:500,height:1000});
  await page.locator('.space-theme-picker').first().screenshot({path:'test-results/store/theme-mobile.png'});
  await page.locator('.settings-card').filter({hasText:'同期とセキュリティ'}).screenshot({path:'test-results/store/sync-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});
  await openDashboard(page, extensionId, '/subscription');
  await expect(page.getByRole('heading', {name: 'ご契約は有効です'})).toBeVisible();
  await page.screenshot({ path: 'test-results/store/plan.png', clip:{x:610,y:205,width:460,height:240} });
});
