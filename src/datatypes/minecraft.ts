import nbt, { NBT } from 'prismarine-nbt';
import zlib from 'zlib';
const UUID = await import('uuid-1345' as any);
const PartialReadError = (await import('protodef' as any)).utils.PartialReadError;

function readUUID (buffer: Buffer, offset:number) {
  if (offset + 16 > buffer.length) { throw new PartialReadError() }
  return {
    value: UUID.stringify(buffer.slice(offset, 16 + offset)),
    size: 16
  }
}

function writeUUID (value: string, buffer: Buffer, offset:number) {
  const buf = UUID.parse(value)
  buf.copy(buffer, offset)
  return offset + 16
}

function readNbt (buffer: Buffer, offset:number) {
  return nbt.proto.read(buffer, offset, 'nbt')
}

function writeNbt (value: string, buffer: Buffer, offset:number) {
  return nbt.proto.write(value, buffer, offset, 'nbt')
}

function sizeOfNbt (value: string) {
  return nbt.proto.sizeOf(value, 'nbt')
}

function readOptionalNbt (buffer: Buffer, offset:number) {
  if (offset + 1 > buffer.length) { throw new PartialReadError() }
  if (buffer.readInt8(offset) === 0) return { size: 1 }
  return nbt.proto.read(buffer, offset, 'nbt')
}

function writeOptionalNbt (value: string, buffer: Buffer, offset: number) {
  if (value === undefined) {
    buffer.writeInt8(0, offset)
    return offset + 1
  }
  return nbt.proto.write(value, buffer, offset, 'nbt')
}

function sizeOfOptionalNbt (value: string) {
  if (value === undefined) { return 1 }
  return nbt.proto.sizeOf(value, 'nbt')
}

// Length-prefixed compressed NBT, see differences: http://wiki.vg/index.php?title=Slot_Data&diff=6056&oldid=4753
function readCompressedNbt (buffer: Buffer, offset:number) {
  if (offset + 2 > buffer.length) { throw new PartialReadError() }
  const length = buffer.readInt16BE(offset)
  if (length === -1) return { size: 2 }
  if (offset + 2 + length > buffer.length) { throw new PartialReadError() }

  const compressedNbt = buffer.slice(offset + 2, offset + 2 + length)

  const nbtBuffer = zlib.gunzipSync(compressedNbt) // TODO: async

  const results = nbt.proto.read(nbtBuffer, 0, 'nbt')
  return {
    size: length + 2,
    value: results.value
  }
}

function writeCompressedNbt (value: string, buffer:Buffer, offset:number) {
  if (value === undefined) {
    buffer.writeInt16BE(-1, offset)
    return offset + 2
  }
  const nbtBuffer = Buffer.alloc(sizeOfNbt(value))
  nbt.proto.write(value, nbtBuffer, 0, 'nbt')

  const compressedNbt = zlib.gzipSync(nbtBuffer) // TODO: async
  compressedNbt.writeUInt8(0, 9) // clear the OS field to match MC

  buffer.writeInt16BE(compressedNbt.length, offset)
  compressedNbt.copy(buffer, offset + 2)
  return offset + 2 + compressedNbt.length
}

function sizeOfCompressedNbt (value: any) {
  if (value === undefined) { return 2 }

  const nbtBuffer = Buffer.alloc(sizeOfNbt(value))
  nbt.proto.write(value, nbtBuffer, 0, 'nbt')

  const compressedNbt = zlib.gzipSync(nbtBuffer) // TODO: async

  return 2 + compressedNbt.length
}

function readRestBuffer (buffer: Buffer, offset:number) {
  return {
    value: buffer.slice(offset),
    size: buffer.length - offset
  }
}

function writeRestBuffer (value:Buffer, buffer:Buffer, offset:number) {
  value.copy(buffer, offset)
  return offset + value.length
}

function sizeOfRestBuffer (value:string) {
  return value.length
}

function readEntityMetadata (this:any,buffer:Buffer, offset: number, { type, endVal }:any) {
  let cursor = offset
  const metadata = []
  let item
  while (true) {
    if (offset + 1 > buffer.length) { throw new PartialReadError() }
    item = buffer.readUInt8(cursor)
    if (item === endVal) {
      return {
        value: metadata,
        size: cursor + 1 - offset
      }
    }
    const results = this.read(buffer, cursor, type, {})
    metadata.push(results.value)
    cursor += results.size
  }
}

function writeEntityMetadata (this:any,value: any[], buffer:Buffer, offset: number, { type, endVal }:any) {//! replace later
  const self = this
  value.forEach(function (item: any) { //! replace later
    offset = self.write(item, buffer, offset, type, {})
  })
  buffer.writeUInt8(endVal, offset)
  return offset + 1
}

function sizeOfEntityMetadata (this:any,value:any[], { type }:any) { //! replace later
  let size = 1
  for (let i = 0; i < value.length; ++i) {
    size += this.sizeOf(value[i], type, {})
  }
  return size
}

function readTopBitSetTerminatedArray (this:any,buffer: Buffer, offset:number, { type }:any) {
  let cursor = offset
  const values = []
  let item
  while (true) {
    if (offset + 1 > buffer.length) { throw new PartialReadError() }
    item = buffer.readUInt8(cursor)
    buffer[cursor] = buffer[cursor] & 127 // removes top bit
    const results = this.read(buffer, cursor, type, {})
    values.push(results.value)
    cursor += results.size
    if ((item & 128) === 0) { // check if top bit is set, if not last value
      return {
        value: values,
        size: cursor - offset
      }
    }
  }
}

function writeTopBitSetTerminatedArray (this:any,value:any[], buffer:Buffer, offset:number, { type }:any) {
  const self = this
  let prevOffset = offset
  value.forEach(function (item, i) {
    prevOffset = offset
    offset = self.write(item, buffer, offset, type, {})
    buffer[prevOffset] = i !== value.length - 1 ? (buffer[prevOffset] | 128) : buffer[prevOffset] // set top bit for all values but last
  })
  return offset
}

function sizeOfTopBitSetTerminatedArray (this:any,value:string[], { type }:any) {
  let size = 0
  for (let i = 0; i < value.length; ++i) {
    size += this.sizeOf(value[i], type, {})
  }
  return size
}

export default {
  UUID: [readUUID, writeUUID, 16],
  nbt: [readNbt, writeNbt, sizeOfNbt],
  optionalNbt: [readOptionalNbt, writeOptionalNbt, sizeOfOptionalNbt],
  compressedNbt: [readCompressedNbt, writeCompressedNbt, sizeOfCompressedNbt],
  restBuffer: [readRestBuffer, writeRestBuffer, sizeOfRestBuffer],
  entityMetadataLoop: [readEntityMetadata, writeEntityMetadata, sizeOfEntityMetadata],
  topBitSetTerminatedArray: [readTopBitSetTerminatedArray, writeTopBitSetTerminatedArray, sizeOfTopBitSetTerminatedArray]
}