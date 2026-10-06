// ZIP signatures and CRC-32 parameters. Values are unsigned 32-bit; `>>> 0`
// keeps them in the unsigned range wherever bitwise operators are involved.
export const ZIP_LOCAL_SIG = 0x04034b50 >>> 0;
export const ZIP_CENTRAL_SIG = 0x02014b50 >>> 0;
export const ZIP_EOCD_SIG = 0x06054b50 >>> 0;
export const CRC32_POLY = 0xedb88320 >>> 0;
export const CRC32_INIT = 0xffffffff >>> 0;
