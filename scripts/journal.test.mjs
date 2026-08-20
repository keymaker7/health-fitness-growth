// 일지·달력이 실제로 남는지 브라우저로 확인한다.
//
//   node scripts/journal.test.mjs        (미리 `npm run build` 필요)
//
// 일지의 핵심은 «다시 열었을 때 그대로 있는가» 다. 저장 버튼이 눌리는 것만 봐서는
// IndexedDB 승급(v1→v2)이 실패해도 모른다. 그래서 **새로고침한 뒤** 확인한다.

import { chromium } from '/Volumes/ssd/dev/word-chain-kr/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';

const SHELL = '/Users/keymaker/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const PORT = 8715;
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], { stdio: 'ignore' });
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(BASE); if (r.ok) break; } catch { /* 아직 */ }
  await sleep(500);
}

const browser = await chromium.launch({ executablePath: SHELL });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const TEXT = '오늘 줄넘기를 했다. 처음엔 힘들었는데 마지막엔 40개를 넘겼다.';

try {
  console.log('\n[일지 쓰기]');
  await page.goto(`${BASE}/journal`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  ok('달력이 먼저 보인다', await page.getByRole('button', { name: '다음 달' }).isVisible());
  ok('오늘의 일지 칸이 있다', await page.locator('#journal-text').isVisible());

  await page.getByRole('button', { name: /뿌듯/ }).click();
  await page.locator('#journal-text').fill(TEXT);
  await page.getByRole('button', { name: '일지 저장' }).click();
  await page.waitForTimeout(600);
  ok('저장했다는 표시가 뜬다', await page.getByText('저장했어요').isVisible());

  console.log('\n[새로고침해도 남아 있다]');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  ok('쓴 내용이 그대로 있다', (await page.locator('#journal-text').inputValue()) === TEXT);
  ok('고른 마음이 그대로 있다',
    (await page.getByRole('button', { name: /뿌듯/ }).getAttribute('aria-pressed')) === 'true');
  ok('«저장됨» 으로 바뀐다', await page.getByText('저장됨').isVisible());

  console.log('\n[달력에 표시된다]');
  const todayLabel = await page.evaluate(() => String(new Date().getDate()));
  const cell = page.locator('button[aria-label*="기록 있음"]').filter({ hasText: todayLabel }).first();
  ok('오늘 칸에 «기록 있음» 이 붙는다', (await cell.count()) > 0);

  console.log('\n[다른 날을 고르면 그 날 것이 뜬다]');
  // 이번 달 1일을 고른다 (오늘이 1일이면 2일)
  const other = todayLabel === '1' ? '2' : '1';
  await page.locator('div.grid button').filter({ hasText: new RegExp(`^${other}$`) }).first().click();
  await page.waitForTimeout(500);
  ok('빈 날은 빈 칸으로 열린다', (await page.locator('#journal-text').inputValue()) === '');
  ok('그 날 제목으로 바뀐다', await page.getByText(/의 일지$/).isVisible());

  console.log('\n[오류]');
  const real = errors.filter((e) => !/favicon|AudioContext|autoplay/i.test(e));
  ok('콘솔 오류 없음', real.length === 0, real.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  server.kill();
}

console.log(`\n${pass}개 통과${fail ? ` · ${fail}개 실패` : ''}`);
process.exit(fail ? 1 : 0);
