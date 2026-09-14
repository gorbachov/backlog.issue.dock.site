import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = normalize(join(import.meta.dirname, '..'));
const pages = ['/', '/support/', '/privacy/', '/terms/', '/commerce-disclosure/'];
const widths = [500, 1280];
const errors = [];
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function findChrome() {
  for (const command of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const result = spawnSync('sh', ['-c', `command -v ${command}`], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('ChromeまたはChromiumが見つかりません');
}

function harness(path, width) {
  const source = JSON.stringify(path);
  return `<!doctype html>
<meta charset="utf-8">
<title>responsive check</title>
<style>html,body{margin:0}iframe{display:block;width:${width}px;height:900px;border:0}</style>
<iframe title="preview" src=${JSON.stringify(path)}></iframe>
<script>
  const frame = document.querySelector('iframe');
  frame.addEventListener('load', () => {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    const visible = (element) => {
      const style = win.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
    };
    const headerLinks = [...doc.querySelectorAll('.site-header a')].filter(visible).map((element) => ({ text: element.textContent.trim(), ...rect(element) }));
    const overlaps = [];
    for (let first = 0; first < headerLinks.length; first += 1) {
      for (let second = first + 1; second < headerLinks.length; second += 1) {
        const a = headerLinks[first];
        const b = headerLinks[second];
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([a.text, b.text]);
      }
    }
    const controls = [...doc.querySelectorAll('a.button, .site-nav a')].filter(visible).map((element) => ({ text: element.textContent.trim(), ...rect(element) }));
    const result = {
      path: ${source},
      viewportWidth: win.innerWidth,
      htmlScrollWidth: doc.documentElement.scrollWidth,
      bodyScrollWidth: doc.body.scrollWidth,
      headerLinks,
      overlaps,
      controls,
      tables: [...doc.querySelectorAll('table')].map((table) => ({ wrapped: table.parentElement?.classList.contains('table-wrap') ?? false, wrapperWidth: table.parentElement?.clientWidth ?? 0, wrapperScrollWidth: table.parentElement?.scrollWidth ?? 0 })),
    };
    document.querySelector('output').textContent = JSON.stringify(result);
    document.body.dataset.ready = 'true';
  }, { once: true });
</script>
<output></output>`;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/__responsive') {
    const path = url.searchParams.get('path') ?? '/';
    const width = Number(url.searchParams.get('width'));
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(harness(path, width));
    return;
  }

  const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  let file = normalize(join(root, relativePath));
  if (!file.startsWith(root)) {
    response.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': mimeTypes.get(extname(file)) ?? 'application/octet-stream' });
  response.end(readFileSync(file));
});

function runChrome(chrome, url, profile) {
  return new Promise((resolve, reject) => {
    const process = spawn(chrome, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--window-size=1500,1000',
      '--virtual-time-budget=3000',
      `--user-data-dir=${profile}`,
      '--dump-dom',
      url,
    ]);
    let stdout = '';
    let stderr = '';
    process.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    process.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    process.on('error', reject);
    process.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Chrome終了コード ${code}: ${stderr.slice(-1000)}`));
    });
  });
}

const chrome = findChrome();
const profile = mkdtempSync(join(tmpdir(), 'issuedock-chrome-'));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();

try {
  for (const path of pages) {
    for (const width of widths) {
      const url = `http://127.0.0.1:${address.port}/__responsive?path=${encodeURIComponent(path)}&width=${width}`;
      const dom = await runChrome(chrome, url, profile);
      const match = dom.match(/<output>(.*?)<\/output>/s);
      if (!match?.[1]) {
        errors.push(`${path} ${width}px: 計測結果を取得できません`);
        continue;
      }
      const result = JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'));
      if (result.viewportWidth !== width) errors.push(`${path} ${width}px: viewportが${result.viewportWidth}pxです`);
      if (result.htmlScrollWidth > width || result.bodyScrollWidth > width) {
        errors.push(`${path} ${width}px: ページ全体に横スクロールがあります (${result.htmlScrollWidth}px)`);
      }
      if (result.overlaps.length) errors.push(`${path} ${width}px: ヘッダーリンクが重なっています ${JSON.stringify(result.overlaps)}`);
      for (const control of result.controls) {
        if (control.left < -0.5 || control.right > width + 0.5) errors.push(`${path} ${width}px: 「${control.text}」がviewport外です`);
        if (control.width < 24 || control.height < 24) errors.push(`${path} ${width}px: 「${control.text}」の操作領域が24px未満です`);
      }
      for (const table of result.tables) {
        if (!table.wrapped) errors.push(`${path} ${width}px: table-wrap外の表があります`);
        if (table.wrapperWidth > width) errors.push(`${path} ${width}px: 表ラッパーがviewportを超えています`);
      }
    }
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
  rmSync(profile, { recursive: true, force: true });
}

if (errors.length) {
  console.error(errors.map((error) => `ERROR ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`OK ${pages.length}ページを500px・1280pxで確認しました`);
}

