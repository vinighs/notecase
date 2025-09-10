const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Funções do Vault
  selectVault: () => ipcRenderer.invoke('select-vault'),
  loadVault: (vaultPath) => ipcRenderer.invoke('load-vault', vaultPath),
  saveNote: (vaultPath, note) => ipcRenderer.invoke('save-note', vaultPath, note),
  createFolder: (vaultPath, folderName) => ipcRenderer.invoke('create-folder', vaultPath, folderName),
  renameFolder: (vaultPath, oldName, newName) => ipcRenderer.invoke('rename-folder', vaultPath, oldName, newName),
  deleteFolder: (vaultPath, folderId, notesInFolder) => ipcRenderer.invoke('delete-folder', vaultPath, folderId, notesInFolder),
  deleteNotePermanently: (vaultPath, noteId) => ipcRenderer.invoke('delete-note-permanently', vaultPath, noteId),

  
  // NOVA FUNÇÃO: Recuperar nota da lixeira
  recoverNote: (vaultPath, noteId, targetFolderId) => ipcRenderer.invoke('recover-note', vaultPath, noteId, targetFolderId),

  // Funções de import/export (mantidas)
  openMarkdownFile: () => ipcRenderer.invoke('dialog:openMarkdownFile'),
  saveMarkdownFile: (defaultPath, content) => ipcRenderer.invoke('dialog:saveMarkdownFile', defaultPath, content),
  saveImageFile: async (vaultPath, file) => ipcRenderer.invoke('save-image-file', vaultPath, file),
  joinPath: (...args) => ipcRenderer.invoke('join-path', ...args),
  resolveImagePath: (vaultPath, imagePath) => ipcRenderer.invoke('resolve-image-path', vaultPath, imagePath),

  // Função para abrir links externos (envia para o main process)
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),

  // Listener para atualizações (exemplo)
  on: (channel, callback) => {
    const validChannels = ['vault-changed']; // Adicione canais válidos aqui
    if (validChannels.includes(channel)) {
      // Deliberadamente não expondo o objeto 'event' para o renderer
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  removeListener: (channel, callback) => {
      ipcRenderer.removeListener(channel, callback);
  }
});