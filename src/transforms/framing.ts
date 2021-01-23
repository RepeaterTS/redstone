import { Transform } from 'readable-stream';
const [readVarInt, writeVarInt, sizeOfVarInt] = (await import('protodef' as any)).types.varint;
const LEGACY_PING_PACKET_ID = 0xfe;

export class Framer extends Transform {
  async _transform(chunk: Buffer) {
    //! unsure about types
    const varIntSize = sizeOfVarInt(chunk.length);
    const buffer = Buffer.alloc(varIntSize + chunk.length);
    writeVarInt(chunk.length, buffer, 0);
    chunk.copy(buffer, varIntSize);
    this.push(buffer);
  }
}

export class Splitter extends Transform {
  buffer: Buffer = Buffer.alloc(0);
  recognizeLegacyPing: boolean = false;
  async _transform(chunk: Buffer) {
    //! unsure about types
    this.buffer = Buffer.concat([this.buffer, chunk]);

    if (this.recognizeLegacyPing && this.buffer[0] === LEGACY_PING_PACKET_ID) {
      // legacy_server_list_ping packet follows a different protocol format
      // prefix the encoded varint packet id for the deserializer
      const header = Buffer.alloc(sizeOfVarInt(LEGACY_PING_PACKET_ID));
      writeVarInt(LEGACY_PING_PACKET_ID, header, 0);
      let payload = this.buffer.slice(1); // remove 0xfe packet id
      if (payload.length === 0) payload = Buffer.from('\0'); // /TODO: update minecraft-data to recognize a lone 0xfe, https://github.com/PrismarineJS/minecraft-data/issues/95
      this.push(Buffer.concat([header, payload]));
      return;
    }

    let offset = 0,
      value,
      size,
      stop = false;
    try {
      ({ value, size } = readVarInt(this.buffer, offset));
    } catch (e) {
      if (e.partialReadError) throw e;
      else stop = true;
    }
    if (!stop)
      while (this.buffer.length >= offset + size + value) {
        try {
          this.push(this.buffer.slice(offset + size, offset + size + value));
          offset += size + value;
          ({ value, size } = readVarInt(this.buffer, offset));
        } catch (e) {
          if (e.partialReadError) break;
          else throw e;
        }
      }
    this.buffer = this.buffer.slice(offset);
    return;
  }
}
