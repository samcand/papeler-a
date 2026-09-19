/**
 * zip.js — Escritor ZIP mínimo (método "store", sin compresión).
 * Lo usa el exportador de .docx: un .docx es un ZIP con XML dentro.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();
const toBytes = (data) => (typeof data === 'string' ? enc.encode(data) : data);

function dosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

/**
 * @param {{name: string, data: string|Uint8Array}[]} files
 * @returns {Uint8Array} contenido del archivo .zip
 */
export function zipSync(files, date = new Date()) {
  const { time, day } = dosDateTime(date);
  const entries = files.map((f) => {
    const nameBytes = enc.encode(f.name);
    const data = toBytes(f.data);
    return { nameBytes, data, crc: crc32(data), offset: 0 };
  });

  let size = 0;
  for (const e of entries) size += 30 + e.nameBytes.length + e.data.length + 46 + e.nameBytes.length;
  size += 22;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let pos = 0;

  const u16 = (v) => { view.setUint16(pos, v, true); pos += 2; };
  const u32 = (v) => { view.setUint32(pos, v >>> 0, true); pos += 4; };
  const raw = (bytes) => { out.set(bytes, pos); pos += bytes.length; };

  for (const e of entries) {
    e.offset = pos;
    u32(0x04034b50); u16(20); u16(0x0800); u16(0); // versión, flag UTF-8, método store
    u16(time); u16(day);
    u32(e.crc); u32(e.data.length); u32(e.data.length);
    u16(e.nameBytes.length); u16(0);
    raw(e.nameBytes); raw(e.data);
  }

  const centralStart = pos;
  for (const e of entries) {
    u32(0x02014b50); u16(20); u16(20); u16(0x0800); u16(0);
    u16(time); u16(day);
    u32(e.crc); u32(e.data.length); u32(e.data.length);
    u16(e.nameBytes.length); u16(0); u16(0); u16(0); u16(0);
    u32(0); u32(e.offset);
    raw(e.nameBytes);
  }
  const centralSize = pos - centralStart;

  u32(0x06054b50); u16(0); u16(0);
  u16(entries.length); u16(entries.length);
  u32(centralSize); u32(centralStart); u16(0);

  return out.slice(0, pos);
}
