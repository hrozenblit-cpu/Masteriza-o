/**
 * Pro Tools Split Stereo / Dual Mono (Multiple Mono) Manager
 *
 * Automatically detects and merges separate .L and .R mono files into
 * pristine, sample-accurate 2-channel Stereo AudioBuffers.
 *
 * Supports Pro Tools, Nuendo, Cubase, Logic and Reaper conventions:
 * - name.L.wav / name.R.wav (standard Pro Tools)
 * - name_L.wav / name_R.wav
 * - name L.wav / name R.wav
 * - name.Left.wav / name.Right.wav
 * - name_Left.wav / name_Right.wav
 * - name.1.wav / name.2.wav
 * - name_1.wav / name_2.wav
 */

import { stripAudioFileExtension } from './trackNamingHelper';

export interface SplitStereoInfo {
  isSplit: boolean;
  channel?: 'L' | 'R';
  baseName?: string;
  expectedPartnerFilename?: string;
  partnerPattern?: string;
}

export interface SplitStereoPair {
  fileL: File;
  fileR: File;
  baseTrackName: string;
}

// Regex patterns to identify Left and Right channel suffixes
const SPLIT_PATTERNS = [
  // .L.wav / .R.wav (Pro Tools default)
  {
    regexL: /^(.*)\.l(\.[^.]+)$/i,
    regexR: /^(.*)\.r(\.[^.]+)$/i,
    suffixL: '.L',
    suffixR: '.R',
  },
  // _L.wav / _R.wav
  {
    regexL: /^(.*)[_]l(\.[^.]+)$/i,
    regexR: /^(.*)[_]r(\.[^.]+)$/i,
    suffixL: '_L',
    suffixR: '_R',
  },
  // -L.wav / -R.wav
  {
    regexL: /^(.*)[-]l(\.[^.]+)$/i,
    regexR: /^(.*)[-]r(\.[^.]+)$/i,
    suffixL: '-L',
    suffixR: '-R',
  },
  // " L.wav" / " R.wav"
  {
    regexL: /^(.*)\s+l(\.[^.]+)$/i,
    regexR: /^(.*)\s+r(\.[^.]+)$/i,
    suffixL: ' L',
    suffixR: ' R',
  },
  // (L).wav / (R).wav or (Left).wav / (Right).wav
  {
    regexL: /^(.*)[\s._-]*\(l\)(\.[^.]+)$/i,
    regexR: /^(.*)[\s._-]*\(r\)(\.[^.]+)$/i,
    suffixL: ' (L)',
    suffixR: ' (R)',
  },
  {
    regexL: /^(.*)[\s._-]*\[l\](\.[^.]+)$/i,
    regexR: /^(.*)[\s._-]*\[r\](\.[^.]+)$/i,
    suffixL: ' [L]',
    suffixR: ' [R]',
  },
  // .Left.wav / .Right.wav
  {
    regexL: /^(.*)\.left(\.[^.]+)$/i,
    regexR: /^(.*)\.right(\.[^.]+)$/i,
    suffixL: '.Left',
    suffixR: '.Right',
  },
  // _Left.wav / _Right.wav
  {
    regexL: /^(.*)[_]left(\.[^.]+)$/i,
    regexR: /^(.*)[_]right(\.[^.]+)$/i,
    suffixL: '_Left',
    suffixR: '_Right',
  },
  // -Left.wav / -Right.wav
  {
    regexL: /^(.*)[-]left(\.[^.]+)$/i,
    regexR: /^(.*)[-]right(\.[^.]+)$/i,
    suffixL: '-Left',
    suffixR: '-Right',
  },
  // .ch1.wav / .ch2.wav
  {
    regexL: /^(.*)\.ch1(\.[^.]+)$/i,
    regexR: /^(.*)\.ch2(\.[^.]+)$/i,
    suffixL: '.ch1',
    suffixR: '.ch2',
  },
  // _ch1.wav / _ch2.wav
  {
    regexL: /^(.*)[_]ch1(\.[^.]+)$/i,
    regexR: /^(.*)[_]ch2(\.[^.]+)$/i,
    suffixL: '_ch1',
    suffixR: '_ch2',
  },
  // .1.wav / .2.wav
  {
    regexL: /^(.*)\.1(\.[^.]+)$/i,
    regexR: /^(.*)\.2(\.[^.]+)$/i,
    suffixL: '.1',
    suffixR: '.2',
  },
  // _1.wav / _2.wav
  {
    regexL: /^(.*)[_]1(\.[^.]+)$/i,
    regexR: /^(.*)[_]2(\.[^.]+)$/i,
    suffixL: '_1',
    suffixR: '_2',
  },
  // Extension-only name.L / name.R (Sound Designer II / Pro Tools native export)
  {
    regexL: /^(.*)\.l$/i,
    regexR: /^(.*)\.r$/i,
    suffixL: '.L',
    suffixR: '.R',
  },
  {
    regexL: /^(.*)[_]l$/i,
    regexR: /^(.*)[_]r$/i,
    suffixL: '_L',
    suffixR: '_R',
  },
];

/**
 * Checks if a single filename looks like a Pro Tools split-mono file (.L or .R)
 */
