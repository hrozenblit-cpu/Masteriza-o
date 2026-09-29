/**
 * Native Audio Decoder
 *
 * Decodes audio files while strictly preserving their native sample rate (e.g., 44.1 kHz, 48 kHz, 88.2 kHz, 96 kHz, 192 kHz).
 *
 * For standard WAV/BWF files (16-bit, 24-bit, 32-bit PCM, 32-bit IEEE Float):
 * Parses the RIFF chunks directly into an AudioBuffer without invoking Web Audio's AudioContext.decodeAudioData,
 * completely bypassing the browser's automatic hardware sample-rate conversion (which forces 48000 Hz).
 *
 * For compressed formats (MP3, AAC, FLAC):
 * Detects the native sample rate from metadata and renders via an OfflineAudioContext configured at the exact native rate.
 */

import { detectAudioFileFormat } from './audioFormatDetector';

export async function decodeAudioPreservingSampleRate(
  file: File,
  fallbackCtx?: AudioContext
): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. Try bit-exact native PCM/WAV decoding
  if (extension === 'wav' || extension === 'wave') {
    try {
      const decodedWav = decodePcmWavDirect(arrayBuffer);
      if (decodedWav) {
        return decodedWav;
      }
    } catch (err) {
      console.warn('Decodificador direto WAV falhou, usando decodificador de contingência:', err);
    }
  }

  // 2. Fallback for compressed or non-standard formats (FLAC, MP3, etc.)
  // Detect original native sample rate first
  let nativeSampleRate = 44100;
  try {
    const dummyBuffer = { sampleRate: 44100, numberOfChannels: 2 } as AudioBuffer;
    const format = await detectAudioFileFormat(file, dummyBuffer);
    if (format.sampleRate && format.sampleRate >= 8000 && format.sampleRate <= 384000) {
      nativeSampleRate = format.sampleRate;
    }
  } catch {
    // default to 44100
  }

  // Use OfflineAudioContext with nativeSampleRate
  let decoded: AudioBuffer;
  try {
    const offlineCtx = new OfflineAudioContext(2, 1, nativeSampleRate);
    decoded = await offlineCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    if (fallbackCtx) {
      decoded = await fallbackCtx.decodeAudioData(arrayBuffer.slice(0));
    } else {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const tempCtx = new AudioCtx();
      decoded = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
    }
  }

  // If decoded sample rate matches native, return directly
  if (decoded.sampleRate === nativeSampleRate) {
    return decoded;
  }

  // If browser resampled to 48000 Hz but the file was 44100 Hz, resample back to exact native rate!
  try {
    const targetLength = Math.round(decoded.duration * nativeSampleRate);
    const resampleCtx = new OfflineAudioContext(decoded.numberOfChannels, targetLength, nativeSampleRate);
    const srcNode = resampleCtx.createBufferSource();
    srcNode.buffer = decoded;
    srcNode.connect(resampleCtx.destination);
    srcNode.start(0);
    const resampled = await resampleCtx.startRendering();
    return resampled;
  } catch (resampleErr) {
    console.warn('Erro ao reamostrar para taxa nativa:', resampleErr);
    return decoded;
  }
}

/**
 * Direct bit-exact PCM & IEEE Float WAV parser
 * Completely avoids Web Audio hardware sample rate forcing
 */
export function decodePcmWavDirect(arrayBuffer: ArrayBuffer): AudioBuffer | null {
  const view = new DataView(arrayBuffer);
  const uint8 = new Uint8Array(arrayBuffer);

  // Check RIFF header
  if (view.byteLength < 44) return null;
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (riff !== 'RIFF' || wave !== 'WAVE') return null;

  let offset = 12;
  let audioFormat = 1; // 1 = PCM, 3 = IEEE Float, 0xFFFE = Extensible
  let numChannels = 2;
  let sampleRate = 44100;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  // Walk through chunks
  while (offset < view.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      audioFormat = view.getUint16(offset + 8, true);
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);

      // Handle WAVE_FORMAT_EXTENSIBLE
      if (audioFormat === 0xfffe && chunkSize >= 40) {
        audioFormat = view.getUint16(offset + 32, true); // SubFormat GUID first 2 bytes
      }
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = Math.min(chunkSize, view.byteLength - dataOffset);
      break;
    }

    offset += 8 + chunkSize;
    // Chunk padding rule
    if (chunkSize % 2 === 1) offset += 1;
  }

  if (dataOffset === -1 || dataSize <= 0) return null;
  if (numChannels < 1 || numChannels > 8) return null;
  if (![16, 24, 32].includes(bitsPerSample)) return null;
  if (audioFormat !== 1 && audioFormat !== 3) return null;

  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const totalFrames = Math.floor(dataSize / blockAlign);
  if (totalFrames <= 0) return null;

  // Create AudioBuffer with EXACT native sampleRate
  const audioBuffer = new AudioBuffer({
    numberOfChannels: numChannels,
    length: totalFrames,
    sampleRate: sampleRate,
  });

  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c));
  }

  let readIndex = dataOffset;

  if (bitsPerSample === 16) {
    // 16-bit signed integer PCM
    for (let i = 0; i < totalFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        const val = view.getInt16(readIndex, true);
        channelData[c][i] = val < 0 ? val / 32768.0 : val / 32767.0;
        readIndex += 2;
      }
    }
  } else if (bitsPerSample === 24) {
    // 24-bit signed integer PCM (studio standard for master tape digitizations)
    for (let i = 0; i < totalFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        const b0 = uint8[readIndex];
        const b1 = uint8[readIndex + 1];
        const b2 = uint8[readIndex + 2];
        let val = (b2 << 16) | (b1 << 8) | b0;
        if (val & 0x800000) {
          val |= ~0xffffff;
        }
        channelData[c][i] = val < 0 ? val / 8388608.0 : val / 8388607.0;
        readIndex += 3;
      }
    }
  } else if (bitsPerSample === 32) {
    if (audioFormat === 3) {
      // 32-bit IEEE float
      for (let i = 0; i < totalFrames; i++) {
        for (let c = 0; c < numChannels; c++) {
          channelData[c][i] = view.getFloat32(readIndex, true);
          readIndex += 4;
        }
      }
    } else {
      // 32-bit signed integer PCM
      for (let i = 0; i < totalFrames; i++) {
        for (let c = 0; c < numChannels; c++) {
          const val = view.getInt32(readIndex, true);
          channelData[c][i] = val < 0 ? val / 2147483648.0 : val / 2147483647.0;
          readIndex += 4;
        }
      }
    }
  }

  return audioBuffer;
}
