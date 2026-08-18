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
