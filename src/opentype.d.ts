declare module 'opentype.js' {
  export function parse(buffer: ArrayBuffer | Uint8Array): unknown
  const opentype: { parse: typeof parse }
  export default opentype
}
