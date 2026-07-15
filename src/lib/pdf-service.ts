import 'server-only';

export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = require('pdf-parse');
    
    // 1. API moderna de pdf-parse (Clase PDFParse con método getText)
    const PDFParseClass = pdfParse.PDFParse || (typeof pdfParse === 'function' && pdfParse.prototype && pdfParse.prototype.getText ? pdfParse : null);
    if (PDFParseClass) {
      const parser = new PDFParseClass({ data: buffer });
      const result = await parser.getText();
      return typeof result === 'string' ? result : (result?.text || '');
    }

    // 2. API clásica de pdf-parse (función pura invocable)
    const pdfFunc = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || null);
    if (typeof pdfFunc === 'function') {
      const data = await pdfFunc(buffer);
      return typeof data === 'string' ? data : (data?.text || '');
    }

    throw new Error('La librería pdf-parse exporta una estructura desconocida en este entorno.');
  } catch (err: any) {
    console.error('Error en parsePdfBuffer:', err);
    throw new Error(err?.message || 'Error en la lectura del archivo PDF en el servidor.');
  }
}
