import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from './layouts/MainLayout';
import { AppProvider } from './context/AppContext';
import { generateUUID } from './services/uiHelper';
import useDataBridge from './hooks/useDataBridge';
import { convertMarkdownToPlainText, extractTagsFromString, extractTitleFromContent } from './services/textProcessor';
import Modal from './components/Modal';
import Button from './components/Button';
import OnboardingModal from './components/OnboardingModal';
import RenameFolderModal from './components/RenameFolderModal';
import LoadingScreen from './components/LoadingScreen';



const App = () => {
  const {
    isLoading,
    error,
    selectVault,
    loadVault,
    saveNote,
    createFolder,
    renameFolder,
    deleteFolder,
    deleteNotePermanently,
  } = useDataBridge();

  const [vaultPath, setVaultPath] = useState(localStorage.getItem('vaultPath') || null);
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('all');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', body: '' });
  const [isRenameModalOpen, setRenameModalOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState(null);

  // --- Efeitos de Inicialização e Carregamento ---

  const handleSelectVault = useCallback(async () => {
    try {
      const path = await selectVault();
      if (path) {
        localStorage.setItem('vaultPath', path);
        setVaultPath(path);
      } else {
        // Opcional: Tratar caso o usuário cancele a seleção
        setModalContent({ title: 'Vault Required', body: 'You must select a vault to use the application.' });
        setShowModal(true);
      }
    } catch (err) {
      setModalContent({ title: 'Error', body: `Failed to select vault: ${err.message}` });
      setShowModal(true);
    }
  }, [selectVault]);

  useEffect(() => {
    if (!vaultPath) {
      setIsAppLoading(false);
      return;
    }

    const initializeApp = async () => {
      setIsAppLoading(true);
      try {
        const { notes: loadedNotes, folders: loadedFolders } = await loadVault(vaultPath);
        setNotes(loadedNotes.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt)));
        setFolders(loadedFolders);
      } catch (err) {
        setModalContent({ title: 'Error Loading Vault', body: `Could not load data from the vault. ${err.message}` });
        setShowModal(true);
        // Oferece a opção de escolher outro vault
        setVaultPath(null);
        localStorage.removeItem('vaultPath');
      } finally {
        setIsAppLoading(false);
      }
    };

    initializeApp();
  }, [vaultPath, loadVault]);

  // Efeito para lidar com o salvamento forçado
  useEffect(() => {
    const handleForceSave = () => {
      if (!selectedNoteId) return;

      const noteToSave = notes.find(n => n.id === selectedNoteId);
      if (noteToSave) {
        console.log('Force saving note:', noteToSave.id);
        // A função handleUpdateNoteContent já contém a lógica de conversão e salvamento.
        // Apenas precisamos garantir que ela use o conteúdo mais recente do estado.
        // O estado já foi atualizado pelo Lexical, então podemos chamar saveNote diretamente.
        saveNote(vaultPath, noteToSave);
      }
    };

    window.addEventListener('force-save-note', handleForceSave);

    return () => window.removeEventListener('force-save-note', handleForceSave);
  }, [notes, selectedNoteId, vaultPath, saveNote]);

  // --- Manipulação de Notas ---

  const handleCreateNote = () => {
    const newNote = {
      id: generateUUID(),
      title: 'Untitled Note',
      content: '',
      folderId: selectedFolderId === 'trash' || selectedFolderId === 'all' ? 'all' : selectedFolderId,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      tags: [],
    };

    // Adiciona a nota ao estado e a salva no disco
    setNotes(prev => [newNote, ...prev].sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt)));
    setSelectedNoteId(newNote.id);
    saveNote(vaultPath, { ...newNote, folderId: newNote.folderId === 'all' ? '' : newNote.folderId }); // Salva na raiz se for 'all'
  };

  const handleUpdateNoteContent = useCallback((noteId, newContent) => {
  setNotes(prev => {
    const plainText = convertMarkdownToPlainText(newContent);
    const extractedTitle = extractTitleFromContent(newContent, 80); // Extrai título automaticamente
    
    const newNotes = prev.map(note =>
      note.id === noteId
        ? { 
            ...note, 
            content: newContent, 
            title: extractedTitle || 'Untitled Note', // Usa o título extraído ou fallback
            tags: extractTagsFromString(plainText), 
            modifiedAt: new Date().toISOString() 
          }
        : note
    );
    
    // Encontra a nota atualizada para salvar
    const updatedNote = newNotes.find(n => n.id === noteId);
    if (updatedNote) saveNote(vaultPath, updatedNote);

    return newNotes.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  });
}, [vaultPath, saveNote]);

