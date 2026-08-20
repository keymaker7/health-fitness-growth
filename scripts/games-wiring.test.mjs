// 게임 화면이 «측정 도구와 같은 판정·같은 모델» 을 쓰는지 실제 브라우저로 확인한다.
//
//   node scripts/games-wiring.test.mjs        (미리 `npm run build` 필요)
//
// 규칙 자체는 counter.js·squat.js 쪽 시험이 본다. 여기서 보는 것은 **배선**이다 —
// 게임이 바깥 CDN 을 부르지 않는지, 시뮬레이션이 실제로 세어지는지.

import { chromium } from '/Volumes/ssd/dev/word-chain-kr/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';

const SHELL = '/Users/keymaker/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const PORT = 8713;
const BASE = `http://localhost:${PORT}`;

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], { stdio: 'ignore' });
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(BASE); if (r.ok) break; } catch { /* 아직 안 떴다 */ }
  await sleep(500);
}

const browser = await chromium.launch({
  executablePath: SHELL,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['camera'] });

/** 페이지를 열고 바깥(CDN) 요청을 감시한다 */
async function open(path) {
  const page = await ctx.newPage();
  const outside = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(BASE) && /mediapipe|jsdelivr|googleapis|\.task|wasm/.test(u)) outside.push(u);
  });
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  return { page, outside };
}

try {
  console.log('\n[스쿼트 레이스 — 시뮬레이션이 실제로 세어지는가]');
  {
    const { page, outside } = await open('/games/squat-race');
    await page.getByRole('button', { name: /레이스 준비|시작/ }).first().click().catch(() => {});
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /시뮬레이션 시작/ }).click();
    await page.waitForTimeout(11_000);              // 한 개에 2초 + 기준 잡는 1초
    const shown = Number((await page.locator('p.tabular-nums').first().textContent())?.replace(/\D/g, '') || 0);
    ok('시뮬레이션 스쿼트가 세어진다', shown >= 2, `${shown}회`);
    ok('바깥 CDN 을 부르지 않는다', outside.length === 0, outside.slice(0, 2).join(' '));
    await page.close();
  }

  console.log('\n[다인원 줄넘기 — 네 명이 각각 세어지는가]');
  {
    const { page, outside } = await open('/games/multi-jump');
    await page.getByRole('button', { name: /시뮬레이션/ }).first().click();
    await page.waitForTimeout(9_000);
    const rows = await page.locator('[data-testid="people"] li').allTextContents();
    const counts = rows.map((t) => Number(t.replace(/\D/g, '')));
    ok('여러 명이 잡힌다', rows.length >= 2, `${rows.length}명 · ${rows.join(' / ')}`);
    ok('점프가 세어진다', counts.some((n) => n >= 1), counts.join(','));
    ok('바깥 CDN 을 부르지 않는다', outside.length === 0, outside.slice(0, 2).join(' '));
    await page.close();
  }

  console.log('\n[카메라를 켜면 앱 안 모델을 쓰는가]');
  {
    const { page, outside } = await open('/games/multi-jump');
    const own = [];
    page.on('request', (r) => {
      const u = r.url();
      if (u.startsWith(BASE) && /\.task|vision_bundle|wasm/.test(u)) own.push(u.replace(BASE, ''));
    });
    await page.getByRole('button', { name: /카메라/ }).first().click();
    await page.waitForTimeout(15_000);
    ok('앱 안의 full 모델을 받는다', own.some((u) => u.includes('pose_landmarker_full.task')), own.join(' '));
    ok('바깥 CDN 요청 0건', outside.length === 0, outside.slice(0, 2).join(' '));
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log(`\n${pass}개 통과${fail ? ` · ${fail}개 실패` : ''}`);
process.exit(fail ? 1 : 0);
