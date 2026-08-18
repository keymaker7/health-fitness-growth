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

### 옮겨지지 않는 것

학생 기록은 브라우저 IndexedDB에 저장되므로 **컴퓨터를 바꾸면 따라오지 않습니다.** 코드와 무관한, 그 기기 안의 데이터입니다.
지금은 내보내기 기능이 없어서 옮기려면 다음 중 하나가 필요합니다.

- 새 컴퓨터에서 처음부터 기록을 다시 쌓는다 (초기 시드 데이터는 자동으로 들어갑니다)
- CSV 내보내기·가져오기를 먼저 만든다 ([진행 계획](docs/plan.md) 3단계)

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

## 라이선스 안내

- MediaPipe Pose Landmarker: Apache 2.0 (Google)
- 다인원 ID 유지: ByteTrack(Zhang et al., ECCV 2022, MIT)의 연관 아이디어를 참고한 독립 IoU 추적 구현
