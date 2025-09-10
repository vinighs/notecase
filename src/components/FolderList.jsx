// src/components/FolderList.jsx
import React from 'react';
import { ListGroup } from 'react-bootstrap';
import FolderItem from './FolderItem';

const FolderList = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  // Remova onRenameFolder daqui e adicione onRenameRequest
  onRenameRequest, // Nova prop
  onDeleteFolder,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
  draggedNoteId,
  draggedOverFolder,
}) => {
  const sortedFolders = [...folders].sort((a, b) => {
    if (a.system && !b.system) return -1;
    if (!a.system && b.system) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <ListGroup variant="flush" className="mb-3 flex-grow-1" style={{ overflowY: 'auto' }}>
      {sortedFolders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          isSelected={folder.id === selectedFolderId}
          onSelectFolder={onSelectFolder}
          // Passe a nova prop para o FolderItem
          onRenameRequest={onRenameRequest}
          onDeleteFolder={() => onDeleteFolder(folder.id)}
          onNoteDrop={onDrop}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          draggedNoteId={draggedNoteId}
          draggedOverFolder={draggedOverFolder}
        />
      ))}
    </ListGroup>
  );
};

export default FolderList;