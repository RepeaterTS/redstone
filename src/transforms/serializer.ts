import states from '../states.js';
export const { ProtoDef, Serializer, FullPacketParser, Compiler } = await import('protodef' as any);

const protocols: { [key: string]: any } = {};

export async function createProtocol(state: string, direction: 'toClient' | 'toServer', version: string | number, customPackets: any[], compiled = true) {
  const key = `${state};${direction};${version}${compiled ? ';c' : ''}`;
  if (protocols[key]) return protocols[key];
  const mcdata = (await import('minecraft-data')).default(version);
  if (compiled) {
    const compiler = new Compiler();
    compiler.addTypes(await import('../datatypes/compiler-minecraft.js'));
  }
}



export function createSerializer ({ state = states.HANDSHAKING, isServer = false, version = '1.12.2', customPackets= [], compiled = true } = {}) {
  return new Serializer(createProtocol(state, !isServer ? 'toServer' : 'toClient', version, customPackets, compiled), 'packet')
}