interface SerialPortLike {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface NavigatorWithSerial extends Navigator {
  serial: {
    requestPort(): Promise<SerialPortLike>;
  };
}

const hasSerialSupport = (navigatorObj: Navigator): navigatorObj is NavigatorWithSerial => {
  return 'serial' in navigatorObj && typeof (navigatorObj as NavigatorWithSerial).serial.requestPort === 'function';
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

  async disconnect() {
    if (this.reader) {
      await this.reader.cancel();
      this.reader.releaseLock();
    }
    if (this.writer) {
      this.writer.releaseLock();
    }
    if (this.port) await this.port.close();
    this.port = null;
    this.reader = null;
    this.writer = null;
  }

  async reconnectAfterReset() {
    const port = this.port;
    if (!port) {
      throw new Error('No previously selected serial port to reconnect');
    }

    this.onLineReceived = null;

    if (this.reader) {
      await this.reader.cancel();
      this.reader.releaseLock();
      this.reader = null;
    }
    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }

    await port.close();

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await sleep(attempt * 200);
        await port.open({ baudRate: this.baudRate });
        this.reader = port.readable.getReader();
        this.writer = port.writable.getWriter();
        void this.startReading();
        return;
      } catch (error: unknown) {
        lastError = error;
      }
    }

    const reason = lastError instanceof Error ? lastError.message : 'unknown error';
    throw new Error(`Failed to reconnect after board reset: ${reason}`);
  }

  async readConfig(): Promise<string> {
    const writer = this.writer;
    if (!writer) throw new Error('Not connected');
    console.log('[Serial] Requesting config read...');

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

      timeout = setTimeout(() => {
        console.error('[Serial] Read timeout reached after 10s');
        finishReject(new Error('Read timeout'));
      }, 10000);

      this.onLineReceived = (line) => {
        console.log('[Serial] line:', line);
        if (line.includes('---BEGIN_INI---')) {
          capturing = true;
          console.log('[Serial] Handshake: BEGIN_INI found');
          return;
        }
        if (line.includes('---END_INI---')) {
          console.log('[Serial] Handshake: END_INI found');
          finishResolve(configBuffer.trim());
          return;
        }
        if (capturing) {
          configBuffer += line + '\n';
        }
      };

      void writer.write(this.encoder.encode('READ_INI\n')).catch((error: unknown) => {
        console.error('[Serial] Failed to send READ_INI command:', error);
        finishReject(error);
      });
    });
  }

  async writeConfig(content: string): Promise<boolean> {
    const writer = this.writer;
    if (!writer) throw new Error('Not connected');
    
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

    return new Promise((resolve) => {
      let settled = false;
      let hasStartedStreaming = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        this.onLineReceived = null;
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
        resolve(result);
      };

      timeout = setTimeout(() => {
        finish(false);
      }, 15000);

      this.onLineReceived = (line) => {
        if (line.includes('READY_FOR_INI')) {
          if (hasStartedStreaming) {
            return;
          }
          hasStartedStreaming = true;
          console.log('Board READY, streaming...');
          void streamContent().catch((error: unknown) => {
            console.error('[Serial] Failed while streaming config:', error);
            finish(false);
          });
          return;
        }
        
        if (line.includes('SAVE_OK')) {
          finish(true);
          return;
        }

        if (line.toLowerCase().includes('error') || line.includes('SAVE_FAIL')) {
          finish(false);
        }
      };

      void writer.write(this.encoder.encode('WRITE_INI\n')).catch((error: unknown) => {
        console.error('[Serial] Failed to send WRITE_INI command:', error);
        finish(false);
      });
    });
  }
}

export const serialManager = new SerialManager();
