import { Client } from 'mcproto'

export interface ClientOptions {
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
}