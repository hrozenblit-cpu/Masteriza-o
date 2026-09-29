import JSZip from 'jszip';

/**
 * Auto-Save & Output Directory Manager
 *
 * Implements the browser File System Access API (showDirectoryPicker & showSaveFilePicker)
 * to automatically save processed files into a dedicated subfolder (e.g., "Tapes_Processados_AuraTune")
 * inside the user's chosen folder on their computer.
 *
 * Provides:
 * 1. Direct write to the user's selected folder (no popups)
 * 2. Persistent folder handle using IndexedDB across sessions
 * 3. Native "Salvar Como" dialog (showSaveFilePicker) when no base directory is selected,
 *    allowing the user to choose the exact folder on their computer
 * 4. Fallback to automated ZIP creation with internal subfolder structure
 */

// Extend window interface for File System Access API
declare global {
  interface FileSystemHandle {
    queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
    requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  }
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: string;
    }) => Promise<FileSystemDirectoryHandle>;
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      startIn?: string;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
  }
}

export function isInsideIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

// IndexedDB Helper for Storing and Restoring Directory Handles
const DB_NAME = 'auratune_fs_db';
const STORE_NAME = 'handles';

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeHandle(key: string, handle: FileSystemHandle): Promise<void> {
  try {
    const db = await openHandleDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, key);
  } catch (err) {
    console.warn('Não foi possível persistir handle no IndexedDB:', err);
  }
}

