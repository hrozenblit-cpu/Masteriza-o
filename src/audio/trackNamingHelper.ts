/**
 * Helper to parse, format and edit export filenames following the studio standard:
 * [número da faixa]_[Nome da Musica] - [Nome do cantor se houver] - AT_[taxa em Khz_Bit]_[Lufs]
 */

export interface TrackMetadata {
  trackNumber: string; // e.g. "01", "02"
  songTitle: string;    // e.g. "Garota de Ipanema"
  artist: string;       // e.g. "Tom Jobim" (optional)
}

/**
 * Formats sample rate in Hz to kHz display string:
 * 44100 -> "44.1kHz"
 * 48000 -> "48kHz"
 * 88200 -> "88.2kHz"
 * 96000 -> "96kHz"
 * 176400 -> "176.4kHz"
 * 192000 -> "192kHz"
 * 384000 -> "384kHz"
 */
export function formatSampleRateKhz(sampleRate: number): string {
  const khz = sampleRate / 1000;
  if (khz % 1 === 0) {
    return `${khz}kHz`;
  }
  // Trim unnecessary trailing zeros, e.g. 44.100 -> 44.1
  return `${parseFloat(khz.toFixed(2))}kHz`;
}

/**
 * Formats LUFS value:
 * -14 or -14.0 -> "-14LUFS"
 * -14.5 -> "-14.5LUFS"
 */
export function formatLufsString(targetLufs?: number): string {
  const lufs = targetLufs ?? -14.0;
  if (Math.abs(lufs % 1) < 0.05) {
    return `${Math.round(lufs)}LUFS`;
  }
  return `${lufs.toFixed(1)}LUFS`;
}

/**
 * Sanitizes filename component for all major filesystems (Windows, macOS, Linux)
 */
