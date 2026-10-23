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
 * Sanitizes filename component for 100% universal compatibility across all operating systems:
 * - Windows XP / 7 / 10 / 11, FAT32, exFAT, NTFS, macOS, Linux, and car stereos / legacy hardware.
 * - Converts accents/diacritics to clean standard ASCII (e.g. ã->a, é->e, ç->c, ó->o).
 * - Strips characters forbidden by Win32/DOS: < > : " / \ | ? * and control chars.
 * - Strips trailing dots and spaces (which cause Windows XP to lock/corrupt file names on NTFS/FAT32).
 */
export function sanitizeFilenamePart(text: string): string {
  if (!text) return '';
  return text
    // Replace quotes and fractions often found in preset names like 1/4"
    .replace(/["']/g, '')
    .replace(/\//g, '-')
    .replace(/\\/g, '-')
    // Normalize unicode accents to standard ASCII (e.g. ã -> a, é -> e, ç -> c)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove illegal filesystem characters
    .replace(/[<>:"/\\|?*~`^]/g, '')
    // Replace any remaining non-printable or high-ASCII bytes with safe ASCII
    .replace(/[^\x20-\x7E]/g, '')
    // Collapse multiple spaces or multiple dashes
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    // Windows XP strictly forbids trailing spaces and trailing dots
    .replace(/[.\s]+$/g, '')
    .replace(/^[.\s]+/g, '')
    .trim();
}

/**
 * Safely strips known audio/video/preset file extensions (.wav, .mp3, .flac, .aurapreset, etc.).
 * CRITICAL: Never strips dots inside catalog numbers or titles (e.g. "40.070 - 02_Ri").
 */
export function stripAudioFileExtension(filename: string): string {
  if (!filename) return '';
  return filename
    .replace(/\.(wav|mp3|flac|m4a|aac|ogg|oga|aiff?|wma|alac|opus|caf|mp4|mpg4|m4v|mov|webm|mkv|avi|zip|aurapreset)$/i, '')
    .trim();
}

/**
 * Sanitizes directory / folder name for universal Windows XP / NTFS / FAT32 compatibility:
 * - Strips characters forbidden by Win32: < > : " / \ | ? *
 * - Strips control characters and non-printable bytes
 * - Preserves standard brackets [ ], dashes, underscores, and ASCII alphanumeric characters
 * - Strips trailing dots and spaces (which cause Windows XP to fail)
 * - Limits length to prevent MAX_PATH overflow
 */
export function sanitizeFolderName(name: string, maxLength: number = 64): string {
  if (!name) return '';
  let clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*~`^]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.\s]+$/g, '')
    .replace(/^[.\s]+/g, '')
    .trim();

  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength).replace(/[.\s_-]+$/, '').trim();
  }
  return clean;
}

/**
 * Ensures full filename (with extension) conforms strictly to Windows XP and universal FAT32/NTFS standard:
 * - Clean safe ASCII name
 * - Lowercase standard extension (.wav, .zip, .aurapreset)
 * - Zero trailing dots or spaces
 * - Length bounded (max 140 base chars) so full path + subfolders never exceed 260 MAX_PATH
 */
export function sanitizeSafeAsciiFilename(filename: string, maxBaseLength: number = 140): string {
  if (!filename) return 'faixa.wav';
  const match = filename.match(/^(.*)\.(wav|mp3|flac|m4a|aac|ogg|oga|aiff?|wma|alac|opus|caf|mp4|mpg4|m4v|mov|webm|mkv|avi|zip|aurapreset)$/i);
  if (match) {
    let cleanName = sanitizeFilenamePart(match[1]);
    const ext = match[2].toLowerCase();
    if (cleanName.length > maxBaseLength) {
      cleanName = cleanName.substring(0, maxBaseLength).replace(/[.\s_-]+$/, '').trim();
    }
    return `${cleanName || 'faixa'}.${ext}`;
  }
  let cleanName = sanitizeFilenamePart(filename);
  if (cleanName.length > maxBaseLength) {
    cleanName = cleanName.substring(0, maxBaseLength).replace(/[.\s_-]+$/, '').trim();
  }
  return cleanName || 'faixa';
}

/**
 * Intelligent parser to extract track number, song title and artist from raw file names.
 * Examples handled:
 * - "40.070 - 02_Ri.wav" -> # "", Title "40.070 - 02_Ri", Artist "" (Catalog code with dot & underscore preserved)
 * - "01 - Garota de Ipanema - Tom Jobim.wav" -> # "01", Title "Garota de Ipanema", Artist "Tom Jobim"
 * - "01. Tom Jobim - Garota de Ipanema.mp3" -> # "01", Title "Tom Jobim", Artist "Garota de Ipanema"
 * - "Tom Jobim - Garota de Ipanema.wav" -> # "", Title "Tom Jobim", Artist "Garota de Ipanema"
 * - "01_Garota_de_Ipanema.wav" -> # "01", Title "Garota_de_Ipanema", Artist ""
 * - "Musica Fita.wav" -> # "", Title "Musica Fita", Artist ""
 */
export function parseTrackMetadata(filename: string, fallbackIndex?: number): TrackMetadata {
  // Strip known media extension safely without touching catalog dots (like 40.070)
  let base = stripAudioFileExtension(filename);

  // Strip AuraTune or Master tags if already present from previous exports
  base = base.replace(/^AuraTune_Master_/i, '');
  base = base.replace(/_Master_\d+Hz.*$/i, '');
  base = base.replace(/- AT_.*$/i, '');
  base = base.replace(/_AT_.*$/i, '');

  let trackNumber = '';

  // Dotted numbers like "40.070" or "101.404" are catalog / reel identification codes, NOT track numbers!
  const hasDottedCatalogPrefix = /^\d+\.\d+/.test(base);

  if (!hasDottedCatalogPrefix) {
    // Check if filename starts with a track number, e.g. "01 - ", "01. ", "01_ ", "01 "
    // Note: dot '.' is only a track delimiter if followed by whitespace or non-digit (e.g. "01. Title")
    const trackNumMatch = base.match(/^(\d{1,3})(?:\.+(?!\d)[\s_-]*|[\s_-]+)(.*)$/);
    if (trackNumMatch) {
      trackNumber = trackNumMatch[1].padStart(2, '0');
      base = trackNumMatch[2].trim();
    } else if (fallbackIndex !== undefined && fallbackIndex !== null && fallbackIndex > 0) {
      trackNumber = String(fallbackIndex).padStart(2, '0');
    }
  }

  // Check if base has " - " separator (often Artist - Title or Title - Artist or Catalog - Track)
  const parts = base.split(/\s+-\s+/);
  let songTitle = base;
  let artist = '';

  if (parts.length >= 2) {
    // Case A: Catalog number with dot in first part (e.g. "40.070")
    if (/^\d+\.\d+/.test(parts[0])) {
      if (parts.length === 2) {
        // e.g. "40.070 - 02_Ri" -> Keep the full designation as songTitle, artist remains empty
        songTitle = base;
        artist = '';
      } else {
        // e.g. "40.070 - 02_Ri - Tom Jobim" -> songTitle = "40.070 - 02_Ri", artist = "Tom Jobim"
        songTitle = parts.slice(0, parts.length - 1).join(' - ');
        artist = parts[parts.length - 1].trim();
      }
    } else {
      // Case B: Standard parts. If second part starts with digits (e.g. "02_Ri"), it is a track code, NOT an artist!
      if (/^\d+[_ -]/.test(parts[1])) {
        songTitle = base;
        artist = '';
      } else {
        songTitle = parts[0].trim();
        artist = parts[1].trim();
      }
    }
  } else {
    // Check if separated by underscores with artist (e.g. Artist_-_Title)
    const underscoreParts = base.split('_-_');
    if (underscoreParts.length === 2) {
      songTitle = underscoreParts[0].trim();
      artist = underscoreParts[1].trim();
    }
  }

  // NOTE: Underscores like '02_Ri' or 'Take_01' are preserved 100% as intended by the user.

  return {
    trackNumber,
    songTitle: sanitizeFilenamePart(songTitle || (trackNumber ? `Faixa ${trackNumber}` : 'Faixa')),
    artist: sanitizeFilenamePart(artist),
  };
}

export interface MasterExportParams {
  trackNumber?: string;
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
 * Example with catalog code (no track number prefix):
 * "40.070 - 02_Ri - AT_44.1kHz_24bit_-14LUFS.wav"
 */
export function buildMasterWavFilename(params: MasterExportParams): string {
  const rawNum = params.trackNumber?.trim();
  const numPrefix = rawNum ? `${rawNum.padStart(2, '0')}_` : '';
  const title = sanitizeFilenamePart(params.songTitle || 'Faixa');
  const artist = params.artist ? sanitizeFilenamePart(params.artist) : '';
  const rateKhz = formatSampleRateKhz(params.sampleRate);
  const bit = `${params.bitDepth || 24}bit`;
  const lufs = formatLufsString(params.targetLufs);
  const suffix = params.suffix || '';

  // Avoid duplicate track number prefix if title already starts with it
  const cleanTitle = (numPrefix && title.startsWith(numPrefix))
    ? title.substring(numPrefix.length)
    : title;

  const artistPart = artist ? ` - ${artist}` : '';
  return `${numPrefix}${cleanTitle}${artistPart} - AT_${rateKhz}_${bit}_${lufs}${suffix}.wav`;
}

/**
 * Builds standard Azimuth-Only Preservation WAV export name:
 * [número da faixa]_[Nome da Musica] - [Nome do cantor se houver] - AT_Azimute_[taxa em Khz_Bit].wav
 */
export function buildAzimuthWavFilename(
  params: Omit<MasterExportParams, 'targetLufs'>
): string {
  const rawNum = params.trackNumber?.trim();
  const numPrefix = rawNum ? `${rawNum.padStart(2, '0')}_` : '';
  const title = sanitizeFilenamePart(params.songTitle || 'Faixa');
  const artist = params.artist ? sanitizeFilenamePart(params.artist) : '';
  const rateKhz = formatSampleRateKhz(params.sampleRate);
  const bit = `${params.bitDepth || 24}bit`;
  const suffix = params.suffix || '';

  const cleanTitle = (numPrefix && title.startsWith(numPrefix))
    ? title.substring(numPrefix.length)
    : title;

  const artistPart = artist ? ` - ${artist}` : '';
  return `${numPrefix}${cleanTitle}${artistPart} - AT_Azimute_${rateKhz}_${bit}${suffix}.wav`;
}

/**
 * Builds standard Dropout-Restored Archival Preservation WAV export name:
 * [número da faixa]_[Nome da Musica] - [Nome do cantor se houver] - AT_DropoutRestaurado_[taxa em Khz_Bit].wav
 */
export function buildDropoutWavFilename(
  params: Omit<MasterExportParams, 'targetLufs'>
): string {
  const rawNum = params.trackNumber?.trim();
  const numPrefix = rawNum ? `${rawNum.padStart(2, '0')}_` : '';
  const title = sanitizeFilenamePart(params.songTitle || 'Faixa');
  const artist = params.artist ? sanitizeFilenamePart(params.artist) : '';
  const rateKhz = formatSampleRateKhz(params.sampleRate);
  const bit = `${params.bitDepth || 24}bit`;
  const suffix = params.suffix || '';

  const cleanTitle = (numPrefix && title.startsWith(numPrefix))
    ? title.substring(numPrefix.length)
    : title;

  const artistPart = artist ? ` - ${artist}` : '';
  return `${numPrefix}${cleanTitle}${artistPart} - AT_DropoutRestaurado_${rateKhz}_${bit}${suffix}.wav`;
}

/**
 * Builds standard Pre-Master Restored Archival WAV export name (Azimuth + Dropouts corrected, WITHOUT final mastering):
 * [número da faixa]_[Nome da Musica] - [Nome do cantor se houver] - AT_PreMaster_Restaurado_[taxa em Khz_Bit].wav
 */
export function buildPreMasterWavFilename(
  params: Omit<MasterExportParams, 'targetLufs'>
): string {
  const rawNum = params.trackNumber?.trim();
  const numPrefix = rawNum ? `${rawNum.padStart(2, '0')}_` : '';
  const title = sanitizeFilenamePart(params.songTitle || 'Faixa');
  const artist = params.artist ? sanitizeFilenamePart(params.artist) : '';
  const rateKhz = formatSampleRateKhz(params.sampleRate);
  const bit = `${params.bitDepth || 24}bit`;
  const suffix = params.suffix || '';

  const cleanTitle = (numPrefix && title.startsWith(numPrefix))
    ? title.substring(numPrefix.length)
    : title;

  const artistPart = artist ? ` - ${artist}` : '';
  return `${numPrefix}${cleanTitle}${artistPart} - AT_PreMaster_Restaurado_${rateKhz}_${bit}${suffix}.wav`;
}

/**
 * Builds standard Recall Preset (.aurapreset) export name:
 * [número da faixa]_[Nome da Musica] - [Nome do cantor se houver] - AT_[taxa em Khz_Bit]_[Lufs]_Recall.aurapreset
 */
export function buildRecallFilename(params: MasterExportParams): string {
  const rawNum = params.trackNumber?.trim();
  const numPrefix = rawNum ? `${rawNum.padStart(2, '0')}_` : '';
  const title = sanitizeFilenamePart(params.songTitle || 'Faixa');
  const artist = params.artist ? sanitizeFilenamePart(params.artist) : '';
  const rateKhz = formatSampleRateKhz(params.sampleRate);
  const bit = `${params.bitDepth || 24}bit`;
  const lufs = formatLufsString(params.targetLufs);
  const suffix = params.suffix || '';

  const cleanTitle = (numPrefix && title.startsWith(numPrefix))
    ? title.substring(numPrefix.length)
    : title;

  const artistPart = artist ? ` - ${artist}` : '';
  return `${numPrefix}${cleanTitle}${artistPart} - AT_${rateKhz}_${bit}_${lufs}_Recall${suffix}.aurapreset`;
}