const handleDeleteNote = async (noteId) => {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  // **CORREÇÃO: Força o salvamento imediato antes da exclusão**
  // Verifica se há conteúdo pendente no editor que precisa ser salvo
  if (selectedNoteId === noteId && window.editorAPI?.getCurrentContent) {
    try {
      const currentContent = await window.editorAPI.getCurrentContent();
      if (currentContent && currentContent !== note.content) {
        // Atualiza a nota no estado com o conteúdo atual
        const updatedNote = {
          ...note,
          content: currentContent,
          modifiedAt: new Date().toISOString()
        };
        
        // Salva imediatamente no disco
        await saveNote(vaultPath, updatedNote);
        
        // Atualiza o estado local
        setNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n));
        
        // Usa a nota atualizada para o resto da operação
        note.content = currentContent;
      }
    } catch (error) {
      console.warn('Could not get current editor content:', error);
    }
  }

  if (note.folderId === 'trash') {
    // Exclusão permanente
    const result = await deleteNotePermanently(vaultPath, noteId);
    if (result?.success) {
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (selectedNoteId === noteId) setSelectedNoteId(null);
    } else {
      setModalContent({ title: 'Error', body: result?.message || 'Failed to delete note permanently' });
      setShowModal(true);
    }
  } else {
    // Move para lixeira
    console.log('Note antes de mover para a lixeira:', note);
    const updatedNote = { ...note, previousFolderId: note.folderId, folderId: 'trash' };
    
    try {
      await saveNote(vaultPath, updatedNote);
      console.log('Note depois de salvar na lixeira:', updatedNote);
      setNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n));
    } catch (error) {
      setModalContent({ title: 'Error', body: `Failed to move note to trash: ${error.message}` });
      setShowModal(true);
    }
  }
};



  const handleRecoverNote = async (noteId) => {
  const note = notes.find(n => n.id === noteId);
  if (!note || note.folderId !== 'trash') return;

  try {
    const targetFolderId = note.previousFolderId || 'all';
    
    // Usar handler específico de recuperação
    const result = await window.electronAPI.recoverNote(vaultPath, noteId, targetFolderId);
    
    if (result?.success) {
      const updatedNote = { ...note, folderId: targetFolderId, previousFolderId: undefined };
      setNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n));
    } else {
      setModalContent({ title: 'Error', body: 'Failed to recover note' });
      setShowModal(true);
    }
  } catch (err) {
    setModalContent({ title: 'Error', body: `Failed to recover note: ${err.message}` });
    setShowModal(true);
  }
};

  const handleMoveNoteToFolder = (noteId, targetFolderId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || note.folderId === targetFolderId) return;

    const updatedNote = { ...note, previousFolderId: note.folderId, folderId: targetFolderId, modifiedAt: new Date().toISOString() };
    saveNote(vaultPath, updatedNote);
    setNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n).sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt)));
  };

  // --- Manipulação de Pastas ---

  const handleCreateFolder = async (name) => {
    // Impede a criação de pastas com nomes reservados
    if (name.toLowerCase() === 'assets') {
      setModalContent({ title: 'Invalid Name', body: 'The folder name "assets" is reserved and cannot be used.' });
      setShowModal(true);
      return;
    }

    // Impede a criação de pastas com nomes duplicados
    if (folders.some(folder => folder.name.toLowerCase() === name.trim().toLowerCase())) {
      setModalContent({ title: 'Duplicate Folder', body: `A folder named "${name.trim()}" already exists. Please choose a different name.` });
      setShowModal(true);
      return;
    }

    try {
      const newFolder = await createFolder(vaultPath, name);
      setFolders(prev => [...prev, newFolder]);
    } catch (err) {
      setModalContent({ title: 'Error', body: `Failed to create folder: ${err.message}` });
      setShowModal(true);
    }
  };

  const handleRenameRequest = (folder) => {
    if (folder.system) return;
    setFolderToRename(folder);
    setRenameModalOpen(true);
  };

  const handleRenameFolder = async (oldName, newName) => {
    if (!newName || oldName === newName) {
      setRenameModalOpen(false);
      return;
    }
    // Impede a renomeação para nomes reservados
    if (newName.trim().toLowerCase() === 'assets') {
      setModalContent({ title: 'Invalid Name', body: 'The folder name "assets" is reserved and cannot be used.' });
      setShowModal(true);
      setRenameModalOpen(false);
      return;
    }
    try {
      await renameFolder(vaultPath, oldName, newName);
      setFolders(prev => prev.map(f => f.id === oldName ? { ...f, id: newName, name: newName } : f));
      // Atualiza o folderId nas notas afetadas
      setNotes(prev => prev.map(n => n.folderId === oldName ? { ...n, folderId: newName } : n));
      if (selectedFolderId === oldName) setSelectedFolderId(newName);
      setRenameModalOpen(false);
    } catch (err) {
      setModalContent({ title: 'Error', body: `Failed to rename folder: ${err.message}` });
      setShowModal(true);
    }
  };

  const handleSelectFolder = useCallback((folderId) => {
    setSelectedFolderId(folderId);
    setSelectedNoteId(null); // Deseleciona a nota inicialmente
    setSearchTerm(''); // Limpa a busca ao trocar de pasta

    // Seleciona automaticamente a primeira nota se for a lixeira
    if (folderId === 'trash') {
      const trashNotes = notes
        .filter(note => note.folderId === 'trash')
        .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
      
      if (trashNotes.length > 0) {
        setSelectedNoteId(trashNotes[0].id);
      }
    }
  }, [notes]);

  const handleDeleteFolder = async (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder || folder.system) return;

    const notesInFolder = notes.filter(n => n.folderId === folderId);

    try {
        await deleteFolder(vaultPath, folderId, notesInFolder);
        // Mover notas para a lixeira no estado
        setNotes(prev => prev.map(n => {
            if (n.folderId === folderId) {
                return { ...n, folderId: 'trash', previousFolderId: folderId };
            }
            return n;
        }));
        setFolders(prev => prev.filter(f => f.id !== folderId));
        if (selectedFolderId === folderId) setSelectedFolderId('all');
    } catch (err) {
        setModalContent({ title: 'Error', body: `Failed to delete folder: ${err.message}` });
        setShowModal(true);
    }
  };

  // --- Efeitos e Memos de UI ---

  useEffect(() => {
    const allTagsSet = new Set();
    notes.forEach(note => {
      if (note.folderId !== 'trash') {
        (note.tags || []).forEach(tag => allTagsSet.add(tag.toLowerCase()));
      }
    });
    setTags(Array.from(allTagsSet).sort());
  }, [notes]);

  const filteredNotes = useMemo(() => notes.filter(note => {
    const inFolder = selectedFolderId === 'all'
      ? note.folderId !== 'trash'
      : note.folderId === selectedFolderId;

    const matchesSearch = !searchTerm ||
      (note.title && note.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (note.content && note.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (note.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag = !selectedTagFilter || (note.folderId !== 'trash' && (note.tags || []).includes(selectedTagFilter));

    return selectedTagFilter ? (matchesTag && matchesSearch) : (inFolder && matchesSearch);
  }), [notes, selectedFolderId, searchTerm, selectedTagFilter]);

  const handleSelectTagFilter = (tag) => {
    setSelectedTagFilter(tag);
    setSelectedFolderId('all');
    setSelectedNoteId(null);
  };

  const handleClearTagFilter = () => {
    setSelectedTagFilter(null);
  };

  // --- Renderização ---

if (isAppLoading) {
  return <LoadingScreen />;
}

  if (!vaultPath) {
    return <OnboardingModal on_create_vault={handleSelectVault} />;
  }

  return (
    <>
      <AppProvider vaultPath={vaultPath}>
        <MainLayout
          folders={folders}
          allNotes={notes}
          tags={tags}
          notes={filteredNotes}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onCreateNote={handleCreateNote}
          onUpdateNoteContent={handleUpdateNoteContent}
          onDeleteNote={handleDeleteNote}
          onRecoverNote={handleRecoverNote}
          onCreateFolder={handleCreateFolder}
          onRenameRequest={handleRenameRequest}
          onDeleteFolder={handleDeleteFolder}
          currentSearchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          currentTagFilter={selectedTagFilter}
          onSelectTagFilter={handleSelectTagFilter}
          onClearTagFilter={handleClearTagFilter}
          onMoveNoteToFolder={handleMoveNoteToFolder}
          isLoading={isLoading}
          onSelectVault={handleSelectVault}
        />
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={modalContent.title}
          footer={<Button onClick={() => setShowModal(false)} className="btn-primary">Close</Button>}
        >
          <p>{modalContent.body}</p>
        </Modal>
        <RenameFolderModal
          isOpen={isRenameModalOpen}
          onClose={() => setRenameModalOpen(false)}
          onRename={(id, newName) => handleRenameFolder(id, newName)}
          folderToRename={folderToRename}
        />
      </AppProvider>
    </>




  );
};

export default App;
