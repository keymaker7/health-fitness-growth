// 화면을 지운 뒤 **끊긴 링크가 없는지** 확인한다.
//
//   node scripts/links.test.mjs        (미리 `npm run build` 필요)
//
// 앱 안의 모든 내부 링크를 모아 실제로 열어 본다. 화면을 줄이는 정리에서 제일 흔한 사고가
// «어딘가에 남아 있는 링크가 404 로 떨어지는 것» 이라서, 그것만 집중해서 본다.

import { chromium } from '/Volumes/ssd/dev/word-chain-kr/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';

const SHELL = '/Users/keymaker/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const PORT = 8714;
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const START = ['/', '/paps', '/health-fitness', '/sport-fitness', '/prescription', '/measure',
               '/games', '/games/multi-jump', '/games/squat-race', '/games/jump-rope',
               '/journal', '/growth', '/my-fitness', '/portfolio', '/brain-break', '/settings'];
const GONE = ['/recommend', '/games/balance', '/games/coordination', '/games/reaction',
              '/games/side-step', '/games/jump-power', '/games/boss-battle'];

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], { stdio: 'ignore' });
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(BASE); if (r.ok) break; } catch { /* 아직 */ }
  await sleep(500);
}

const browser = await chromium.launch({ executablePath: SHELL });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};

try {
  console.log('\n[화면이 열린다]');
  const found = new Set();
  const broken = [];
  for (const path of START) {
    const res = await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    if ((res?.status() ?? 0) >= 400) broken.push(`${path} → ${res?.status()}`);
    await page.waitForTimeout(250);
    for (const href of await page.locator('a[href^="/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')))) {
      if (href) found.add(href.split('#')[0]);
    }
  }
  ok(`남긴 화면 ${START.length}개가 모두 열린다`, broken.length === 0, broken.join(', '));

  console.log('\n[링크가 끊기지 않았다]');
  const dead = [];
  for (const href of found) {
    if (href.startsWith('//')) continue;
    const res = await page.goto(BASE + href, { waitUntil: 'domcontentloaded' });
    if ((res?.status() ?? 0) >= 400) dead.push(`${href} → ${res?.status()}`);
  }
  ok(`앱 안 링크 ${found.size}개가 살아 있다`, dead.length === 0, dead.join(', '));

  console.log('\n[지운 화면은 정말 없어졌다]');
  const alive = [];
  for (const href of GONE) {
    const res = await page.goto(BASE + href, { waitUntil: 'domcontentloaded' });
    if ((res?.status() ?? 0) < 400) alive.push(href);
  }
  ok(`껍데기 화면 ${GONE.length}개가 사라졌다`, alive.length === 0, alive.join(', '));

  console.log('\n[남은 것의 개수]');
  await page.goto(BASE + '/games', { waitUntil: 'networkidle' });
  // 메뉴에도 게임 링크가 있어서, **서로 다른 주소**의 개수를 센다
  const gameLinks = new Set(
    await page.locator('a[href^="/games/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href'))),
  );
  ok('게임은 3개만 남았다', gameLinks.size === 3, [...gameLinks].join(', '));
  await page.goto(BASE + '/measure', { waitUntil: 'networkidle' });
  const tabs = await page.locator('[role="tab"], button').filter({ hasText: /측정|스쿼트|줄넘기/ }).count();
  ok('스쿼트 탭이 하나다', (await page.getByText('스쿼트', { exact: true }).count()) <= 2, `스쿼트 표기 ${tabs}`);
} finally {
  await browser.close();
  server.kill();
}

console.log(`\n${pass}개 통과${fail ? ` · ${fail}개 실패` : ''}`);
process.exit(fail ? 1 : 0);
