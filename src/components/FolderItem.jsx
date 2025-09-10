import React, { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import ConfirmDeleteModal from './ConfirmDeleteModal';

// A custom component for the Dropdown Toggle to prevent event propagation issues
const CustomToggle = React.forwardRef(({ children, onClick }, ref) => (
  <a
    href=""
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation(); // Stop propagation here
      onClick(e);
    }}
    className="text-decoration-none folder-menu-btn"
  >
    {children}
  </a>
));

const FolderItem = ({
  folder,
  isSelected,
  onSelectFolder,
  onRenameRequest, // Expects (folderId, newName) -> to be implemented in App.jsx
  onDeleteFolder, // Expects (folderId) -> to be implemented in App.jsx
  notesInFolderCount, // Optional: number of notes in this folder, for "cannot delete" logic
  onNoteDrop, // Function to handle note drop
  draggedNoteId, // ID of the note being dragged
  onDragOver, // Handler for drag over
  onDragEnter, // Handler for drag enter
  onDragLeave, // Handler for drag leave
  draggedOverFolder // ID of folder being dragged over
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!folder) return null;

  const handleSelect = (e) => {
    // Prevent selection if a dropdown item was clicked
    // This is often handled by stopping propagation in the dropdown items themselves,
    // but we ensure the main click is for selection.
    if (e.target.closest('.dropdown-menu')) {
        return;
    }
    onSelectFolder(folder.id);
  };

  const getIcon = () => {
    // Removido: controle de cor inline, agora só classes CSS
    if (folder.id === 'trash') return <i className="bi bi-trash3 folder-icon"></i>;
    if (folder.id === 'all') return <i className="bi bi-collection folder-icon"></i>;
    return <i className="bi bi-folder folder-icon"></i>;
  };

  const handleRenameClick = (e) => {
    e.stopPropagation(); // Previne a seleção da pasta
    onRenameRequest(folder); // Chama a função para abrir o modal, passando a pasta atual
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    onDeleteFolder(folder.id);
    setShowDeleteModal(false);
  };
  
  // Drag and Drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const noteId = e.dataTransfer.getData('noteId');
    if (noteId && onNoteDrop) {
      onNoteDrop(noteId, folder.id);
    }
    if (onDragLeave) {
      onDragLeave();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragOver) {
      onDragOver(e);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragEnter) {
      onDragEnter(folder.id);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only trigger drag leave if we're actually leaving this element
    // and not entering a child element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (onDragLeave) {
        onDragLeave();
      }
    }
  };

  // Determine if this folder is being dragged over
  const isDraggedOver = draggedOverFolder === folder.id;
  const isDragging = draggedNoteId && draggedNoteId.length > 0;

  return (
    <>
      <div
        className={`folder-item list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
          isSelected ? 'active-folder selected' : ''
        } ${isDraggedOver ? 'drag-over' : ''} ${isDragging ? 'drag-target' : ''}`}
        onClick={handleSelect}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && handleSelect(e)}
        title={folder.name}
        style={{
          transition: 'all 0.2s ease',
          opacity: isDragging && !isDraggedOver ? 0.7 : 1,
          backgroundColor: isDraggedOver ? 'var(--bs-primary-bg-subtle)' : undefined,
          borderColor: isDraggedOver ? 'var(--bs-primary)' : undefined
        }}
      >
        <span className="d-flex align-items-center folder-name-container text-truncate">
          {getIcon()}
          <span className="folder-name text-truncate">{folder.name}</span>
          {isDraggedOver && (
            <i className="bi bi-arrow-down-circle-fill ms-2 text-primary"></i>
          )}
        </span>

        {!folder.system && (
          <Dropdown onClick={(e) => e.stopPropagation()}>
            <Dropdown.Toggle as={CustomToggle} id={`dropdown-folder-${folder.id}`}>
              <i className="bi bi-three-dots-vertical"></i>
            </Dropdown.Toggle>

            <Dropdown.Menu onClick={(e) => e.stopPropagation()}>
              <Dropdown.Item onClick={handleRenameClick}>
                <i className="bi bi-pencil-fill me-2"></i>Rename
              </Dropdown.Item>
              <Dropdown.Item onClick={handleDeleteClick} className="text-danger">
                <i className="bi bi-trash-fill me-2"></i>Delete
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        folderName={folder.name}
        type="folder"
      />
    </>
  );
};

export default FolderItem;