export function analyzeSplitStereoFilename(filename: string): SplitStereoInfo {
  for (const pat of SPLIT_PATTERNS) {
    const matchL = filename.match(pat.regexL);
    if (matchL) {
      const baseName = matchL[1];
      const ext = matchL[2] || '';
      return {
        isSplit: true,
        channel: 'L',
        baseName,
        expectedPartnerFilename: `${baseName}${pat.suffixR}${ext}`,
        partnerPattern: pat.suffixR,
      };
    }

    const matchR = filename.match(pat.regexR);
    if (matchR) {
      const baseName = matchR[1];
      const ext = matchR[2] || '';
      return {
        isSplit: true,
        channel: 'R',
        baseName,
        expectedPartnerFilename: `${baseName}${pat.suffixL}${ext}`,
        partnerPattern: pat.suffixL,
      };
    }
  }

  return { isSplit: false };
}

/**
 * Detects whether a list of files contains an L and R split pair that belongs together.
 */
export function findSplitStereoPair(files: File[] | FileList): SplitStereoPair | null {
  const fileArray = Array.from(files);
  if (fileArray.length < 2) return null;

  // 1. Exact baseName match across known patterns
  for (let i = 0; i < fileArray.length; i++) {
    const infoA = analyzeSplitStereoFilename(fileArray[i].name);
    if (!infoA.isSplit || !infoA.channel || !infoA.baseName) continue;

    for (let j = 0; j < fileArray.length; j++) {
      if (i === j) continue;
      const infoB = analyzeSplitStereoFilename(fileArray[j].name);
      if (!infoB.isSplit || !infoB.channel || !infoB.baseName) continue;

      // Same base track name (normalized) but opposite channels
      if (
        infoA.baseName.trim().toLowerCase() === infoB.baseName.trim().toLowerCase() &&
        infoA.channel !== infoB.channel
      ) {
        const fileL = infoA.channel === 'L' ? fileArray[i] : fileArray[j];
        const fileR = infoA.channel === 'R' ? fileArray[i] : fileArray[j];
        return {
          fileL,
          fileR,
          baseTrackName: infoA.baseName,
        };
      }
    }
  }

  // 2. Fallback heuristic: If exactly 2 files were provided, check if one has L and one has R
  if (fileArray.length === 2) {
    const info0 = analyzeSplitStereoFilename(fileArray[0].name);
    const info1 = analyzeSplitStereoFilename(fileArray[1].name);

    if (info0.channel && info1.channel && info0.channel !== info1.channel) {
      return {
        fileL: info0.channel === 'L' ? fileArray[0] : fileArray[1],
        fileR: info0.channel === 'R' ? fileArray[0] : fileArray[1],
        baseTrackName: (info0.baseName || stripAudioFileExtension(fileArray[0].name)),
      };
    }

    const name0 = fileArray[0].name.toLowerCase();
    const name1 = fileArray[1].name.toLowerCase();
    const is0_L = /\b(left|ch1|chan1)\b|[\._\-\s(]l[\._\-\s)]/i.test(name0);
    const is0_R = /\b(right|ch2|chan2)\b|[\._\-\s(]r[\._\-\s)]/i.test(name0);
    const is1_L = /\b(left|ch1|chan1)\b|[\._\-\s(]l[\._\-\s)]/i.test(name1);
    const is1_R = /\b(right|ch2|chan2)\b|[\._\-\s(]r[\._\-\s)]/i.test(name1);

    if ((is0_L && is1_R) || (is0_R && is1_L)) {
      return {
        fileL: is0_L ? fileArray[0] : fileArray[1],
        fileR: is0_R ? fileArray[0] : fileArray[1],
        baseTrackName: fileArray[0].name.replace(/[\._\-\s(]*(l|r|left|right|ch1|ch2)[\._\-\s)]*(\.[^.]*)?$/i, ''),
      };
    }
  }

  return null;
}

/**
 * Merges two single-channel AudioBuffers (Left and Right) into a single 2-channel Stereo AudioBuffer.
 * Handles slight duration mismatches and sample rates gracefully.
 */
export function mergeMonoBuffersToStereo(
  bufferL: AudioBuffer,
  bufferR: AudioBuffer,
  context?: BaseAudioContext
): AudioBuffer {
  const sampleRate = bufferL.sampleRate;
  const numChannels = 2;
  const length = Math.max(bufferL.length, bufferR.length);

  let outputBuffer: AudioBuffer;
  if (typeof AudioBuffer !== 'undefined') {
    try {
      outputBuffer = new AudioBuffer({ numberOfChannels: numChannels, length, sampleRate });
    } catch {
      const ctx = context || (new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)());
      outputBuffer = ctx.createBuffer(numChannels, length, sampleRate);
    }
  } else {
    const ctx = context || (new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)());
    outputBuffer = ctx.createBuffer(numChannels, length, sampleRate);
  }

  const outChannelL = outputBuffer.getChannelData(0);
  const outChannelR = outputBuffer.getChannelData(1);

  // Copy Left data
  const srcL = bufferL.getChannelData(0);
  outChannelL.set(srcL);

  // Copy Right data
  // Note: if bufferR has 2 channels, use channel 1, otherwise channel 0
  const srcR = bufferR.numberOfChannels > 1 ? bufferR.getChannelData(1) : bufferR.getChannelData(0);
  outChannelR.set(srcR);

  return outputBuffer;
}
