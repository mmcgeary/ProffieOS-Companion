import { parseMediaListing } from '../config/mediaCatalog';

interface SerialPortLike {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface NavigatorWithSerial extends Navigator {
  serial: {
    requestPort(): Promise<SerialPortLike>;
    getPorts?(): Promise<SerialPortLike[]>;
  };
}

const hasSerialSupport = (navigatorObj: Navigator): navigatorObj is NavigatorWithSerial => {
  return 'serial' in navigatorObj && typeof (navigatorObj as NavigatorWithSerial).serial.requestPort === 'function';
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const RECONNECT_TIMEOUT_MS = 15000;
const RECONNECT_RETRY_DELAY_MS = 250;

const HW_PROFILE_NUM_BLADE_KEYS = new Set(['num_blades', 'numblades']);
const HW_PROFILE_NUM_BUTTON_KEYS = new Set(['num_buttons', 'numbuttons']);
const HW_PROFILE_BLADE_DETECT_STATE_KEYS = new Set(['blade_detect']);
const HW_PROFILE_BLADE_DETECT_CAPABILITY_KEYS = new Set(['has_blade_detect', 'hasbladedetect']);
const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSY_VALUES = new Set(['0', 'false', 'no', 'off']);

const parsePositiveInteger = (value: string): number | null => {
  const normalized = value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }
  return Number.parseInt(normalized, 10);
};

const parseBoolean = (value: string): boolean | null => {
  const normalized = value.trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) {
    return true;
  }
  if (FALSY_VALUES.has(normalized)) {
    return false;
  }
  return null;
};

interface ParsedHardwareProfile extends HardwareProfile {
  matchedProfileToken: boolean;
}

const parseHardwareProfile = (lines: string[]): ParsedHardwareProfile => {
  let numBlades: number | null = null;
  let numButtons: number | null = null;
  let hasBladeDetect: boolean | null = null;
  let matchedProfileToken = false;
  const bladeLengths: number[] = [];

  lines.forEach((line) => {
    const normalizedLine = line
      .trim()
      .replace(/^hw_profile[:\s-]*/i, '')
      .replace(/,/g, ' ')
      .replace(/:/g, '=');

    if (!normalizedLine) {
      return;
    }

    normalizedLine
      .split(/\s+/)
      .filter((token) => token.includes('='))
      .forEach((token) => {
        const [rawKey, ...rawValueParts] = token.split('=');
        if (!rawKey || rawValueParts.length === 0) {
          return;
        }

        const key = rawKey.trim().toLowerCase();
        const value = rawValueParts.join('=').trim();

        if (!value) {
          return;
        }

        if (HW_PROFILE_NUM_BLADE_KEYS.has(key)) {
          matchedProfileToken = true;
          const parsed = parsePositiveInteger(value);
          if (parsed !== null) numBlades = parsed;
          return;
        }

        if (HW_PROFILE_NUM_BUTTON_KEYS.has(key)) {
          matchedProfileToken = true;
          const parsed = parsePositiveInteger(value);
          if (parsed !== null) numButtons = parsed;
          return;
        }

        if (HW_PROFILE_BLADE_DETECT_STATE_KEYS.has(key)) {
          matchedProfileToken = true;
          hasBladeDetect = true;
          return;
        }

        if (HW_PROFILE_BLADE_DETECT_CAPABILITY_KEYS.has(key)) {
          matchedProfileToken = true;
          const parsed = parseBoolean(value);
          if (parsed !== null) {
            hasBladeDetect = parsed;
          }
          return;
        }

        if (key.startsWith('blade') && key.endsWith('_length')) {
          matchedProfileToken = true;
          const bladeNum = parseInt(key.slice(5, -7), 10);
          if (!isNaN(bladeNum) && bladeNum >= 1) {
            const parsed = parsePositiveInteger(value);
            if (parsed !== null) {
              bladeLengths[bladeNum - 1] = parsed;
            }
          }
          return;
        }
      });
  });

  return {
    numBlades: numBlades ?? 1,
    numButtons: numButtons ?? 1,
    hasBladeDetect: hasBladeDetect ?? undefined,
    bladeLengths,
    matchedProfileToken,
  };
};

export interface HardwareProfile {
  numBlades: number;
  numButtons: number;
  hasBladeDetect?: boolean;
  bladeLengths?: number[];
}

export class SerialManager {
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private readonly baudRate = 115200;
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private onLineReceived: ((line: string) => void) | null = null;

