const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const yaml = require('js-yaml');
const log = require('electron-log');

let mainWindow;

log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs', 'main.log');
log.info('App starting...');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 370,
    minHeight: 600,
    title: 'Something to Note',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.setAutoHideMenuBar(true);
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- Handlers IPC para o Vault ---

ipcMain.handle('select-vault', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select or Create a Vault',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select Vault',
  });
  if (canceled || filePaths.length === 0) return null;
  const vaultPath = filePaths[0];
  await fs.mkdir(path.join(vaultPath, 'trash'), { recursive: true });
  return vaultPath;
});

const readNotesFromDirectory = async (directoryPath, folderId) => {
    const notes = [];
    try {
        const files = await fs.readdir(directoryPath);
        for (const file of files) {
            if (file.endsWith('.md')) {
                const filePath = path.join(directoryPath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
                if (match) {
                    const yamlData = yaml.load(match[1]);
                    notes.push({
                        id: yamlData.id || path.basename(file, '.md'),
                        title: yamlData.title || path.basename(file, '.md').replace(/-/g, ' '),
                        content: match[2] || '',
                        folderId: folderId,
                        createdAt: yamlData.createdAt,
                        modifiedAt: yamlData.modifiedAt,
                        tags: yamlData.tags || [],
                        previousFolderId: yamlData.previousFolderId,
                    });
                }
            }
        }
    } catch (readErr) {
        if (readErr.code !== 'ENOENT') {
            log.error(`Failed to read directory ${directoryPath}:`, readErr);
        }
    }
    return notes;
};

ipcMain.handle('load-vault', async (event, vaultPath) => {
  try {
    const folders = [
      { id: 'all', name: 'All Notes', system: true, color: '#EBB800' },
      { id: 'trash', name: 'Recently Deleted', system: true, color: '#EBB800' },
    ];
    let notes = [];

    const dirents = await fs.readdir(vaultPath, { withFileTypes: true });

    // Carrega pastas e notas de subdiretÃ³rios
    for (const dirent of dirents) {
      if (dirent.isDirectory() && dirent.name !== 'trash' && dirent.name !== 'all') {
        folders.push({ id: dirent.name, name: dirent.name, system: false, color: '#EBB800' });
        const folderNotes = await readNotesFromDirectory(path.join(vaultPath, dirent.name), dirent.name);
        notes.push(...folderNotes);
      }
    }

    // Carrega notas da raiz (para a pasta 'all')
    const rootNotes = await readNotesFromDirectory(vaultPath, 'all');
    notes.push(...rootNotes);

    // Carrega notas da lixeira
    const trashNotes = await readNotesFromDirectory(path.join(vaultPath, 'trash'), 'trash');
    notes.push(...trashNotes);

    return { notes, folders };
  } catch (error) {
    log.error("Failed to load vault:", error);
    if (error.code === "ENOENT") {
      throw new Error(
        `The vault folder at "${vaultPath}" could not be found. It may have been moved or deleted.`
      );
    }
    // For other errors, re-throw a generic message.
    throw new Error(`Failed to load vault: ${error.message}`);
  }
});

ipcMain.handle('save-note', async (event, vaultPath, note) => {
    try {
        // Define o caminho da pasta de destino. 'all' vai para a raiz.
        const targetFolder = note.folderId === 'all' ? '' : note.folderId;
        const folderPath = path.join(vaultPath, targetFolder);
        await fs.mkdir(folderPath, { recursive: true });

        const filePath = path.join(folderPath, `${note.id}.md`);

        // Define o caminho da pasta anterior para exclusÃ£o.
        const sourceFolder = note.previousFolderId === 'all' ? '' : note.previousFolderId;
        const oldFilePath = note.previousFolderId ? path.join(vaultPath, sourceFolder, `${note.id}.md`) : null;

        // Se a nota foi movida, remove o arquivo antigo
        if (oldFilePath && oldFilePath !== filePath && (await fs.access(oldFilePath).then(() => true).catch(() => false))) {
             await fs.unlink(oldFilePath);
        }

        const yamlData = {
            id: note.id,
            title: note.title || 'Untitled Note',
            tags: note.tags || [],
            createdAt: note.createdAt,
            modifiedAt: note.modifiedAt,
            previousFolderId: note.previousFolderId,
        };
        const content = `---\n${yaml.dump(yamlData)}---\n${note.content || ''}`;
        await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
        log.error('Failed to save note:', error);
        throw new Error(`Failed to save note: ${error.message}`);
    }
});

ipcMain.handle('create-folder', async (event, vaultPath, folderName) => {
  try {
    const newFolderPath = path.join(vaultPath, folderName);
    await fs.mkdir(newFolderPath, { recursive: true });
    return { id: folderName, name: folderName, system: false, color: '#EBB800' };
  } catch (error) {
    log.error('Failed to create folder:', error);
    throw new Error(`Failed to create folder: ${error.message}`);
  }
});

ipcMain.handle('rename-folder', async (event, vaultPath, oldName, newName) => {
    try {
        const oldPath = path.join(vaultPath, oldName);
        const newPath = path.join(vaultPath, newName);
        await fs.rename(oldPath, newPath);
    } catch (error) {
        log.error('Failed to rename folder:', error);
        throw new Error(`Failed to rename folder: ${error.message}`);
    }
});

ipcMain.handle('delete-folder', async (event, vaultPath, folderId, notesInFolder) => {
    try {
        const trashPath = path.join(vaultPath, 'trash');
        const folderPath = path.join(vaultPath, folderId);

        for (const note of notesInFolder) {
            const oldNotePath = path.join(folderPath, `${note.id}.md`);
            const newNotePath = path.join(trashPath, `${note.id}.md`);
            if (await fs.access(oldNotePath).then(() => true).catch(() => false)) {
                await fs.rename(oldNotePath, newNotePath);
            }
        }

        await fs.rmdir(folderPath);
    } catch (error) {
        log.error('Failed to delete folder:', error);
        throw new Error(`Failed to delete folder: ${error.message}`);
    }
});

ipcMain.handle('delete-note-permanently', async (event, vaultPath, noteId) => {
  try {
    const filePath = path.join(vaultPath, 'trash', `${noteId}.md`);

    // Verifica se o arquivo existe
    const exists = await fs.access(filePath).then(() => true).catch(() => false);

    if (!exists) {
      log.warn(`Permanent delete failed: file not found at ${filePath}`);
      return { success: false, message: 'File not found in trash' };
    }

    // Remove o arquivo
    await fs.unlink(filePath);
    log.info(`Permanently deleted note from trash: ${filePath}`);

    return { success: true };
  } catch (error) {
    log.error(`Failed to permanently delete note ${noteId}:`, error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('recover-note', async (event, vaultPath, noteId, targetFolderId) => {
    try {
        const trashPath = path.join(vaultPath, 'trash', `${noteId}.md`);
        const targetFolder = targetFolderId === 'all' ? '' : targetFolderId;
        const targetPath = path.join(vaultPath, targetFolder, `${noteId}.md`);

        // Verifica se o arquivo existe na trash
        const trashExists = await fs.access(trashPath).then(() => true).catch(() => false);
        if (!trashExists) {
            throw new Error('Note not found in trash');
        }

        // Cria pasta de destino se necessÃ¡rio
        await fs.mkdir(path.dirname(targetPath), { recursive: true });

        // Move (renomeia) o arquivo da trash para o destino
        await fs.rename(trashPath, targetPath);
        
        log.info(`Recovered note from trash: ${trashPath} -> ${targetPath}`);
        return { success: true };
    } catch (error) {
        log.error('Failed to recover note:', error);
        throw new Error(`Failed to recover note: ${error.message}`);
    }
});

ipcMain.handle('join-path', async (event, ...args) => {
  return path.join(...args);
});

ipcMain.handle('save-image-file', async (event, vaultPath, fileData) => {
  try {
    if (!vaultPath) {
      throw new Error('Vault path is not defined.');
    }

    const assetsDir = path.join(vaultPath, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    const timestamp = Date.now();
    const fileExtension = path.extname(fileData.name);
    const uniqueFileName = `${path.basename(fileData.name, fileExtension)}_${timestamp}${fileExtension}`;
    const filePath = path.join(assetsDir, uniqueFileName);

    const buffer = Buffer.from(fileData.buffer);
    await fs.writeFile(filePath, buffer);

    // âœ… Retorna o caminho relativo
    const relativePath = `assets/${uniqueFileName}`;
    log.info(`Image saved: ${filePath}, returning relative path: ${relativePath}`);
    return relativePath;

  } catch (error) {
    log.error('Failed to save image file:', error);
    throw new Error(`Failed to save image file: ${error.message}`);
  }
});

ipcMain.handle('resolve-image-path', async (event, vaultPath, imagePath) => {
  try {
    const fullPath = path.join(vaultPath, imagePath);
    // Verificar se o arquivo existe
    const exists = await fs.access(fullPath).then(() => true).catch(() => false);
    if (!exists) {
      throw new Error(`Image file not found: ${fullPath}`);
    }
    return `file://${fullPath.replace(/\\/g, '/')}`;
  } catch (error) {
    log.error('Failed to resolve image path:', error);
    throw error;
  }
});

// Handler para abrir links externos de forma segura
ipcMain.on('open-external-link', (event, url) => {
  log.info(`Opening external link: ${url}`);
  shell.openExternal(url);
});