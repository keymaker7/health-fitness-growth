/**
 * camera.js 는 측정 앱들(keymaker7/longjump-measure · squat-cam, jumprope-counter 도 같은 로직)이
 * 함께 쓰는 카메라 컨트롤러를 그대로 옮겨온 것이다. 앞↔뒤 전환의 기기별 예외 처리
 * (아이패드 2차 시도, 실패 시 원래 카메라 복구)가 모두 들어 있어 손대지 않는다.
 */

export type CameraFacing = "user" | "environment";

export interface CameraControllerOpts {
  prefKey?: string;
  onChange?: (cam: CameraController) => void;
  onSwitched?: (cam: CameraController) => void;
  onError?: (msg: string) => void;
  onStatus?: (msg: string) => void;
}

export class CameraController {
  constructor(video: HTMLVideoElement, opts?: CameraControllerOpts);
  video: HTMLVideoElement;
  stream: MediaStream | null;
  facing: CameraFacing;
  mirror: boolean;
  userMirror: boolean | null;
  cameras: MediaDeviceInfo[];
  currentDeviceId: string | null;
  busy: boolean;
  start(): Promise<boolean>;
  switchNext(): Promise<boolean>;
  select(deviceId: string): Promise<boolean>;
  setMirror(v: boolean): void;
  refresh(): Promise<MediaDeviceInfo[]>;
  watchDeviceChange(): void;
  readonly facingKo: string;
  readonly otherKo: string;
}