  async connect() {
    if (!hasSerialSupport(navigator)) {
      throw new Error('WebSerial not supported in this browser. Use Chrome or Edge.');
    }

    if (this.port) {
      try {
        await this.disconnect();
      } catch (e) {
        console.warn('Error during pre-connect cleanup:', e);
      }
    }

    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: this.baudRate });

    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
    console.log('Connected to Proffieboard');
    
    // Start background reader loop for logging
    this.startReading();
  }

  private async startReading() {
    if (!this.reader) return;
    
    const { addLog } = (await import('../state/configStore')).useConfigStore.getState();
    let buffer = '';

    try {
      while (this.port) {
        const { value, done } = await this.reader.read();
        if (done) break;
        
        const text = this.decoder.decode(value);
        buffer += text;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed) {
            addLog(trimmed);
            // Dispatch to active listeners (like config read/write)
            if (this.onLineReceived) this.onLineReceived(trimmed);
          }
        });
      }
    } catch (e) {
      console.warn('Log reader stopped:', e);
    }
  }

  private async cleanupReader() {
    if (!this.reader) return;

    const reader = this.reader;
    this.reader = null;

    try {
      await reader.cancel();
    } catch (error: unknown) {
      console.warn('Reader cancel failed during serial cleanup:', error);
    }

    try {
      reader.releaseLock();
    } catch (error: unknown) {
      console.warn('Reader release failed during serial cleanup:', error);
    }
  }

  private async cleanupWriter() {
    if (!this.writer) return;

    const writer = this.writer;
    this.writer = null;

    try {
      await writer.abort();
    } catch (error: unknown) {
      console.warn('Writer abort failed during serial cleanup:', error);
    }

    try {
      writer.releaseLock();
    } catch (error: unknown) {
      console.warn('Writer release failed during serial cleanup:', error);
    }
  }

  private async closePortQuietly(port: SerialPortLike) {
    try {
      await port.close();
    } catch (error: unknown) {
      console.warn('Port close failed during serial cleanup:', error);
    }
  }

  async disconnect() {
    const port = this.port;
    this.onLineReceived = null;
    await this.cleanupReader();
    await this.cleanupWriter();
    if (port) await this.closePortQuietly(port);
    this.port = null;
  }

  async reconnectAfterReset() {
    const port = this.port;
    if (!port) {
      throw new Error('No previously selected serial port to reconnect');
    }

    this.onLineReceived = null;
    await this.cleanupReader();
    await this.cleanupWriter();
    await this.closePortQuietly(port);

    const reconnectPorts = [port];
    const knownPorts = new Set<SerialPortLike>(reconnectPorts);
    const refreshAuthorizedPorts = async () => {
      if (!hasSerialSupport(navigator) || typeof navigator.serial.getPorts !== 'function') {
        return;
      }
      try {
        const authorizedPorts = await navigator.serial.getPorts();
        for (const authorizedPort of authorizedPorts) {
          if (!knownPorts.has(authorizedPort)) {
            knownPorts.add(authorizedPort);
            reconnectPorts.push(authorizedPort);
          }
        }
      } catch (error: unknown) {
        console.warn('Failed to enumerate authorized serial ports during reconnect:', error);
      }
    };

    let lastError: unknown = null;
    const deadline = Date.now() + RECONNECT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await refreshAuthorizedPorts();
      for (const reconnectPort of reconnectPorts) {
        try {
          await reconnectPort.open({ baudRate: this.baudRate });
          this.port = reconnectPort;
          this.reader = reconnectPort.readable.getReader();
          this.writer = reconnectPort.writable.getWriter();
          void this.startReading();
          return;
        } catch (error: unknown) {
          lastError = error;
        }
      }

      await sleep(RECONNECT_RETRY_DELAY_MS);
    }

    const reason = lastError instanceof Error ? lastError.message : 'unknown error';
    throw new Error(`Failed to reconnect after board reset: ${reason}`);
  }

  private getConnectedWriter(): WritableStreamDefaultWriter<Uint8Array> {
    const writer = this.writer;
    if (!writer) {
      throw new Error('Not connected');
    }
    return writer;
  }

  private async readIniCommand(command: string): Promise<string> {
    const writer = this.getConnectedWriter();
    return new Promise((resolve, reject) => {
      let configBuffer = '';
      let capturing = false;
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const clearState = () => {
        this.onLineReceived = null;
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
      };

      const finishResolve = (config: string) => {
        if (settled) return;
        settled = true;
        clearState();
        resolve(config);
      };

      const finishReject = (error: unknown) => {
        if (settled) return;
        settled = true;
        clearState();
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      timeout = setTimeout(() => finishReject(new Error('Read timeout')), 10000);

      this.onLineReceived = (line) => {
        if (line.toLowerCase().includes('error: ini not found')) {
          finishResolve('');
          return;
        }
        if (line.includes('---BEGIN_INI---')) {
          capturing = true;
          return;
        }
        if (line.includes('---END_INI---')) {
          finishResolve(configBuffer.trim());
          return;
        }
        if (capturing) {
          configBuffer += `${line}\n`;
        }
      };

      void writer.write(this.encoder.encode(`${command}\n`)).catch(finishReject);
    });
  }

  private async writeIniCommand(command: string, content: string): Promise<boolean> {
    const writer = this.getConnectedWriter();

    const streamContent = async () => {
      const lines = content.split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        await writer.write(this.encoder.encode(`${line}\n`));
        await sleep(50);
      }
      await writer.write(this.encoder.encode('---END_INI---\n'));
    };

    return new Promise((resolve, reject) => {
      let settled = false;
      let hasStartedStreaming = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const clearState = () => {
        this.onLineReceived = null;
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
      };

      const finishResolve = (result: boolean) => {
        if (settled) return;
        settled = true;
        clearState();
        resolve(result);
      };

      const finishReject = (error: unknown) => {
        if (settled) return;
        settled = true;
        clearState();
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      timeout = setTimeout(() => {
        finishResolve(false);
      }, 15000);

      this.onLineReceived = (line) => {
        if (line.includes('READY_FOR_INI')) {
          if (hasStartedStreaming) {
            return;
          }
          hasStartedStreaming = true;
          void streamContent().catch((error: unknown) => {
            console.error('[Serial] Failed while streaming config:', error);
            finishReject(error);
          });
          return;
        }

        if (line.includes('SAVE_OK')) {
          finishResolve(true);
          return;
        }

        if (line.toLowerCase().includes('error') || line.includes('SAVE_FAIL')) {
          finishResolve(false);
        }
      };

      void writer.write(this.encoder.encode(`${command}\n`)).catch(finishReject);
    });
  }

  private async collectCommandLines(command: string): Promise<string[]> {
    const writer = this.getConnectedWriter();
    const allowsEmptyResponse =
      command === 'list_fonts' ||
      command === 'list_tracks' ||
      command.startsWith('list_tracks ') ||
      command.startsWith('get_blade_length ');

    return new Promise((resolve, reject) => {
      let settled = false;
      const lines: string[] = [];
      let idleTimeout: ReturnType<typeof setTimeout> | undefined;
      let noResponseTimeout: ReturnType<typeof setTimeout> | undefined;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let hasReceivedLine = false;

      const clearState = () => {
        this.onLineReceived = null;
        if (idleTimeout) {
          clearTimeout(idleTimeout);
          idleTimeout = undefined;
        }
        if (noResponseTimeout) {
          clearTimeout(noResponseTimeout);
          noResponseTimeout = undefined;
        }
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
      };

      const finishResolve = () => {
        if (settled) return;
        settled = true;
        clearState();
        resolve(lines);
      };

      const finishReject = (error: unknown) => {
        if (settled) return;
        settled = true;
        clearState();
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const scheduleIdleResolve = () => {
        if (idleTimeout) {
          clearTimeout(idleTimeout);
        }
        idleTimeout = setTimeout(() => finishResolve(), 200);
      };

      const scheduleNoResponseResolve = () => {
        if (!allowsEmptyResponse) {
          return;
        }
        if (settled || hasReceivedLine) {
          return;
        }
        if (noResponseTimeout) {
          clearTimeout(noResponseTimeout);
        }
        noResponseTimeout = setTimeout(() => {
          if (!hasReceivedLine) {
            finishResolve();
          }
        }, 300);
      };

      timeout = setTimeout(() => finishReject(new Error('Read timeout')), 5000);

      this.onLineReceived = (line) => {
        hasReceivedLine = true;
        if (noResponseTimeout) {
          clearTimeout(noResponseTimeout);
          noResponseTimeout = undefined;
        }
        lines.push(line);
        scheduleIdleResolve();
      };

      void writer
        .write(this.encoder.encode(`${command}\n`))
        .then(() => scheduleNoResponseResolve())
        .catch(finishReject);
    });
  }

  async readConfig(): Promise<string> {
    return this.readIniCommand('READ_INI');
  }

  async writeConfig(content: string): Promise<boolean> {
    return this.writeIniCommand('WRITE_INI', content);
  }

  async readIniBank(bank: 'blade_in' | 'blade_out'): Promise<string> {
    return this.readIniCommand(`READ_INI_BANK ${bank}`);
  }

  async writeIniBank(bank: 'blade_in' | 'blade_out', content: string): Promise<boolean> {
    return this.writeIniCommand(`WRITE_INI_BANK ${bank}`, content);
  }

  async getHardwareProfile(): Promise<HardwareProfile> {
    const lines = await this.collectCommandLines('GET_HW_PROFILE');
    const parsed = parseHardwareProfile(lines);
    if (!parsed.matchedProfileToken) {
      throw new Error('Incompatible firmware: GET_HW_PROFILE returned no profile keys');
    }

    return {
      numBlades: parsed.numBlades,
      numButtons: parsed.numButtons,
      hasBladeDetect: parsed.hasBladeDetect,
      bladeLengths: parsed.bladeLengths.length > 0 ? parsed.bladeLengths : undefined,
    };
  }

  async listFonts(): Promise<string[]> {
    const lines = await this.collectCommandLines('list_fonts');
    return parseMediaListing(lines);
  }

  async listTracks(font: string): Promise<string[]> {
    const trimmedFont = font.trim().replace(/\/+$/, '');
    const command = trimmedFont ? `list_tracks ${trimmedFont}` : 'list_tracks';
    const lines = await this.collectCommandLines(command);
    return parseMediaListing(lines);
  }

  async writeCommand(command: string): Promise<void> {
    const writer = this.getConnectedWriter();
    await writer.write(this.encoder.encode(`${command}\n`));
  }
}

export const serialManager = new SerialManager();
