// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

const storeRegistry = new Map<string, string>();

export class RagService {
  static async extractTextFromPDF(buffer: Buffer): Promise<string> {
    // Extract text from the PDF buffer
    const data = await pdfParse(buffer);
    if (!data.text) throw new Error('Failed to extract text from the PDF');
    return data.text;
  }

  static async buildVectorStore(text: string, sessionId: string): Promise<void> {
    // Save the full extracted text securely in memory
    storeRegistry.set(sessionId, text);
  }

  static async retrieveRelevantChunks(
    query: string, 
    sessionId: string, 
    topK: number = 3, 
    fallbackText?: string
  ): Promise<string[]> {
    // Use memory cache first, then fall back to DB text if the server restarted
    const fullResumeText = storeRegistry.get(sessionId) || fallbackText;
    
    if (!fullResumeText) {
      throw new Error('Resume not found for this session');
    }

    // Return the entire resume as a single "chunk" to feed directly to Gemini
    return [fullResumeText];
  }
}