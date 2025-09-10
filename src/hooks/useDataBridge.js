import { useCallback, useState } from 'react';

const useDataBridge = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAction = async (action, ...args) => {
    if (!window.electronAPI) {
      const err = new Error('electronAPI is not available.');
      setError(err);
      throw err;
    }

    setIsLoading(true);
    setError(null);
    try {
      return await action(...args);
    } catch (err) {
      console.error('Data Bridge Error:', err);
      setError(err);
      throw err; // Re-throw para que o componente possa tratar
    } finally {
      setIsLoading(false);
    }
  };

  const selectVault = useCallback(() => handleAction(window.electronAPI.selectVault), []);
  const loadVault = useCallback((vaultPath) => handleAction(window.electronAPI.loadVault, vaultPath), []);
  const saveNote = useCallback((vaultPath, note) => handleAction(window.electronAPI.saveNote, vaultPath, note), []);
  const createFolder = useCallback((vaultPath, folderName) => handleAction(window.electronAPI.createFolder, vaultPath, folderName), []);
  const renameFolder = useCallback((vaultPath, oldName, newName) => handleAction(window.electronAPI.renameFolder, vaultPath, oldName, newName), []);
  const deleteFolder = useCallback((vaultPath, folderId, notes) => handleAction(window.electronAPI.deleteFolder, vaultPath, folderId, notes), []);
  const deleteNotePermanently = useCallback((vaultPath, noteId) => handleAction(window.electronAPI.deleteNotePermanently, vaultPath, noteId), []);
  
  // CORREÇÃO: Adicionada a função recoverNote que estava faltando
  const recoverNote = useCallback((vaultPath, noteId, targetFolderId) => handleAction(window.electronAPI.recoverNote, vaultPath, noteId, targetFolderId), []);

  // CORREÇÃO: Adicionada a função saveImageFile que estava faltando
  const saveImageFile = useCallback((vaultPath, file) => handleAction(window.electronAPI.saveImageFile, vaultPath, file), []);

  // Funções de import/export mantidas
  const openMarkdownFile = useCallback(() => handleAction(window.electronAPI.openMarkdownFile), []);
  const saveMarkdownFile = useCallback((path, content) => handleAction(window.electronAPI.saveMarkdownFile, path, content), []);

  return {
    isLoading,
    error,
    selectVault,
    loadVault,
    saveNote,
    createFolder,
    renameFolder,
    deleteFolder,
    deleteNotePermanently,
    recoverNote, // Adicionado
    saveImageFile, // Adicionado
    openMarkdownFile,
    saveMarkdownFile,
  };
};

export default useDataBridge;