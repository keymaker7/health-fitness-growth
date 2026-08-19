/**
 * Generates design/health-growth.pen — pen.dev v2.17 source of truth.
 * Run: node scripts/build-pen.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const T = (id, extra) => ({
  id,
  type: "text",
  fontFamily: "Noto Sans KR",
  textGrowth: "auto",
  ...extra,
});

const Ico = (id, icon, extra = {}) => ({
  id,
  type: "icon",
  library: "lucide",
  icon,
  width: 20,
  height: 20,
  ...extra,
});

const document = {
  version: "2.17",
  variables: {
    "color.bg": { type: "color", value: "#F3F7F4" },
    "color.card": { type: "color", value: "#FFFFFF" },
    "color.ink": { type: "color", value: "#10241E" },
    "color.muted": { type: "color", value: "#5A7269" },
    "color.line": { type: "color", value: "#D7E5DE" },
    "color.brand": { type: "color", value: "#0F766E" },
    "color.brandSoft": { type: "color", value: "#CCFBF1" },
    "color.brandInk": { type: "color", value: "#134E4A" },
    "color.accent": { type: "color", value: "#F59E0B" },
    "color.danger": { type: "color", value: "#E11D48" },
    "color.cardio": { type: "color", value: "#E11D48" },
    "color.strength": { type: "color", value: "#EA580C" },
    "color.flex": { type: "color", value: "#7C3AED" },
    "color.body": { type: "color", value: "#0284C7" },
    "radius.card": { type: "number", value: 20 },
    "radius.btn": { type: "number", value: 16 },
    "space.gap": { type: "number", value: 16 },
    "font.title": { type: "number", value: 32 },
    "font.body": { type: "number", value: 16 },
  },
  children: [
    {
      id: "brief",
      type: "note",
      x: 0,
      y: -180,
      width: 640,
      height: 140,
      fontFamily: "Noto Sans KR",
      fontSize: 14,
      content:
        "건강체력 성장일지 · Active / Healthy / Friendly / Modern\n화이트 베이스 + 체력요소 컬러. 초등 체육수업용(태블릿/크롬북/PC).\n이 파일이 디자인 소스입니다. 코드는 토큰·레이아웃을 그대로 구현합니다.",
    },

    // ——— Components ———
    {
      id: "cmp-btn-primary",
      name: "Button / Primary",
      type: "frame",
      reusable: true,
      x: 0,
      y: 0,
      layout: "horizontal",
      padding: [14, 20],
      gap: 8,
      alignItems: "center",
      justifyContent: "center",
      fill: "$color.brand",
      cornerRadius: "$radius.btn",
      children: [
        T("cmp-btn-primary-label", {
          content: "추천 운동 시작",
          fill: "#FFFFFF",
          fontSize: 16,
          fontWeight: "700",
        }),
      ],
    },
    {
      id: "cmp-btn-ghost",
      name: "Button / Ghost",
      type: "frame",
      reusable: true,
      x: 220,
      y: 0,
      layout: "horizontal",
      padding: [14, 20],
      gap: 8,
      alignItems: "center",
      fill: "$color.card",
      stroke: "$color.line",
      strokeWidth: 1,
      cornerRadius: "$radius.btn",
      children: [
        T("cmp-btn-ghost-label", {
          content: "체력 게임",
          fill: "$color.ink",
          fontSize: 16,
          fontWeight: "700",
        }),
      ],
    },
    {
      id: "cmp-card",
      name: "Card",
      type: "frame",
      reusable: true,
      x: 400,
      y: 0,
      width: 280,
      layout: "vertical",
      padding: 20,
      gap: 8,
      fill: "$color.card",
      stroke: "$color.line",
      strokeWidth: 1,
      cornerRadius: "$radius.card",
      children: [
        T("cmp-card-kicker", { content: "오늘 운동", fill: "$color.muted", fontSize: 13, fontWeight: "600" }),
        T("cmp-card-value", { content: "2회", fill: "$color.ink", fontSize: 28, fontWeight: "800" }),
      ],
    },
    {
      id: "cmp-nav-active",
      name: "Nav / Active",
      type: "frame",
      reusable: true,
      x: 700,
      y: 0,
      width: 216,
      layout: "horizontal",
      padding: [10, 12],
      gap: 10,
      alignItems: "center",
      fill: "$color.brand",
      cornerRadius: 14,
      children: [
        Ico("cmp-nav-active-ico", "house", { fill: "#FFFFFF", width: 18, height: 18 }),
        T("cmp-nav-active-label", { content: "홈", fill: "#FFFFFF", fontSize: 14, fontWeight: "700" }),
      ],
    },
    {
      id: "cmp-nav",
      name: "Nav / Idle",
      type: "frame",
      reusable: true,
      x: 940,
      y: 0,
      width: 216,
      layout: "horizontal",
      padding: [10, 12],
      gap: 10,
      alignItems: "center",
      cornerRadius: 14,
      children: [
        Ico("cmp-nav-ico", "gamepad-2", { fill: "$color.muted", width: 18, height: 18 }),
        T("cmp-nav-label", { content: "체력 게임", fill: "$color.muted", fontSize: 14, fontWeight: "700" }),
      ],
    },

    // ——— Home Desktop 1440 ———
    {
      id: "screen-home-desktop",
      name: "Home / Desktop 1440",
      type: "frame",
      x: 0,
      y: 160,
      width: 1440,
      height: 900,
      fill: "$color.bg",
      clip: true,
      layout: "horizontal",
      children: [
        {
          id: "sidebar",
          type: "frame",
          width: 248,
          height: 900,
          fill: "$color.card",
          stroke: { type: "color", color: "$color.line" },
          strokeWidth: { right: 1 },
          layout: "vertical",
          padding: 20,
          gap: 8,
          children: [
            {
              id: "brand-block",
              type: "frame",
              layout: "vertical",
              gap: 6,
              padding: [8, 4, 16, 4],
              children: [
                T("brand-kicker", {
                  content: "GROWTH PE",
                  fill: "$color.brand",
                  fontSize: 11,
                  fontWeight: "800",
                  letterSpacing: 1.2,
                }),
                T("brand-title", { content: "건강체력 성장일지", fill: "$color.ink", fontSize: 18, fontWeight: "800" }),
                {
                  id: "student-chip",
                  type: "frame",
                  layout: "horizontal",
                  gap: 8,
                  alignItems: "center",
                  padding: [8, 10],
                  fill: "$color.brandSoft",
                  cornerRadius: 999,
                  children: [
                    {
                      id: "avatar",
                      type: "ellipse",
                      width: 22,
                      height: 22,
                      fill: "$color.brand",
                    },
                    T("student-name", { content: "5-3-12 · 5학년 3반", fill: "$color.brandInk", fontSize: 12, fontWeight: "700" }),
                  ],
                },
              ],
            },
            { id: "nav-home", type: "ref", ref: "cmp-nav-active" },
            { id: "nav-mine", type: "ref", ref: "cmp-nav", descendants: { "cmp-nav-label": { content: "나의 건강체력" }, "cmp-nav-ico": { icon: "heart-pulse" } } },
            { id: "nav-paps", type: "ref", ref: "cmp-nav", descendants: { "cmp-nav-label": { content: "PAPS 알아보기" }, "cmp-nav-ico": { icon: "book-open" } } },
            { id: "nav-health", type: "ref", ref: "cmp-nav", descendants: { "cmp-nav-label": { content: "건강체력" }, "cmp-nav-ico": { icon: "activity" } } },
            { id: "nav-sport", type: "ref", ref: "cmp-nav", descendants: { "cmp-nav-label": { content: "운동체력" }, "cmp-nav-ico": { icon: "dumbbell" } } },
            { id: "nav-rec", type: "ref", ref: "cmp-nav", descendants: { "cmp-nav-label": { content: "맞춤 운동" }, "cmp-nav-ico": { icon: "sparkles" } } },
            { id: "nav-games", type: "ref", ref: "cmp-nav", descendants: { "cmp-nav-label": { content: "체력 게임" }, "cmp-nav-ico": { icon: "gamepad-2" } } },
            { id: "nav-journal", type: "ref", ref: "cmp-nav", descendants: { "cmp-nav-label": { content: "건강체력 일지" }, "cmp-nav-ico": { icon: "notebook-pen" } } },
            { id: "nav-growth", type: "ref", ref: "cmp-nav", descendants: { "cmp-nav-label": { content: "나의 성장" }, "cmp-nav-ico": { icon: "line-chart" } } },
            { id: "nav-brain", type: "ref", ref: "cmp-nav", descendants: { "cmp-nav-label": { content: "마음·몸 회복" }, "cmp-nav-ico": { icon: "brain" } } },
          ],
        },
        {
          id: "main",
          type: "frame",
          width: 1192,
          height: 900,
          layout: "vertical",
          padding: [32, 40],
          gap: 20,
          fill: "$color.bg",
          children: [
            {
              id: "hero",
              type: "frame",
              layout: "vertical",
              padding: 28,
              gap: 8,
              fill: "$color.brand",
              cornerRadius: 28,
              children: [
                T("hero-kicker", { content: "측정하는 체육에서 성장하는 체육으로", fill: "#99F6E4", fontSize: 13, fontWeight: "700" }),
                T("hero-title", { content: "오늘도 내 몸을 성장시켜 볼까요?", fill: "#FFFFFF", fontSize: 32, fontWeight: "800" }),
                T("hero-sub", { content: "5-3-12 · 체력의 변화뿐 아니라, 운동으로 달라지는 마음까지 기록해요.", fill: "#CCFBF1", fontSize: 15 }),
              ],
            },
            {
              id: "metrics",
              type: "frame",
              layout: "horizontal",
              gap: 16,
              children: [
                metric("m1", "오늘 운동", "2회"),
                metric("m2", "연속 운동", "5일 🔥"),
                metric("m3", "이번 주", "74분"),
              ],
            },
            {
              id: "two-col",
              type: "frame",
              layout: "horizontal",
              gap: 16,
              children: [
                {
                  id: "fitness-panel",
                  type: "frame",
                  width: 560,
                  layout: "vertical",
                  gap: 12,
                  children: [
                    T("fit-h", { content: "나의 건강체력", fill: "$color.ink", fontSize: 18, fontWeight: "800" }),
                    fitnessRow("f-cardio", "$color.cardio", "심폐지구력", "오랫동안 운동할 수 있는 힘", "★★★★☆"),
                    fitnessRow("f-str", "$color.strength", "근력·근지구력", "반복해서 힘을 내는 힘", "★★★☆☆"),
                    fitnessRow("f-flex", "$color.flex", "유연성", "관절이 잘 움직이는 힘", "★★☆☆☆"),
                    fitnessRow("f-body", "$color.body", "신체조성", "건강한 몸의 균형", "★★★★☆"),
                  ],
                },
                {
                  id: "action-col",
                  type: "frame",
                  width: 536,
                  layout: "vertical",
                  gap: 16,
                  children: [
                    {
                      id: "rec-card",
                      type: "frame",
                      layout: "vertical",
                      padding: 22,
                      gap: 12,
                      fill: "$color.card",
                      stroke: "$color.line",
                      strokeWidth: 1,
                      cornerRadius: 24,
                      children: [
                        T("rec-h", { content: "오늘의 추천", fill: "$color.ink", fontSize: 18, fontWeight: "800" }),
                        T("rec-why", { content: "🧘 유연성이 조금 부족해요.", fill: "$color.flex", fontSize: 15, fontWeight: "700" }),
                        recItem("ri1", "5분 전신 스트레칭"),
                        recItem("ri2", "앉아 윗몸 앞으로 굽히기 연습"),
                        recItem("ri3", "하체 스트레칭"),
                        { id: "rec-cta", type: "ref", ref: "cmp-btn-primary" },
                      ],
                    },
                    {
                      id: "challenge",
                      type: "frame",
                      layout: "vertical",
                      padding: 22,
                      gap: 10,
                      fill: "#FFFBEB",
                      stroke: "#FDE68A",
                      strokeWidth: 1,
                      cornerRadius: 24,
                      children: [
                        T("ch-h", { content: "오늘의 도전", fill: "$color.ink", fontSize: 18, fontWeight: "800" }),
                        T("ch-1", { content: "🪢  줄넘기 100회", fill: "$color.ink", fontSize: 16, fontWeight: "700" }),
                        T("ch-2", { content: "🏋️  스쿼트 30회", fill: "$color.ink", fontSize: 16, fontWeight: "700" }),
                        { id: "ch-cta", type: "ref", ref: "cmp-btn-ghost" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // ——— Home Mobile 390 ———
    {
      id: "screen-home-mobile",
      name: "Home / Mobile 390",
      type: "frame",
      x: 1520,
      y: 160,
      width: 390,
      height: 844,
      fill: "$color.bg",
      clip: true,
      layout: "vertical",
      children: [
        {
          id: "m-top",
          type: "frame",
          width: 390,
          layout: "horizontal",
          padding: [14, 16],
          justifyContent: "space_between",
          alignItems: "center",
          fill: "$color.card",
          stroke: { type: "color", color: "$color.line" },
          strokeWidth: { bottom: 1 },
          children: [
            Ico("m-menu", "menu", { fill: "$color.ink" }),
            T("m-top-title", { content: "건강체력 성장일지", fill: "$color.ink", fontSize: 15, fontWeight: "800" }),
            { id: "m-spacer", type: "frame", width: 20, height: 20 },
          ],
        },
        {
          id: "m-scroll",
          type: "frame",
          width: 390,
          height: 700,
          layout: "vertical",
          padding: 16,
          gap: 14,
          children: [
            {
              id: "m-hero",
              type: "frame",
              layout: "vertical",
              padding: 20,
              gap: 6,
              fill: "$color.brand",
              cornerRadius: 22,
              children: [
                T("m-hero-k", { content: "GROWTH PE", fill: "#99F6E4", fontSize: 11, fontWeight: "800" }),
                T("m-hero-t", { content: "오늘 뭐 해볼까?", fill: "#FFFFFF", fontSize: 24, fontWeight: "800" }),
                T("m-hero-s", { content: "5-3-12, 유연성을 키워볼까요?", fill: "#CCFBF1", fontSize: 13 }),
              ],
            },
            {
              id: "m-metrics",
              type: "frame",
              layout: "horizontal",
              gap: 8,
              children: [
                miniMetric("mm1", "오늘", "2회"),
                miniMetric("mm2", "연속", "5일"),
                miniMetric("mm3", "이번주", "74분"),
              ],
            },
            fitnessRow("mf1", "$color.flex", "유연성", "조금 부족해요", "★★☆☆☆"),
            {
              id: "m-cta-row",
              type: "frame",
              layout: "vertical",
              gap: 8,
              children: [
                { id: "m-cta1", type: "ref", ref: "cmp-btn-primary", descendants: { "cmp-btn-primary-label": { content: "추천 운동 시작" } } },
                { id: "m-cta2", type: "ref", ref: "cmp-btn-ghost", descendants: { "cmp-btn-ghost-label": { content: "체력 게임 시작" } } },
              ],
            },
          ],
        },
        {
          id: "m-bottom",
          type: "frame",
          width: 390,
          layout: "horizontal",
          padding: [8, 6, 12, 6],
          justifyContent: "space_between",
          fill: "$color.card",
          stroke: { type: "color", color: "$color.line" },
          strokeWidth: { top: 1 },
          children: [
            bottomItem("b1", "house", "홈", true),
            bottomItem("b2", "sparkles", "운동", false),
            bottomItem("b3", "gamepad-2", "게임", false),
            bottomItem("b4", "book-open", "일지", false),
            bottomItem("b5", "trophy", "성장", false),
          ],
        },
      ],
    },

    // ——— Games ———
    {
      id: "screen-games",
      name: "Games / Desktop",
      type: "frame",
      x: 0,
      y: 1120,
      width: 1440,
      height: 900,
      fill: "$color.bg",
      layout: "horizontal",
      clip: true,
      children: [
        {
          id: "g-side",
          type: "frame",
          width: 248,
          height: 900,
          fill: "$color.card",
          children: [],
        },
        {
          id: "g-main",
          type: "frame",
          width: 1192,
          layout: "vertical",
          padding: [32, 40],
          gap: 20,
          children: [
            T("g-kicker", { content: "체력 게임", fill: "$color.brand", fontSize: 13, fontWeight: "800" }),
            T("g-title", { content: "오늘 뭐 해볼까?", fill: "$color.ink", fontSize: 32, fontWeight: "800" }),
            T("g-sub", { content: "혼자 도전하거나, 친구와 힘을 합쳐요. 경쟁보다 성장이에요.", fill: "$color.muted", fontSize: 15 }),
            {
              id: "g-grid",
              type: "frame",
              layout: "horizontal",
              gap: 16,
              children: [
                gameTile("gt1", "🪢", "개인 줄넘기", "Micro:bit 또는 시뮬레이션"),
                gameTile("gt2", "👥", "다인원 줄넘기", "카메라로 ID를 유지하며 세기"),
                gameTile("gt3", "🏃", "스쿼트 레이스", "바른 자세로 캐릭터 전진"),
                gameTile("gt4", "🐲", "팀 보스 배틀", "함께 스쿼트해서 HP 줄이기"),
              ],
            },
          ],
        },
      ],
    },

    // ——— Jump rope ———
    {
      id: "screen-jump",
      name: "Jump Rope / Session",
      type: "frame",
      x: 1520,
      y: 1120,
      width: 390,
      height: 844,
      fill: "$color.bg",
      layout: "vertical",
      padding: 16,
      gap: 14,
      clip: true,
      children: [
        T("j-k", { content: "개인 줄넘기", fill: "$color.brand", fontSize: 13, fontWeight: "800" }),
        T("j-name", { content: "🪢  5-3-12", fill: "$color.ink", fontSize: 22, fontWeight: "800" }),
        {
          id: "j-count",
          type: "frame",
          layout: "vertical",
          padding: 28,
          gap: 6,
          alignItems: "center",
          fill: "$color.card",
          stroke: "$color.line",
          strokeWidth: 1,
          cornerRadius: 28,
          children: [
            T("j-cl", { content: "현재 기록", fill: "$color.muted", fontSize: 13, fontWeight: "600" }),
            T("j-cv", { content: "127회", fill: "$color.brand", fontSize: 56, fontWeight: "800" }),
            {
              id: "j-stats",
              type: "frame",
              layout: "horizontal",
              gap: 24,
              children: [
                statCol("js1", "운동시간", "02:03"),
                statCol("js2", "최고 연속", "53회"),
                statCol("js3", "속도", "62 RPM"),
              ],
            },
          ],
        },
        { id: "j-bt", type: "ref", ref: "cmp-btn-primary", descendants: { "cmp-btn-primary-label": { content: "Micro:bit 연결" } } },
        { id: "j-sim", type: "ref", ref: "cmp-btn-ghost", descendants: { "cmp-btn-ghost-label": { content: "시뮬레이션 시작" } } },
      ],
    },
  ],
};

function metric(id, k, v) {
  return {
    id,
    type: "frame",
    width: "fill_container",
    layout: "vertical",
    padding: 18,
    gap: 4,
    fill: "$color.card",
    stroke: "$color.line",
    strokeWidth: 1,
    cornerRadius: 20,
    children: [
      T(`${id}-k`, { content: k, fill: "$color.muted", fontSize: 13, fontWeight: "600" }),
      T(`${id}-v`, { content: v, fill: "$color.ink", fontSize: 26, fontWeight: "800" }),
    ],
  };
}

function miniMetric(id, k, v) {
  return {
    id,
    type: "frame",
    width: "fill_container",
    layout: "vertical",
    padding: [12, 10],
    gap: 2,
    alignItems: "center",
    fill: "$color.card",
    stroke: "$color.line",
    strokeWidth: 1,
    cornerRadius: 16,
    children: [
      T(`${id}-k`, { content: k, fill: "$color.muted", fontSize: 11, fontWeight: "600" }),
      T(`${id}-v`, { content: v, fill: "$color.ink", fontSize: 16, fontWeight: "800" }),
    ],
  };
}

function fitnessRow(id, color, name, desc, stars) {
  return {
    id,
    type: "frame",
    layout: "horizontal",
    padding: 14,
    gap: 12,
    alignItems: "center",
    fill: "$color.card",
    stroke: "$color.line",
    strokeWidth: 1,
    cornerRadius: 18,
    children: [
      { id: `${id}-bar`, type: "rectangle", width: 6, height: 36, fill: color, cornerRadius: 99 },
      {
        id: `${id}-txt`,
        type: "frame",
        layout: "vertical",
        gap: 2,
        width: "fill_container",
        children: [
          T(`${id}-n`, { content: name, fill: "$color.ink", fontSize: 15, fontWeight: "800" }),
          T(`${id}-d`, { content: desc, fill: "$color.muted", fontSize: 12 }),
        ],
      },
      T(`${id}-s`, { content: stars, fill: color, fontSize: 14, fontWeight: "700" }),
    ],
  };
}

function recItem(id, name) {
  return {
    id,
    type: "frame",
    layout: "horizontal",
    padding: [10, 12],
    fill: "$color.bg",
    cornerRadius: 12,
    children: [T(`${id}-t`, { content: name, fill: "$color.ink", fontSize: 14, fontWeight: "700" })],
  };
}

function bottomItem(id, icon, label, active) {
  return {
    id,
    type: "frame",
    width: 68,
    layout: "vertical",
    gap: 2,
    alignItems: "center",
    padding: [6, 4],
    fill: active ? "$color.brandSoft" : "#00000000",
    cornerRadius: 12,
    children: [
      Ico(`${id}-i`, icon, { fill: active ? "$color.brand" : "$color.muted", width: 20, height: 20 }),
      T(`${id}-l`, { content: label, fill: active ? "$color.brand" : "$color.muted", fontSize: 11, fontWeight: "700" }),
    ],
  };
}

function gameTile(id, emoji, title, desc) {
  return {
    id,
    type: "frame",
    width: 260,
    layout: "vertical",
    padding: 22,
    gap: 8,
    fill: "$color.card",
    stroke: "$color.line",
    strokeWidth: 1,
    cornerRadius: 24,
    children: [
      T(`${id}-e`, { content: emoji, fontSize: 32 }),
      T(`${id}-t`, { content: title, fill: "$color.ink", fontSize: 18, fontWeight: "800" }),
      T(`${id}-d`, { content: desc, fill: "$color.muted", fontSize: 13 }),
    ],
  };
}

function statCol(id, k, v) {
  return {
    id,
    type: "frame",
    layout: "vertical",
    gap: 2,
    alignItems: "center",
    children: [
      T(`${id}-k`, { content: k, fill: "$color.muted", fontSize: 11, fontWeight: "600" }),
      T(`${id}-v`, { content: v, fill: "$color.ink", fontSize: 16, fontWeight: "800" }),
    ],
  };
}

const dir = dirname(fileURLToPath(import.meta.url));
const out = join(dir, "..", "design.pen");
writeFileSync(out, JSON.stringify(document, null, 2));
console.log("wrote", out);
