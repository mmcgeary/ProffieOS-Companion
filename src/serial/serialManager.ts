export class SerialManager {
  private port: any | null = null;
  private reader: any | null = null;
  private writer: any | null = null;
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private onLineReceived: ((line: string) => void) | null = null;

  async connect() {
    if (!('serial' in navigator)) {
      throw new Error('WebSerial not supported in this browser. Use Chrome or Edge.');
    }

    if (this.port) {
      try {
        await this.disconnect();
      } catch (e) {
        console.warn('Error during pre-connect cleanup:', e);
      }
    }

    // @ts-ignore
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: 115200 });

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

  async readConfig(): Promise<string> {
    if (!this.writer) throw new Error('Not connected');
    console.log('[Serial] Requesting config read...');

    return new Promise(async (resolve, reject) => {
      let configBuffer = '';
      let capturing = false;

      const timeout = setTimeout(() => {
        this.onLineReceived = null;
        console.error('[Serial] Read timeout reached after 10s');
        reject(new Error('Read timeout'));
      }, 10000);

      this.onLineReceived = (line) => {
        console.log('[Serial] line:', line);
        if (line.includes('---BEGIN_INI---')) {
          capturing = true;
          console.log('[Serial] Handshake: BEGIN_INI found');
          return;
        }
        if (line.includes('---END_INI---')) {
          this.onLineReceived = null;
          clearTimeout(timeout);
          console.log('[Serial] Handshake: END_INI found');
          resolve(configBuffer.trim());
          return;
        }
        if (capturing) {
          configBuffer += line + '\n';
        }
      };

      await this.writer.write(this.encoder.encode('READ_INI\n'));
    });
  }

  async writeConfig(content: string): Promise<boolean> {
    if (!this.writer) throw new Error('Not connected');
    
    return new Promise(async (resolve) => {
      const timeout = setTimeout(() => {
        this.onLineReceived = null;
        resolve(false);
      }, 15000);

      this.onLineReceived = async (line) => {
        if (line.includes('READY_FOR_INI')) {
          console.log('Board READY, streaming...');
          const lines = content.split('\n');
          for (const l of lines) {
            if (!l.trim()) continue;
            await this.writer.write(this.encoder.encode(l.trim() + '\n'));
            await new Promise(r => setTimeout(r, 50));
          }
          await this.writer.write(this.encoder.encode('---END_INI---\n'));
          return;
        }
        
        if (line.includes('SAVE_OK')) {
          this.onLineReceived = null;
          clearTimeout(timeout);
          resolve(true);
        }

        if (line.toLowerCase().includes('error') || line.includes('SAVE_FAIL')) {
          this.onLineReceived = null;
          clearTimeout(timeout);
          resolve(false);
        }
      };

      await this.writer.write(this.encoder.encode('WRITE_INI\n'));
    });
  }
}

export const serialManager = new SerialManager();
