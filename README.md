# 건강체력 성장일지

초등학생이 **측정 → 이해 → 추천 → 운동 → 기록 → 성찰 → 성장** 순환으로 건강체력과 운동체력을 키우는 웹앱입니다.

> 측정하는 체육에서 성장하는 체육으로  
> 체력의 변화뿐 아니라 운동으로 달라지는 나의 마음까지 기록합니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 을 엽니다. 태블릿·크롬북·PC에서 반응형으로 동작합니다.

## 다른 컴퓨터에서 이어서 작업하기

코드는 전부 GitHub에 있습니다. 폴더를 통째로 복사하지 말고 새로 내려받는 편이 깨끗합니다.

```bash
git clone https://github.com/keymaker7/health-fitness-growth.git
cd health-fitness-growth
npm install
npm run dev
```

필요한 것은 Node.js 20 이상과 git뿐입니다. `node_modules`, `.next`, `.vercel`은 `npm install`과 첫 빌드로 다시 만들어지므로 옮기지 않습니다.
`.env` 파일은 이 프로젝트에 없습니다. 배포용 `NEXT_PUBLIC_SITE_URL`은 Vercel 프로젝트 설정에만 있고 로컬 개발에는 필요하지 않습니다.

배포까지 새 컴퓨터에서 하려면 한 번만 연결해 둡니다.

```bash
npm i -g vercel
vercel login
vercel link          # 기존 health-fitness-growth 프로젝트 선택
```

이후에는 `git push`만 하면 Vercel이 자동으로 배포합니다.

### 기록도 함께 옮기기

학생 기록은 브라우저 IndexedDB에 있어 코드와 함께 따라오지 않습니다. 옮기려면 **설정** 화면을 씁니다.

1. 원래 컴퓨터에서 `설정 → 데이터 옮기기 → 전체 백업 저장`으로 JSON 파일을 받습니다.
2. 새 컴퓨터에서 앱을 연 뒤 `설정 → 백업 파일로 복원`에서 그 파일을 고릅니다.

복원은 그 기기의 기존 기록을 지우고 백업 내용으로 바꿉니다. 같은 화면에서 운동 기록과 PAPS 측정을 Excel용 CSV로도 내려받을 수 있습니다.

## 디자인 (pen.dev)

프론트 UI는 [pen.dev](https://docs.pencil.dev/) `.pen` 파일을 소스로 맞춰 두었습니다.

1. Cursor 확장 `highagency.pencildev`가 설치되어 있습니다.
2. 프로젝트 루트의 `design.pen`을 열면 홈(데스크톱/모바일), 게임, 줄넘기 화면과 버튼·카드 컴포넌트가 캔버스에 나타납니다.
3. 토큰(`color.brand`, `radius.card` 등)은 `src/app/globals.css`와 1:1입니다.
4. 디자인을 코드에서 다시 뽑으려면 `node scripts/build-pen.mjs` 를 실행합니다.

## 데이터

- PAPS 종목/측정방법: `src/data/paps-events.json` (학교건강검사규칙·PAPS 운영 매뉴얼 기준. 불확실한 내용은 넣지 않음)
- 운동/영상: `src/data/exercises.json`, `src/data/videos.json` (`youtubeId`만 넣으면 영상이 연결됩니다)
- 기록은 **이 기기 IndexedDB**에만 저장됩니다. 카메라 원본은 서버로 보내지 않습니다.

## Micro:bit 줄넘기

1. MakeCode에서 Bluetooth UART로 `JUMP`를 보내도록 프로그램을 넣습니다. 예시 코드는 앱의 줄넘기 화면에 있습니다.
2. Chrome에서 **Micro:bit 연결** 또는 **시뮬레이션 시작**으로 테스트합니다.

## Microsoft Reflect

Reflect UI를 복제하지 않습니다. 공식 웹앱 [reflect.microsoft.com](https://reflect.microsoft.com/) 으로 이동합니다.  
교사가 만든 체크인 공유 링크는 **설정**에 붙여 넣을 수 있습니다. 임의의 iframe 삽입은 공식 지원 범위가 아닙니다.

## Microsoft 에이전트 & 워크플로 구축

Copilot Studio 에이전트 4개와 Power Automate 워크플로 2개를 하루에 세웁니다. 자세한 지침은 `docs/agents/collect-flow.md`에 있습니다.

### 하루 시간표

| 시간 | 할 일 | 결과 |
| --- | --- | --- |
| 09:00 | 권한 점검, SharePoint에 문서 업로드 | 지식 원본 준비 |
| 09:30 | `기록` 목록 만들기 | 데이터 그릇 |
| 10:00 | 취합 흐름 P1 | 앱 → SharePoint 연결 |
| 11:00 | 부모 에이전트 + 측정 안내 자식 | 쓸 수 있는 에이전트 |
| 13:00 | 학급요약조회 F1 + 학급 현황 자식 | 에이전트가 데이터를 읽음 |
| 14:00 | 처방 해설 자식 | |
| 15:00 | 건강체력교실 연결 에이전트 | |
| 15:30 | 주간 카드 P2 | 예약 흐름 확보 |
| 16:00 | 점검과 게시 | |

밀리면 15:00과 15:30을 버리세요. 11시까지만 되어도 그날부터 쓸 물건은 나옵니다.

### 하루를 날려먹을 수 있는 세 가지

아침에 5분만 확인하세요. 여기서 막히면 나머지가 전부 멈춥니다.

1. **Copilot Studio 권한** — 새 에이전트를 만들 수 있는가
2. **Power Automate 커넥터** — SharePoint 커넥터가 붙는가
3. **SharePoint 권한** — 팀 사이트에 문서 라이브러리를 만들 수 있는가

그리고 **문서는 반드시 아침 제일 먼저 업로드하세요.** SharePoint 색인이 도는 데 시간이 걸려서, 점심때 올리면 오후에 에이전트가 문서를 못 찾습니다.

### 미리 준비된 것

- `docs/agents/collect-flow.md` — 시간표와 복붙용 지침 문구
- `docs/agents/prescription-rules.md` — 처방 해설 에이전트가 읽을 지식 문서 (SharePoint에 그대로 업로드)
- `docs/agents/paps-guide.md` — 측정 안내 에이전트 설계서
- `docs/agents/README.md` — 전체 구조 설명

### 기록 업로드

앱 **설정 → 업로드용 JSON**으로 받은 파일을 SharePoint `기록업로드` 라이브러리에 올리면 Power Automate가 자동으로 `기록` 목록에 넣습니다. 중복은 고유 값 제약으로 걸러집니다.

## 라이선스 안내

- MediaPipe Pose Landmarker: Apache 2.0 (Google)
- 다인원 ID 유지: ByteTrack(Zhang et al., ECCV 2022, MIT)의 연관 아이디어를 참고한 독립 IoU 추적 구현
