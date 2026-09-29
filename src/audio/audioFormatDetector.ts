/**
 * Audio Format & Metadata Detector
 * Extracts native sample rate and bit depth from input audio files (WAV, FLAC, MP3, etc.)
 * so the mastering engine can export with bit-exact matching.
 */

export interface AudioInputFormat {
  sampleRate: number;      // e.g. 44100, 48000, 88200, 96000, 192000
  bitDepth: 16 | 24 | 32;  // 16-bit, 24-bit, or 32-bit float
  channels: number;        // 1 = mono, 2 = stereo
  codec: string;           // "WAV (PCM)", "FLAC (Lossless)", "MP3", "AAC/M4A", etc.
  fileSizeBytes: number;
}

export async function detectAudioFileFormat(file: File, decodedBuffer: AudioBuffer): Promise<AudioInputFormat> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const bufferSampleRate = decodedBuffer.sampleRate;
  const channels = decodedBuffer.numberOfChannels;
  const fileSizeBytes = file.size;

  // 1. Try parsing native WAV header
  if (extension === 'wav' || extension === 'wave') {
    try {
      const slice = await file.slice(0, 4096).arrayBuffer();
      const view = new DataView(slice);
      
      const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));

      if (riff === 'RIFF' && wave === 'WAVE') {
        let offset = 12;
        while (offset < view.byteLength - 8) {
          const chunkId = String.fromCharCode(
            view.getUint8(offset),
            view.getUint8(offset + 1),
            view.getUint8(offset + 2),
            view.getUint8(offset + 3)
          );
          const chunkSize = view.getUint32(offset + 4, true);

          if (chunkId === 'fmt ') {
            const audioFormat = view.getUint16(offset + 8, true); // 1 = PCM, 3 = IEEE Float
            const numChannels = view.getUint16(offset + 10, true);
            const sampleRate = view.getUint32(offset + 12, true);
            const bitsPerSample = view.getUint16(offset + 22, true);

            let bitDepth: 16 | 24 | 32 = 16;
            if (bitsPerSample === 24) bitDepth = 24;
            else if (bitsPerSample === 32 || audioFormat === 3) bitDepth = 32;
            else if (bitsPerSample === 16) bitDepth = 16;
            else if (bitsPerSample > 16) bitDepth = 24;

            return {
              sampleRate: sampleRate || bufferSampleRate,
              bitDepth,
              channels: numChannels || channels,
              codec: audioFormat === 3 ? 'WAV (32-bit Float)' : `WAV (${bitDepth}-bit PCM)`,
              fileSizeBytes,
            };
          }
          offset += 8 + chunkSize;
        }
      }
    } catch {
      // Fallback below
    }
  }

  // 2. Try parsing FLAC STREAMINFO header
  if (extension === 'flac') {
    try {
      const slice = await file.slice(0, 128).arrayBuffer();
      const view = new DataView(slice);
      const marker = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      
      if (marker === 'fLaC') {
        // STREAMINFO block starts at byte 8 (4 byte magic + 4 byte block header)
        // Sample rate (20 bits): bytes 18..20
        const b18 = view.getUint8(18);
        const b19 = view.getUint8(19);
        const b20 = view.getUint8(20);
        const sampleRate = (b18 << 12) | (b19 << 4) | (b20 >> 4);

        // Bits per sample (5 bits): lower 1 bit of byte 20 and upper 4 bits of byte 21 (+ 1)
        const b21 = view.getUint8(21);
        const bitsPerSample = (((b20 & 0x01) << 4) | (b21 >> 4)) + 1;

        let bitDepth: 16 | 24 | 32 = 16;
        if (bitsPerSample >= 24) bitDepth = 24;
        else if (bitsPerSample >= 32) bitDepth = 32;

        return {
          sampleRate: sampleRate || bufferSampleRate,
          bitDepth,
          channels,
          codec: `FLAC Lossless (${bitDepth}-bit)`,
          fileSizeBytes,
        };
      }
    } catch {
      // Fallback below
    }
  }

  // 3. Compressed audio (MP3, M4A, OGG, AAC, etc.)
  // When decoded, Web Audio decodes to 32-bit float PCM.
  // Standard mastering quality for uncompressed WAV export from compressed sources is 24-bit PCM
  // at the exact native sample rate of the file (typically 44100 or 48000 Hz).
  let codec = 'Áudio';
  if (extension === 'mp3') codec = 'MP3 (MPEG Audio)';
  else if (extension === 'm4a' || extension === 'aac') codec = 'AAC / M4A';
  else if (extension === 'ogg') codec = 'OGG Vorbis';
  else if (extension === 'aiff' || extension === 'aif') codec = 'AIFF';
  else if (extension === 'mp4' || extension === 'mpg4' || extension === 'm4v') codec = 'Vídeo MP4 / MPEG-4 (Áudio Extraído)';
  else if (extension === 'mov') codec = 'Vídeo QuickTime MOV (Áudio Extraído)';
  else if (extension === 'webm') codec = 'Vídeo WebM (Áudio Extraído)';
  else if (extension === 'mkv') codec = 'Vídeo MKV (Áudio Extraído)';
  else codec = extension.toUpperCase();

  return {
    sampleRate: bufferSampleRate,
    bitDepth: 24, // Studio master standard for export
    channels,
    codec,
    fileSizeBytes,
  };
}
