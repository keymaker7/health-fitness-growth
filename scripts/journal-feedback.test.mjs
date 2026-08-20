// 도우미 피드백 배선 시험 — **에이전트 없이** 확인한다.
//
//   node scripts/journal-feedback.test.mjs
//
// 진짜 Copilot Studio 없이도 봐야 하는 것이 셋 있다.
//   ① 연결 안 된 상태에서 앱이 멀쩡한가 (버튼이 안 보이고 오류도 안 남)
//   ② 연결되면 일지가 도우미에게 «어떤 모양으로» 가는가
//   ③ 받은 답이 그날 일지에 남아 새로고침 후에도 보이는가
// 그래서 Direct Line 흉내를 내는 작은 서버를 세워 그 자리에 끼운다.

import { chromium } from '/Volumes/ssd/dev/word-chain-kr/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const SHELL = '/Users/keymaker/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const APP = 8717, FAKE = 8718;
const BASE = `http://localhost:${APP}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const REPLY = '줄넘기 40개를 넘긴 게 오늘의 큰 걸음이에요. 다음엔 쉬지 않고 50개, 좋은 목표예요!';

let pass = 0, fail = 0;
const ok = (n, c, e = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${e ? ' — ' + e : ''}`); } };

// ── Direct Line 흉내 ────────────────────────────────
let seenPrompt = '';
const fake = createServer((req, res) => {
  const send = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
  if (req.url === '/token') return send({ token: 'test-token' });
  if (req.url === '/dl/tokens/generate' && req.method === 'POST') {
    // 비밀키로 토큰을 발급받는 길
    return req.headers.authorization === 'Bearer test-secret'
      ? send({ token: 'test-token' })
      : ((res.statusCode = 401), res.end());
  }
  if (req.url === '/dl/conversations' && req.method === 'POST') return send({ conversationId: 'c1' });
  if (req.url?.includes('/activities') && req.method === 'POST') {
    let b = ''; req.on('data', (c) => (b += c));
    return req.on('end', () => { seenPrompt = JSON.parse(b).text; send({ id: 'a1' }); });
  }
  if (req.url?.includes('/activities')) {
    return send({ watermark: '1', activities: [{ type: 'message', from: { id: 'bot' }, text: REPLY }] });
  }
  res.statusCode = 404; res.end();
});
await new Promise((r) => fake.listen(FAKE, r));

async function run(env, body) {
  const server = spawn('npx', ['next', 'start', '-p', String(APP)], { stdio: 'ignore', env: { ...process.env, ...env } });
  for (let i = 0; i < 60; i++) { try { const r = await fetch(BASE); if (r.ok) break; } catch {} await sleep(500); }
  const browser = await chromium.launch({ executablePath: SHELL });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try { await body(page, errors); } finally { await browser.close(); server.kill(); await sleep(1200); }
}

try {
  console.log('\n[도우미가 연결 안 됐을 때]');
  await run({}, async (page, errors) => {
    await page.goto(`${BASE}/journal`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    ok('도우미 버튼이 안 보인다', (await page.getByRole('button', { name: /도우미에게/ }).count()) === 0);
    ok('일지는 그대로 쓸 수 있다', await page.locator('#journal-text').isVisible());
    const r = await page.evaluate(() => fetch('/api/journal-feedback').then((x) => x.json()));
    ok('앱이 «꺼짐» 이라고 답한다', r.enabled === false, JSON.stringify(r));
    ok('오류 없음', errors.length === 0, errors[0]);
  });

  console.log('\n[도우미가 연결됐을 때 — 비밀키 방식]');
  await run({
    COPILOT_DIRECTLINE_SECRET: 'test-secret',
    COPILOT_DIRECTLINE_BASE: `http://localhost:${FAKE}/dl`,
  }, async (page, errors) => {
    await page.goto(`${BASE}/journal`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /뿌듯/ }).click();
    await page.locator('#journal-text').fill('오늘 줄넘기를 했다. 마지막엔 40개를 넘겼다.');
    ok('도우미 버튼이 보인다', await page.getByRole('button', { name: /도우미에게/ }).isVisible());
    await page.getByRole('button', { name: /도우미에게/ }).click();
    await page.waitForTimeout(6000);
    ok('도우미 답이 화면에 뜬다', await page.getByText(REPLY).isVisible());

    ok('일지·마음·운동이 함께 전달된다',
      seenPrompt.includes('일지:') && seenPrompt.includes('뿌듯') && seenPrompt.includes('오늘 한 운동'),
      seenPrompt.replace(/\n/g, ' / '));
    // SharePoint 에 «누구의 일지인가» 를 남기려면 번호가 함께 가야 한다
    ok('학생 번호 칸이 함께 간다', seenPrompt.includes('학생 번호:'),
      seenPrompt.split('\n')[0]);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    ok('새로고침해도 답이 남아 있다', await page.getByText(REPLY).isVisible());
    ok('아이가 쓴 글도 그대로다',
      (await page.locator('#journal-text').inputValue()).includes('40개를 넘겼다'));
    ok('오류 없음', errors.length === 0, errors[0]);
  });
} finally {
  fake.close();
}

console.log(`\n${pass}개 통과${fail ? ` · ${fail}개 실패` : ''}`);
process.exit(fail ? 1 : 0);
