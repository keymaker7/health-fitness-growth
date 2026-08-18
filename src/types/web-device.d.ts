interface BluetoothRequestDeviceFilter {
  namePrefix?: string;
  name?: string;
  services?: BluetoothServiceUUID[];
}

interface RequestDeviceOptions {
  filters?: BluetoothRequestDeviceFilter[];
  optionalServices?: BluetoothServiceUUID[];
  acceptAllDevices?: boolean;
}

type BluetoothServiceUUID = string;
type BluetoothCharacteristicUUID = string;

interface BluetoothRemoteGATTCharacteristic {
  value?: DataView;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener(type: "characteristicvaluechanged", listener: (ev: Event) => void): void;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothDevice {
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface SerialPort {
  readable?: ReadableStream<Uint8Array>;
  writable?: WritableStream<Uint8Array>;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface Serial {
  requestPort(): Promise<SerialPort>;
}

interface Navigator {
  bluetooth?: Bluetooth;
  serial?: Serial;
}
