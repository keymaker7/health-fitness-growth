// 직선-눈금 보정(fromRuler)의 수학 검증 — 카메라·브라우저 없이 순수 계산만 본다.
//   node scripts/longjump-ruler.test.mjs
//
// 핵심: 원근으로 먼 쪽이 압축된 바닥 직선을, 아는 거리 점 몇 개로 되살릴 수 있는가.
// 눈금 사이(보간)와 눈금 너머(외삽)에서 실제 거리를 얼마나 맞히는지 본다.
import { Calibration } from '../src/features/long-jump/longjump.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ── 합성 원근 카메라 ───────────────────────────────────
// 참 사영변환: d = (A·t + B)/(C·t + 1). C>0 이면 t 커질수록(먼 쪽) 압축된다.
const A = 2.0, B = 0, C = 0.001;
const tOf = (d) => (d - B) / (A - d * C);      // 실제거리 d → 화면 축위치 t (역함수)
const ORIGIN = { x: 100, y: 400 };             // 발구름선의 화면 위치
const AXIS = { x: 1, y: 0 };                    // 뛰는 방향(가로)
const pxAt = (d) => ({ x: ORIGIN.x + AXIS.x * tOf(d), y: ORIGIN.y + AXIS.y * tOf(d) });

// 0·100·200·300cm 지점을 찍었다고 하자
const marks = [0, 100, 200, 300].map(d => ({ ...pxAt(d), distCm: d }));
const cal = Calibration.fromRuler(marks);

ok('보정 성공(kind=ruler)', cal.ok && cal.kind === 'ruler', `kind=${cal.kind} err=${cal.error}`);

// 눈금 지점은 당연히 정확해야 한다
for (const d of [0, 100, 200, 300]) {
  const p = pxAt(d);
  const w = cal.toWorld(p.x, p.y);
  ok(`눈금 ${d}cm 복원`, w && near(w.y, d, 1.0), `got ${w && w.y.toFixed(2)}`);
}

// 눈금 사이(보간) — 원근 곡선을 제대로 맞췄는지가 여기서 드러난다
for (const d of [50, 150, 245]) {
  const p = pxAt(d);
  const w = cal.toWorld(p.x, p.y);
  ok(`보간 ${d}cm 복원(±2cm)`, w && near(w.y, d, 2.0), `got ${w && w.y.toFixed(2)}`);
}

// 직선(1차) 근사로 같은 점을 재면 크게 틀린다 — 사영보정이 실제로 값을 하는지 대조
{
  const dTrue = 245;
  const p = pxAt(dTrue);
  // 200·300 두 눈금만으로 직선 근사
  const lin = Calibration.fromRuler([marks[2], marks[3]]);
  const wl = lin.toWorld(p.x, p.y);
  ok('직선근사는 오히려 더 틀림(대조군)', wl && Math.abs(wl.y - dTrue) > Math.abs(cal.toWorld(p.x, p.y).y - dTrue) - 0.01,
    `lin=${wl && wl.y.toFixed(2)} proj=${cal.toWorld(p.x, p.y).y.toFixed(2)}`);
}

// 눈금 너머(외삽)는 outOfRange 로 잡혀야 한다
{
  const p = pxAt(360);
  const w = cal.toWorld(p.x, p.y);
  ok('눈금 너머 360cm 는 범위밖 경고', cal.outOfRange(w), `oor=${cal.outOfRange(w)} y=${w && w.y.toFixed(1)}`);
}

// 해상도(px/cm)가 양수로 나온다
ok('해상도 계산됨', (cal.resolutionPxPerCm() ?? 0) > 0, `res=${cal.resolutionPxPerCm()}`);

// 2점만 줘도 (원근 무시) 동작은 한다
{
  const two = Calibration.fromRuler([{ x: 100, y: 400, distCm: 0 }, { x: 200, y: 400, distCm: 100 }]);
  const w = two.toWorld(150, 400);
  ok('2점 보정: 150px = 50cm(선형)', two.ok && near(w.y, 50, 0.5), `got ${w && w.y.toFixed(2)}`);
}

// 사영 특이점(분모 0 통과)으로 무너지는 배치는 거부한다
{
  // 거의 한 점에 뭉친(원근 붕괴) 배치를 흉내: 먼 두 점이 화면상 거의 안 벌어짐
  const bad = Calibration.fromRuler([
    { x: 100, y: 400, distCm: 0 }, { x: 300, y: 400, distCm: 100 },
    { x: 305, y: 400, distCm: 200 }, { x: 306, y: 400, distCm: 300 },
  ]);
  ok('원근 붕괴 배치는 거부', !bad.ok, `kind=${bad.kind}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