async function getStoredHandle(key: string): Promise<FileSystemHandle | null> {
  try {
    const db = await openHandleDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    return new Promise((resolve) => {
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export interface AutoSaveConfig {
  enabled: boolean;
  subfolderName: string;
  saveAzimuthCorrected: boolean; // Also save the clean azimuth-corrected archival copy
  saveFinalMaster: boolean;      // Save the final mastered file
  autoSaveOnBatchComplete: boolean;
  saveRecallPresets?: boolean;    // Save .aurapreset recall files for each track
}

export type FolderConflictAction = 'new_timestamp_folder' | 'overwrite' | 'keep_both_v2';

export interface FolderCheckResult {
  hasConflict: boolean;
  baseDirName: string;
  subfolderName: string;
  fileCount: number;
  existingFileNames: string[];
}

export class AutoSaveManager {
  private baseDirHandle: FileSystemDirectoryHandle | null = null;
  private subDirHandle: FileSystemDirectoryHandle | null = null;
  private baseDirName: string = '';
  private config: AutoSaveConfig = {
    enabled: false,
    subfolderName: 'Tapes_Processados_AuraTune',
    saveAzimuthCorrected: true,
    saveFinalMaster: true,
    autoSaveOnBatchComplete: true,
    saveRecallPresets: true,
  };

  constructor() {
    // Restore saved folder name from localStorage if available
    try {
      const savedConfig = localStorage.getItem('auratune_autosave_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.config, ...parsed };
      }
      const savedDirName = localStorage.getItem('auratune_last_dir_name');
      if (savedDirName) {
        this.baseDirName = savedDirName;
      }
    } catch {
      // safe fallback
    }

    // Attempt to restore handle asynchronously from IndexedDB
    this.tryRestoreDirectory().catch(() => {});
  }

  public isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
  }

  public getConfig(): AutoSaveConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem('auratune_autosave_config', JSON.stringify(this.config));
    } catch {
      // safe ignore
    }
  }

  public getBaseDirName(): string {
    return this.baseDirName;
  }

  public getSubfolderName(): string {
    return this.config.subfolderName;
  }

  public hasSelectedDirectory(): boolean {
    return this.baseDirHandle !== null && this.subDirHandle !== null;
  }

  /**
   * Checks whether the target subfolder already exists inside the user's selected base directory
   * and counts any pre-existing files to warn the user before overwriting.
   */
  public async checkSubfolderConflict(customSubfolder?: string): Promise<FolderCheckResult> {
    const targetSub = customSubfolder || this.config.subfolderName;
    if (!this.baseDirHandle) {
      return {
        hasConflict: false,
        baseDirName: this.baseDirName || 'Downloads',
        subfolderName: targetSub,
        fileCount: 0,
        existingFileNames: [],
      };
    }

    try {
      // Query subfolder handle without creating it
      const subHandle = await this.baseDirHandle.getDirectoryHandle(targetSub, { create: false });
      const existingFileNames: string[] = [];

      // Check for files inside
      const iterableHandle = subHandle as unknown as { values?: () => AsyncIterable<FileSystemHandle> };
      if (typeof iterableHandle.values === 'function') {
        for await (const entry of iterableHandle.values()) {
          if (entry.kind === 'file') {
            existingFileNames.push(entry.name);
          }
        }
      }

      if (existingFileNames.length > 0) {
        return {
          hasConflict: true,
          baseDirName: this.baseDirName,
          subfolderName: targetSub,
          fileCount: existingFileNames.length,
          existingFileNames,
        };
      }
    } catch {
      // Subfolder does not exist yet; safe to proceed with no conflict
    }

    return {
      hasConflict: false,
      baseDirName: this.baseDirName,
      subfolderName: targetSub,
      fileCount: 0,
      existingFileNames: [],
    };
  }

  /**
   * Resolves a folder conflict based on user's choice:
   * 1. 'new_timestamp_folder' -> Creates a fresh subfolder with timestamp (e.g. Tapes_Processados_AuraTune_2026-09-29_11h30)
   * 2. 'overwrite' -> Keeps existing subfolder, writes over existing files
   * 3. 'keep_both_v2' -> Keeps existing subfolder, returns '_v2' suffix for new files
   */
  public async applyFolderConflictResolution(
    action: FolderConflictAction,
    baseSubfolderName?: string
  ): Promise<{ finalSubfolderName: string; renameSuffix: string }> {
    const baseSub = baseSubfolderName || this.config.subfolderName;

    if (action === 'new_timestamp_folder') {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timePart = `${pad(now.getHours())}h${pad(now.getMinutes())}`;
      const newSubName = `${baseSub}_${datePart}_${timePart}`;

      this.updateConfig({ subfolderName: newSubName });
      if (this.baseDirHandle) {
        this.subDirHandle = await this.baseDirHandle.getDirectoryHandle(newSubName, { create: true });
      }
      return { finalSubfolderName: newSubName, renameSuffix: '' };
    }

    if (action === 'keep_both_v2') {
      if (this.baseDirHandle) {
        this.subDirHandle = await this.baseDirHandle.getDirectoryHandle(baseSub, { create: true });
      }
      return { finalSubfolderName: baseSub, renameSuffix: '_v2' };
    }

    // Default 'overwrite'
    if (this.baseDirHandle) {
      this.subDirHandle = await this.baseDirHandle.getDirectoryHandle(baseSub, { create: true });
    }
    return { finalSubfolderName: baseSub, renameSuffix: '' };
  }

  /**
   * Attempts to restore directory handle from IndexedDB
   */
  public async tryRestoreDirectory(): Promise<boolean> {
    try {
      const handle = (await getStoredHandle('output_dir')) as FileSystemDirectoryHandle | null;
      if (handle) {
        const perm = handle.queryPermission ? await handle.queryPermission({ mode: 'readwrite' }) : 'prompt';
        if (perm === 'granted') {
          this.baseDirHandle = handle;
          this.baseDirName = handle.name;
          this.subDirHandle = await handle.getDirectoryHandle(this.config.subfolderName, {
            create: true,
          });
          this.config.enabled = true;
          return true;
        }
      }
    } catch (err) {
      console.warn('Erro ao restaurar diretório salvo:', err);
    }
    return false;
  }

  /**
   * Prompts user to pick the directory (e.g. folder containing the 1/4" tape digitizations)
   */
  public async selectOutputDirectory(): Promise<{
    success: boolean;
    dirName: string;
    isIframeBlocked?: boolean;
    error?: string;
  }> {
    if (!this.isFileSystemAccessSupported()) {
      return {
        success: false,
        dirName: '',
        error:
          'Seu navegador atual não suporta a API de Pastas. Utilize o Google Chrome, Edge ou Opera em janela própria, ou utilize o salvamento com escolha de pasta no momento do download.',
      };
    }

    try {
      const handle = await window.showDirectoryPicker!({
        mode: 'readwrite',
      });

      this.baseDirHandle = handle;
      this.baseDirName = handle.name;

      // Create or get the subfolder (e.g., "Tapes_Processados_AuraTune") inside the user's selected folder
      this.subDirHandle = await handle.getDirectoryHandle(this.config.subfolderName, {
        create: true,
      });

      this.config.enabled = true;

      try {
        localStorage.setItem('auratune_last_dir_name', handle.name);
        await storeHandle('output_dir', handle);
      } catch {
        // safe ignore
      }

      return { success: true, dirName: handle.name };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, dirName: '', error: 'Seleção de pasta cancelada pelo usuário.' };
      }

      const inIframe = isInsideIframe();
      const isSecurityError =
        err instanceof Error &&
        (err.name === 'SecurityError' ||
          err.message.toLowerCase().includes('cross origin') ||
          err.message.toLowerCase().includes('sub frame') ||
          err.message.toLowerCase().includes('frame') ||
          err.message.toLowerCase().includes('gesture') ||
          err.message.toLowerCase().includes('permission') ||
          err.message.toLowerCase().includes('allowed'));

      if (inIframe || isSecurityError) {
        return {
          success: false,
          dirName: '',
          isIframeBlocked: true,
          error:
            'Por segurança, os navegadores (Chrome/Edge) bloqueiam a seleção direta de pastas quando o aplicativo está embutido em um frame (preview). Para gravar diretamente nas pastas do seu computador, abra o AuraTune em uma aba própria, ou utilize a caixa de diálogo de salvamento.',
        };
      }

      return {
        success: false,
        dirName: '',
        error: err instanceof Error ? err.message : 'Não foi possível acessar a pasta selecionada.',
      };
    }
  }

  /**
   * Bundles an array of files into a clean ZIP archive with the designated subfolder structure
   */
  public async createZipPackage(
    files: Array<{ filename: string; blob: Blob }>,
    customSubfolder?: string
  ): Promise<Blob> {
    const zip = new JSZip();
    const folderName = customSubfolder || this.config.subfolderName;
    const folder = zip.folder(folderName) || zip;

    for (const file of files) {
      folder.file(file.filename, file.blob);
    }

    return await zip.generateAsync({
      type: 'blob',
      compression: 'STORE', // Fast, zero loss, perfect for studio-grade audio
    });
  }

  /**
   * Helper to trigger a standard browser download
   */
  public triggerBrowserDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  /**
   * Saves a ZIP file directly into the user's chosen folder on disk,
   * or prompts the user via showSaveFilePicker to choose the exact folder on their computer.
   */
  public async saveZipFile(
    zipBlob: Blob,
    suggestedFilename: string
  ): Promise<{ savedToDiskDirectly: boolean; targetPath: string; error?: string }> {
    // 1. If base directory handle is connected, save directly into the chosen folder on disk!
    if (this.baseDirHandle) {
      try {
        const fileHandle = await this.baseDirHandle.getFileHandle(suggestedFilename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(zipBlob);
        await writable.close();

        return {
          savedToDiskDirectly: true,
          targetPath: `${this.baseDirName}/${suggestedFilename}`,
        };
      } catch (err) {
        console.warn('Erro ao gravar ZIP na pasta vinculada:', err);
      }
    }

    // 2. If no directory handle is active, open the native OS "Salvar Como" dialog
    // so the user can choose the exact folder on their computer!
    if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function' && !isInsideIframe()) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: suggestedFilename,
          types: [
            {
              description: 'Arquivo ZIP com subpasta criada',
              accept: { 'application/zip': ['.zip'] },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(zipBlob);
        await writable.close();

        return {
          savedToDiskDirectly: true,
          targetPath: fileHandle.name,
        };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return {
            savedToDiskDirectly: false,
            targetPath: '',
            error: 'Salvamento cancelado.',
          };
        }
      }
    }

    // 3. Fallback: Browser download trigger
    this.triggerBrowserDownload(zipBlob, suggestedFilename);

    return {
      savedToDiskDirectly: false,
      targetPath: `Downloads/${suggestedFilename}`,
    };
  }

  /**
   * Automatically saves a processed WAV blob into the designated subfolder,
   * or prompts the user to choose the folder via showSaveFilePicker, or falls back to download.
   */
  public async saveProcessedFile(
    blob: Blob,
    suggestedFilename: string
  ): Promise<{ savedToDiskDirectly: boolean; targetPath: string }> {
    // 1. If Directory Handle is active, write straight to the subfolder on disk!
    if (this.subDirHandle && this.config.enabled) {
      try {
        // Ensure subfolder handle is fresh if subfolder name changed
        if (this.baseDirHandle) {
          this.subDirHandle = await this.baseDirHandle.getDirectoryHandle(this.config.subfolderName, {
            create: true,
          });
        }

        const fileHandle = await this.subDirHandle.getFileHandle(suggestedFilename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        return {
          savedToDiskDirectly: true,
          targetPath: `${this.baseDirName}/${this.config.subfolderName}/${suggestedFilename}`,
        };
      } catch (err) {
        console.warn('Erro ao salvar direto no FileSystem, tentando save file picker:', err);
      }
    }

    // 2. If no directory handle is active, open native OS "Salvar Como" dialog so user can choose the folder!
    if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function' && !isInsideIframe()) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: suggestedFilename,
          types: [
            {
              description: 'Arquivo de Áudio WAV',
              accept: { 'audio/wav': ['.wav'] },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        return {
          savedToDiskDirectly: true,
          targetPath: fileHandle.name,
        };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return {
            savedToDiskDirectly: false,
            targetPath: '',
          };
        }
      }
    }

    // 3. Fallback: Browser download trigger
    this.triggerBrowserDownload(blob, suggestedFilename);

    return {
      savedToDiskDirectly: false,
      targetPath: `Downloads/${suggestedFilename}`,
    };
  }

  /**
   * Automatically saves a text/JSON string (such as an .aurapreset recall file)
   * into the active subfolder or prompts the user via save file picker.
   */
  public async saveTextFile(
    content: string,
    suggestedFilename: string
  ): Promise<{ savedToDiskDirectly: boolean; targetPath: string }> {
    const blob = new Blob([content], { type: 'application/json' });
    return this.saveProcessedFile(blob, suggestedFilename);
  }
}

export const autoSaveManager = new AutoSaveManager();
