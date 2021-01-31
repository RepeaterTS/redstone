import { Client } from 'mcproto'

export interface ClientOptions {
  host?: string
  port?: number
  accessToken?: string
  profile?: string
  /** @default 120000 ms */
  timeout?: number
  /** @default 10000 ms */
  connectTimeout?: number
}

const defaultOptions: Partial<ClientOptions> = {
  connectTimeout: 10000,
  timeout: 120000
}

export class RedstoneClient extends Client {
  public constructor(options: ClientOptions = {}) {
    super(options);

  }

  /**
   * Connects to the remote server.
   * @param {string} [host] Hostname of the server you want to connect to.
   * @param {number} [port] Port of the server you want to connect to.
   */
  async connect(host?: string, port?: number | null) {

    const connection = await super.connect(host, port)

    return connection;
  }
}