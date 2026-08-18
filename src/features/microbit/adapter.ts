export type JumpEvent = { at: number; source: string };

export interface JumpRopeTransport {
  id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(listener: (event: JumpEvent) => void): () => void;
}

export interface MicrobitAdapter {
  bluetooth: JumpRopeTransport;
  serial: JumpRopeTransport;
  simulation: JumpRopeTransport & { setPace(rpm: number): void; tap(): void };
}

const UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const ACCEL_SERVICE = "e95d0753-251d-470a-a062-fa1922dfa9a8";
const ACCEL_DATA = "e95dca4b-251d-470a-a062-fa1922dfa9a8";

function makeListeners() {
  const set = new Set<(e: JumpEvent) => void>();
  return {
    emit(e: JumpEvent) {
      set.forEach((fn) => fn(e));
    },
    subscribe(fn: (e: JumpEvent) => void) {
      set.add(fn);
      return () => set.delete(fn);
    },
  };
}

class PeakDetector {
  last = 0;
  lastMag = 0;
  rising = false;
  constructor(private threshold = 1.8, private refractory = 280) {}
  push(mag: number, at = Date.now()) {
    const jumped = this.rising && mag < this.lastMag && this.lastMag > this.threshold && at - this.last > this.refractory;
    this.rising = mag >= this.lastMag;
    this.lastMag = mag;
    if (jumped) {
      this.last = at;
      return true;
    }
    return false;
  }
}

function parseUartChunk(text: string, onJump: () => void, onAcc?: (x: number, y: number, z: number) => void) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t === "JUMP" || t === "J") onJump();
    const m = t.match(/ACC:(-?\d+),(-?\d+),(-?\d+)/i);
    if (m && onAcc) onAcc(Number(m[1]), Number(m[2]), Number(m[3]));
  }
}

export function createMicrobitAdapter(): MicrobitAdapter {
  const bt = makeListeners();
  const serialL = makeListeners();
  const sim = makeListeners();
  const peak = new PeakDetector();
  let device: BluetoothDevice | undefined;
  let server: BluetoothRemoteGATTServer | undefined;
  let port: SerialPort | undefined;
  let simTimer: number | undefined;
  let simRpm = 70;
  let decoderBuf = "";

  const bluetooth: JumpRopeTransport = {
    id: "microbit-bluetooth",
    async connect() {
      if (!navigator.bluetooth) throw new Error("이 브라우저는 Web Bluetooth를 지원하지 않아요. Chrome을 사용해 주세요.");
      device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "BBC micro:bit" }, { namePrefix: "micro:bit" }],
        optionalServices: [UART_SERVICE, ACCEL_SERVICE],
      });
      server = await device.gatt?.connect();
      if (!server) throw new Error("micro:bit GATT 연결에 실패했어요.");
      try {
        const uart = await server.getPrimaryService(UART_SERVICE);
        const tx = await uart.getCharacteristic(UART_TX);
        await tx.startNotifications();
        tx.addEventListener("characteristicvaluechanged", (ev) => {
          const v = (ev.target as unknown as BluetoothRemoteGATTCharacteristic).value;
          if (!v) return;
          const text = new TextDecoder().decode(v);
          parseUartChunk(text, () => bt.emit({ at: Date.now(), source: "uart" }), (x, y, z) => {
            const mag = Math.sqrt(x * x + y * y + z * z) / 1000;
            if (peak.push(mag)) bt.emit({ at: Date.now(), source: "uart-acc" });
          });
        });
        return;
      } catch {
        const accel = await server.getPrimaryService(ACCEL_SERVICE);
        const data = await accel.getCharacteristic(ACCEL_DATA);
        await data.startNotifications();
        data.addEventListener("characteristicvaluechanged", (ev) => {
          const v = (ev.target as unknown as BluetoothRemoteGATTCharacteristic).value;
          if (!v || v.byteLength < 6) return;
          const x = v.getInt16(0, true);
          const y = v.getInt16(2, true);
          const z = v.getInt16(4, true);
          const mag = Math.sqrt(x * x + y * y + z * z) / 1024;
          if (peak.push(mag)) bt.emit({ at: Date.now(), source: "accel" });
        });
      }
    },
    async disconnect() {
      server?.disconnect();
      server = undefined;
      device = undefined;
    },
    subscribe: bt.subscribe,
  };

  const serial: JumpRopeTransport = {
    id: "microbit-serial",
    async connect() {
      if (!navigator.serial) throw new Error("이 브라우저는 Web Serial을 지원하지 않아요.");
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      const reader = port.readable?.getReader();
      if (!reader) throw new Error("시리얼 포트를 읽을 수 없어요.");
      (async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            decoderBuf += new TextDecoder().decode(value);
            const parts = decoderBuf.split(/\r?\n/);
            decoderBuf = parts.pop() ?? "";
            for (const line of parts) {
              parseUartChunk(line, () => serialL.emit({ at: Date.now(), source: "serial" }));
            }
          }
        } catch {
          /* disconnected */
        }
      })();
    },
    async disconnect() {
      await port?.close();
      port = undefined;
    },
    subscribe: serialL.subscribe,
  };

  const simulation: JumpRopeTransport & { setPace(rpm: number): void; tap(): void } = {
    id: "simulation",
    async connect() {
      if (simTimer) window.clearInterval(simTimer);
      const tick = () => {
        const interval = Math.max(280, 60000 / simRpm);
        if (simTimer) window.clearInterval(simTimer);
        simTimer = window.setInterval(() => sim.emit({ at: Date.now(), source: "simulation" }), interval);
      };
      tick();
    },
    async disconnect() {
      if (simTimer) window.clearInterval(simTimer);
      simTimer = undefined;
    },
    subscribe: sim.subscribe,
    setPace(rpm: number) {
      simRpm = Math.min(140, Math.max(40, rpm));
      if (simTimer) void simulation.connect();
    },
    tap() {
      sim.emit({ at: Date.now(), source: "manual-tap" });
    },
  };

  return { bluetooth, serial, simulation };
}

export const MICROBIT_MAKECODE = `bluetooth.startUartService()
let last = 0
basic.forever(function () {
    let a = input.acceleration(Dimension.Strength)
    if (a > 1600 && input.runningTime() - last > 280) {
        last = input.runningTime()
        bluetooth.uartWriteLine("JUMP")
        led.plotBarGraph(a, 2048)
    }
})`;
