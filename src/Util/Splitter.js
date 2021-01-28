const { types: { varint: [readVarInt, writeVarInt, sizeOfVarInt] } } = require('protodef');
const { Transform } = require('readable-stream');
const LEGACY_PING_PACKET_ID = 0xfe;

class Splitter extends Transform {

	constructor(recognizeLegacyPing) {
		super();
		this.buffer = Buffer.alloc(0);
		this.recognizeLegacyPing = recognizeLegacyPing || false;
	}

	_transform(chunk, encoding, callback) {
		this.buffer = Buffer.concat([this.buffer, chunk]);

		if (this.recognizeLegacyPing && this.buffer[0] === LEGACY_PING_PACKET_ID) {
			// legacy_server_list_ping packet follows a different protocol format
			// prefix the encoded varint packet id for the deserializer
			const header = Buffer.alloc(sizeOfVarInt(LEGACY_PING_PACKET_ID));
			writeVarInt(LEGACY_PING_PACKET_ID, header, 0);
			// remove 0xfe packet id
			let payload = this.buffer.slice(1);
			// minecraft-data doesn't understand 0xFE and probably wont since the issues been open since 2016.
			if (payload.length === 0) payload = Buffer.from('\0');
			this.push(Buffer.concat([header, payload]));
			return callback();
		}

		let offset = 0;
		let value, size;
		let stop = false;
		try {
			({ value, size } = readVarInt(this.buffer, offset));
		} catch (error) {
			if (!error.partialReadError) throw error;
			else stop = true;
		}
		if (!stop) {
			while (this.buffer.length >= offset + size + value) {
				try {
					this.push(this.buffer.slice(offset + size, offset + size + value));
					offset += size + value;
					({ value, size } = readVarInt(this.buffer, offset));
				} catch (error) {
					if (error.partialReadError) break;
					else throw error;
				}
			}
		}
		this.buffer = this.buffer.slice(offset);
		return callback();
	}

}

module.exports = Splitter;
