import { EventEmitter } from 'events';
import mcdata, { IndexedData } from 'minecraft-data';
import { Framer, Splitter } from './transforms/framing';
import states from './states.js';
import * as net from 'net';
import { promises as dns } from 'dns';
import { createProtocol, Serializer, FullPacketParser } from './transforms/serializer';

export interface ClientOptions {
  version?: string | number | false;
  host?: string;
  port?: number;
  username: string;
  password?: string;
  captureRejections?: boolean;
  hideErrors?: boolean;
  isServer?: boolean;
  connect?: boolean | Function;
  stream?: any; //TODO add type
  majorVersion?: string;
  protocolVersion?: number;
  closeTimeout?: number;
  noPongTimeout?: number;
}

export class Client extends EventEmitter {
  mcdata: IndexedData;
  version: string;
  isServer: boolean;
  splitter = new Splitter();
  framer = new Framer();
  cipher = null;
  decipher = null;
  decompressor = null;
  ended = true;
  latency = 0;
  hideErrors: boolean;
  closeTimer = null;
  state = states.HANDSHAKING;
  serializer?: Object;
  private wait_connect?: boolean;
  constructor(private options: ClientOptions) {
    super({ captureRejections: options.captureRejections });
    this.hideErrors = options.hideErrors ?? false;
    this.isServer = options.isServer ?? false;
    this.options.port = options.port ?? 25565;
    this.options.host = options.host ?? 'localhost';
    this.mcdata = mcdata(options.version ? options.version : options.version === false ? this.getServerVersion() : '1.12.2');
    this.version = options.version ?? (undefined as any);
    
    this.tcp_dns();
  }
  async autoVersion() {
    this.wait_connect = true;
  }
  tcp_dns() {
    if (!this.options.connect) {
      this.options.connect = async () => {
        if (this.options.stream) {
          this.setSocket(this.options.stream);
          this.emit('connect');
          return;
        }
        if (this.options.port === 25565 && net.isIP(this.options.host as string) === 0 && this.options.host !== 'localhost') {
          try {
            const addresses = await dns.resolveSrv(`_minecraft._tcp.${this.options.host}`);
            if (!addresses || !(addresses.length > 0)) throw '';
            this.options.host = addresses[0].name;
            this.options.port = addresses[0].port;
          } finally {
            this.setSocket(net.connect(this.options.port, this.options.host));
          }
        }
      };
    }
  }
  getServerVersion() {
    this.wait_connect = true;
  }
  async setSerializer(state: string) {
    this.serializer = new Serializer(createProtocol(state, this.isServer ? 'toServer' : 'toClient', this.version, []));
  }
  async setSocket(stream: any) {} //todo type
}
function ping(client: Client){

}