export function sanitizeFilenamePart(text: string): string {
  return text
    .replace(/[<>:"/\\|?*]/g, '') // remove illegal characters
    .trim();
}

/**
 * Intelligent parser to extract track number, song title and artist from raw file names.
 * Examples handled:
 * - "01 - Garota de Ipanema - Tom Jobim.wav" -> # "01", Title "Garota de Ipanema", Artist "Tom Jobim"
 * - "01. Tom Jobim - Garota de Ipanema.mp3" -> # "01", Title "Garota de Ipanema", Artist "Tom Jobim"
 * - "Tom Jobim - Garota de Ipanema.wav" -> # (fallbackIndex), Title "Garota de Ipanema", Artist "Tom Jobim"
 * - "01_Garota_de_Ipanema.wav" -> # "01", Title "Garota de Ipanema", Artist ""
 * - "Musica Fita.wav" -> # (fallbackIndex), Title "Musica Fita", Artist ""
 */
export function parseTrackMetadata(filename: string, fallbackIndex: number = 1): TrackMetadata {
  // Strip extension
  let base = filename.replace(/\.[^/.]+$/, '').trim();

  // Strip AuraTune or Master tags if already present from previous exports
  base = base.replace(/^AuraTune_Master_/i, '');
  base = base.replace(/_Master_\d+Hz.*$/i, '');
  base = base.replace(/- AT_.*$/i, '');
  base = base.replace(/_AT_.*$/i, '');

  let trackNumber = String(fallbackIndex).padStart(2, '0');

  // Check if filename starts with a track number, e.g. "01 - ", "01. ", "01_ ", "01_"
  const trackNumMatch = base.match(/^(\d{1,3})(?:[\s._-]+|\s+)(.*)$/);
  if (trackNumMatch) {
    trackNumber = trackNumMatch[1].padStart(2, '0');
    base = trackNumMatch[2].trim();
  }

  // Check if base has " - " separator (often Artist - Title or Title - Artist)
  const parts = base.split(/\s+-\s+/);
  let songTitle = base;
  let artist = '';

  if (parts.length >= 2) {
    // If first part looks like artist or second part looks like artist:
    // Standard notation in music files is usually: "Artist - Title" or "Title - Artist"
    // We treat part 0 as title and part 1 as artist, or vice-versa
    // Let's check common patterns:
    songTitle = parts[0].trim();
    artist = parts[1].trim();
  } else {
    // Check if separated by underscores with artist
    const underscoreParts = base.split(/_+/);
    if (underscoreParts.length >= 2 && underscoreParts.includes('feat') || base.includes('_-_')) {
      const sp = base.split('_-_');
      if (sp.length === 2) {
        songTitle = sp[0].replace(/_/g, ' ').trim();
        artist = sp[1].replace(/_/g, ' ').trim();
      }
    }
  }

  // Clean underscores to spaces for human-readable song title and artist
  if (songTitle.includes('_') && !songTitle.includes(' ')) {
    songTitle = songTitle.replace(/_/g, ' ');
  }
  if (artist.includes('_') && !artist.includes(' ')) {
    artist = artist.replace(/_/g, ' ');
  }

  return {
    trackNumber,
    songTitle: sanitizeFilenamePart(songTitle || `Faixa ${trackNumber}`),
    artist: sanitizeFilenamePart(artist),
  };
}

export interface MasterExportParams {
  trackNumber: string;
  songTitle: string;
  artist?: string;
  sampleRate: number;
  bitDepth: number;
  targetLufs?: number;
  suffix?: string;
}

/**
 * Builds standard Master WAV export name:
 * [número da faixa]_[Nome da Musica] - [Nome do cantor se houver] - AT_[taxa em Khz_Bit]_[Lufs].wav
 * Example with artist:
 * "01_Garota de Ipanema - Tom Jobim - AT_44.1kHz_24bit_-14LUFS.wav"
 * Example without artist:
 * "01_Garota de Ipanema - AT_44.1kHz_24bit_-14LUFS.wav"
 */
export function buildMasterWavFilename(params: MasterExportParams): string {
  const num = String(params.trackNumber || '01').padStart(2, '0');
  const title = sanitizeFilenamePart(params.songTitle || 'Faixa');
  const artist = params.artist ? sanitizeFilenamePart(params.artist) : '';
  const rateKhz = formatSampleRateKhz(params.sampleRate);
  const bit = `${params.bitDepth || 24}bit`;
  const lufs = formatLufsString(params.targetLufs);
  const suffix = params.suffix || '';

  const artistPart = artist ? ` - ${artist}` : '';
  return `${num}_${title}${artistPart} - AT_${rateKhz}_${bit}_${lufs}${suffix}.wav`;
}

/**
 * Builds standard Azimuth-Only Preservation WAV export name:
 * [número da faixa]_[Nome da Musica] - [Nome do cantor se houver] - AT_Azimute_[taxa em Khz_Bit].wav
 */
export function buildAzimuthWavFilename(
  params: Omit<MasterExportParams, 'targetLufs'>
): string {
  const num = String(params.trackNumber || '01').padStart(2, '0');
  const title = sanitizeFilenamePart(params.songTitle || 'Faixa');
  const artist = params.artist ? sanitizeFilenamePart(params.artist) : '';
  const rateKhz = formatSampleRateKhz(params.sampleRate);
  const bit = `${params.bitDepth || 24}bit`;
  const suffix = params.suffix || '';

  const artistPart = artist ? ` - ${artist}` : '';
  return `${num}_${title}${artistPart} - AT_Azimute_${rateKhz}_${bit}${suffix}.wav`;
}

/**
 * Builds standard Dropout-Restored Archival Preservation WAV export name:
 * [número da faixa]_[Nome da Musica] - [Nome do cantor se houver] - AT_DropoutRestaurado_[taxa em Khz_Bit].wav
 */
export function buildDropoutWavFilename(
  params: Omit<MasterExportParams, 'targetLufs'>
): string {
  const num = String(params.trackNumber || '01').padStart(2, '0');
  const title = sanitizeFilenamePart(params.songTitle || 'Faixa');
  const artist = params.artist ? sanitizeFilenamePart(params.artist) : '';
  const rateKhz = formatSampleRateKhz(params.sampleRate);
  const bit = `${params.bitDepth || 24}bit`;
  const suffix = params.suffix || '';

  const artistPart = artist ? ` - ${artist}` : '';
  return `${num}_${title}${artistPart} - AT_DropoutRestaurado_${rateKhz}_${bit}${suffix}.wav`;
}

/**
 * Builds standard Recall Preset (.aurapreset) export name:
 * [número da faixa]_[Nome da Musica] - [Nome do cantor se houver] - AT_[taxa em Khz_Bit]_[Lufs]_Recall.aurapreset
 */
export function buildRecallFilename(params: MasterExportParams): string {
  const num = String(params.trackNumber || '01').padStart(2, '0');
  const title = sanitizeFilenamePart(params.songTitle || 'Faixa');
  const artist = params.artist ? sanitizeFilenamePart(params.artist) : '';
  const rateKhz = formatSampleRateKhz(params.sampleRate);
  const bit = `${params.bitDepth || 24}bit`;
  const lufs = formatLufsString(params.targetLufs);
  const suffix = params.suffix || '';

  const artistPart = artist ? ` - ${artist}` : '';
  return `${num}_${title}${artistPart} - AT_${rateKhz}_${bit}_${lufs}_Recall${suffix}.aurapreset`;
}
