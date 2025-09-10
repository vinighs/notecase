import React from 'react';
import { formatDate, createNotePreview } from '../services/uiHelper'; // Ensure correct path

const NoteItem = ({ note, isSelected, onSelectNote, folders }) => {
  if (!note) {
    return null; // Or some placeholder for an empty note item
  }


  // Function to get folder name (assuming folders array is passed down)
  const getFolderName = (folderId) => {
    if (!folders) return 'Uncategorized'; // Fallback if folders array is not available
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : (folderId === 'all' ? 'All Notes' : (folderId === 'trash' ? 'Recently Deleted' : 'Uncategorized'));
  };

  const folderName = getFolderName(note.folderId);
  const previewContent = createNotePreview(note.content, 80); // Adjust maxLength as needed

  return (
    <div
      className={`note-item p-3 ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelectNote(note.id)}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && onSelectNote(note.id)} // Accessibility
    >
      <div className="note-item-preview fw-bold mb-1 text-truncate">
        {previewContent || "Empty Note"}
      </div>
      <div className="note-metadata d-flex justify-content-between align-items-center small">
        <span className="note-date">{formatDate(note.modifiedAt)}</span>
        {note.folderId !== 'trash' && folderName !== "All Notes" && ( // Don't show folder if in trash or it's the generic "All Notes" view
            <>
              <span className="metadata-separator mx-1">•</span>
              <span className="note-folder text-truncate" title={folderName}>
                <i className="bi bi-folder me-1"></i>
                {folderName}
              </span>
            </>
        )}
      </div>
    </div>
  );
};

export default NoteItem;