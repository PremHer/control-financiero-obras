import 'server-only';

export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = require('pdf-parse');
    const pdfFunc = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
    if (typeof pdfFunc !== 'function') {
      throw new Error('La librería pdf-parse no resolvió a una función invocable.');
    }
    const data = await pdfFunc(buffer);
    return data?.text || '';
  } catch (err: any) {
    console.error('Error interno en parsePdfBuffer:', err);
    throw new Error(err?.message || 'Error en la lectura del archivo PDF en el servidor.');
  }
}
