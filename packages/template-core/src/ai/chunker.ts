// ── SparrowBase Edge Document Chunking Utility ──
// Splits long texts and documents into semantic chunks for Vectorize RAG indexing.

export interface ChunkOptions {
  chunkSize?: number; // Target characters per chunk (default: 500)
  overlap?: number; // Overlap characters between chunks (default: 50)
  separator?: string; // Split boundary (default: paragraph or newline)
}

export interface TextChunk {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
}

/**
 * Split raw document text into overlapping chunks for embedding generation.
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const { chunkSize = 500, overlap = 50 } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanText = text.replace(/\r\n/g, '\n').trim();
  const chunks: TextChunk[] = [];

  // If text is smaller than chunk size, return single chunk
  if (cleanText.length <= chunkSize) {
    return [{ index: 0, text: cleanText, charStart: 0, charEnd: cleanText.length }];
  }

  let startIndex = 0;
  let chunkIdx = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex >= cleanText.length) {
      endIndex = cleanText.length;
    } else {
      // Find natural boundary (newline, period, or space) near endIndex
      const lookaheadRange = cleanText.slice(startIndex, endIndex);
      const lastBreak = Math.max(
        lookaheadRange.lastIndexOf('\n'),
        lookaheadRange.lastIndexOf('. '),
        lookaheadRange.lastIndexOf(' ')
      );

      if (lastBreak > chunkSize * 0.6) {
        endIndex = startIndex + lastBreak + 1;
      }
    }

    const chunkContent = cleanText.slice(startIndex, endIndex).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        index: chunkIdx++,
        text: chunkContent,
        charStart: startIndex,
        charEnd: endIndex,
      });
    }

    if (endIndex >= cleanText.length) break;
    startIndex = Math.max(startIndex + 1, endIndex - overlap);
  }

  return chunks;
}
