// 학급 모드 시험 — **한 대로 여러 명**이 되는지 본다.
//
//   node scripts/classroom.test.mjs        (미리 `npm run build` 필요)
//
// 여기서 꼭 봐야 하는 것은 «남의 기록이 섞이지 않는가» 다.
// 30명이 한 태블릿을 돌려쓰는데 기록이 섞이면 그 앱은 교실에서 못 쓴다.

import { chromium } from '/Volumes/ssd/dev/word-chain-kr/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';

const SHELL = '/Users/keymaker/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const PORT = 8719;
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (n, c, e = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${e ? ' — ' + e : ''}`); } };

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], { stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { const r = await fetch(BASE); if (r.ok) break; } catch {} await sleep(500); }

const browser = await chromium.launch({ executablePath: SHELL });
const page = await browser.newPage({ viewport: { width: 430, height: 950 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

/** 오른쪽 위 사람 아이콘을 열고 학생을 고른다 */
async function pick(label) {
  await page.locator('header button').last().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(900);
}

try {
  console.log('\n[명단 넣기 전 — 예전 그대로]');
  await page.goto(`${BASE}/journal`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  ok('일지 화면이 그대로 열린다', await page.locator('#journal-text').isVisible());

  console.log('\n[명단 넣기]');
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.locator('textarea').first().fill('6-2-01\n6-2-02\n6-2-03');
  await page.getByRole('button', { name: /명단 저장/ }).click();
  await page.waitForTimeout(1500);
  ok('3명으로 저장된다', await page.getByText(/전체 3명/).isVisible());

  console.log('\n[1번 학생이 일지를 쓴다]');
  await page.goto(`${BASE}/journal`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await pick('6-2-01');
  await page.locator('#journal-text').fill('1번이 쓴 일지입니다.');
  await page.getByRole('button', { name: '일지 저장' }).click();
  await page.waitForTimeout(800);
  ok('1번 일지가 저장된다', await page.getByText('저장했어요').isVisible());

  console.log('\n[2번 학생으로 바꾼다]');
  await pick('6-2-02');
  ok('2번 칸은 비어 있다 (남의 글이 안 보인다)',
    (await page.locator('#journal-text').inputValue()) === '',
    await page.locator('#journal-text').inputValue());
  await page.locator('#journal-text').fill('2번이 쓴 일지입니다.');
  await page.getByRole('button', { name: '일지 저장' }).click();
  await page.waitForTimeout(800);

  console.log('\n[1번으로 돌아온다]');
  await pick('6-2-01');
  ok('1번 글이 그대로 있다',
    (await page.locator('#journal-text').inputValue()) === '1번이 쓴 일지입니다.',
    await page.locator('#journal-text').inputValue());

  console.log('\n[새로고침해도 학생이 유지된다]');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  ok('마지막에 고른 학생이 그대로다',
    (await page.locator('#journal-text').inputValue()) === '1번이 쓴 일지입니다.');

  console.log('\n[오류]');
  const real = errors.filter((e) => !/favicon|AudioContext/i.test(e));
  ok('콘솔 오류 없음', real.length === 0, real.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  server.kill();
}

console.log(`\n${pass}개 통과${fail ? ` · ${fail}개 실패` : ''}`);
process.exit(fail ? 1 : 0);
