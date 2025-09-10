import React, { useState, useRef, useMemo } from 'react';
import { Button, Form, OverlayTrigger, Popover } from 'react-bootstrap';
import FolderList from './FolderList';
import TagList from './TagList';
import ThemeModal from './ThemeModal';
import Modal from './Modal';

const Sidebar = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameRequest, // MODIFICADO: Recebe onRenameRequest diretamente
  onDeleteFolder,
  onMoveNoteToFolder,
  tags,
  selectedTag,
  onSelectTag,
  onClearTagFilter,
  onSelectVault, // Adicionada
  allNotes
}) => {
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuTarget = useRef(null);
  // REMOVIDO: Estados do modal de renomeação
  const [draggedOverFolder, setDraggedOverFolder] = useState(null);
  const [draggedNoteId, setDraggedNoteId] = useState(null);

  const hasNotesInTrash = useMemo(() => {
    if (!allNotes) return false;
    return allNotes.some(note => note.folderId === 'trash');
  }, [allNotes]);

  const visibleFolders = useMemo(() => {
    // Filtra para remover a pasta 'assets' da exibição
    let filtered = folders.filter(folder => folder.id !== 'assets');

    if (hasNotesInTrash) {
      return filtered;
    }
    return filtered.filter(folder => folder.id !== 'trash');
  }, [folders, hasNotesInTrash]);

  const handleOpenThemeModal = () => {
    setIsThemeModalOpen(true);
  };

  const handleCloseThemeModal = () => {
    setIsThemeModalOpen(false);
  };

  const handleCreateFolderConfirm = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderModal(false);
    }
  };

  // REMOVIDO: Funções de controle do modal de renomeação (handleOpenRenameFolderModal, handleRenameFolderConfirm)

  const handleDrop = (noteId, folderId) => {
    if (noteId && folderId && onMoveNoteToFolder) {
      onMoveNoteToFolder(noteId, folderId);
    }
    setDraggedOverFolder(null);
    setDraggedNoteId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (folderId) => {
    setDraggedOverFolder(folderId);
  };

  const handleDragLeave = () => {
    setDraggedOverFolder(null);
  };

  const handleNoteDragStart = (noteId) => {
    setDraggedNoteId(noteId);
  };

  const handleNoteDragEnd = () => {
    setDraggedNoteId(null);
    setDraggedOverFolder(null);
  };

  const settingsPopover = (
    <Popover id="sidebar-settings-popover" className="sidebar-popover">
      <Popover.Body className="d-flex flex-column p-1">
        <Button variant="ghost" className="text-start popover-button" onClick={() => { onSelectVault(); setShowSettingsMenu(false); }}>
          <i className="bi bi-arrow-left-right me-2"></i> Change Vault
        </Button>
      </Popover.Body>
    </Popover>
  );

  return (
    <div 
      className="sidebar-panel d-flex flex-column p-3 h-100"
      onDragEnd={handleNoteDragEnd} /* ADICIONADO: Garante a limpeza do estado */
      style={{ borderRight: 'none' }}
    >
      <div className="sidebar-header d-flex justify-content-start align-items-center mb-3">
        <div 
          className="d-flex align-items-center"
          onClick={handleOpenThemeModal}
          style={{ cursor: 'pointer' }}
        >
          <div className="control red"></div>
        </div>
      </div>
      
      <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0, overflowY: 'auto' }}>
        <div className="mb-3 folder-list-container" style={{ flexGrow: 1 }}>
          <FolderList
            folders={visibleFolders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            onRenameRequest={onRenameRequest} // MODIFICADO: Passa a prop correta para FolderList
            onDeleteFolder={onDeleteFolder}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            draggedOverFolder={draggedOverFolder}
            draggedNoteId={draggedNoteId}
          />
        </div>

        <div className="mb-3" style={{ flexShrink: 0, overflowY: 'auto' }}>
          <TagList
            tags={tags}
            selectedTag={selectedTag}
            onSelectTag={onSelectTag}
            onClearTagFilter={onClearTagFilter}
          />
        </div>
      </div>

      <div className="sidebar-footer mt-auto d-flex align-items-center">
        <button 
          className="new-folder-button flex-grow-1"
          onClick={() => setShowNewFolderModal(true)}
        >
          <i className="bi bi-plus-circle"></i> New Folder
        </button>
        <OverlayTrigger
          trigger="click"
          placement="top-end"
          show={showSettingsMenu}
          onToggle={setShowSettingsMenu}
          overlay={settingsPopover}
          rootClose
        >
          <Button
            ref={settingsMenuTarget}
            variant="icon"
            className="settings-button ms-2"
            title="More options"
          >
            <i className="bi bi-three-dots"></i>
          </Button>
        </OverlayTrigger>
      </div>

      <Modal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        title="Create New Folder"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewFolderModal(false)}>
              Cancel
            </Button>
            <Button variant="warning" onClick={handleCreateFolderConfirm} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </>
        }
      >
        <p>Enter a name for the new folder:</p>
        <input
          type="text"
          placeholder="Folder Name"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          className="form-control"
          onKeyDown={(e) => e.key === 'Enter' && handleCreateFolderConfirm()}
          autoFocus
        />
      </Modal>

      <ThemeModal 
        isOpen={isThemeModalOpen}
        onClose={handleCloseThemeModal}
      />
    </div>
  );
};

export default Sidebar;