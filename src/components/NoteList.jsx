import React, { useEffect, useRef } from 'react';
import { Button, Form, Row, Col } from 'react-bootstrap';
import NoteItem from './NoteItem';

const NoteList = ({
  notes,
  selectedNoteId,
  onSelectNote,
  currentFolderId,
  folders,
  currentSearchTerm,
  onSearchTermChange,
  onCreateNote,
  currentTagFilter,
  onClearTagFilter,
  onToggleSidebar,
  isSidebarHidden,
  showToggleButton = false // New prop with default value
}) => {
  const selectedNoteRef = useRef(null);

  useEffect(() => {
    if (selectedNoteRef.current) {
      selectedNoteRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedNoteId]);

  const handleClearSearch = () => {
    onSearchTermChange('');
  };

  const tagFilterHeader = currentTagFilter && (
    <div className="d-flex justify-content-between align-items-center mb-2 px-1">
      <h3 className="h4 mb-0 tag-filter-title">#{currentTagFilter}</h3>
      <Button
        variant="link"
        className="p-0 text-decoration-none text-muted"
        onClick={onClearTagFilter}
        title="Clear tag filter"
        style={{ fontSize: '0.8rem' }}
      >
        Clear
      </Button>
    </div>
  );

  // Componente de cabeçalho refatorado para evitar duplicação
  const searchHeader = (
    <div className="note-list-header mb-3">
      <Row className="g-2 align-items-center">
        <Col>
          <div className="search-wrapper position-relative d-flex align-items-center">
            {/* Botão de toggle da sidebar - só aparece quando showToggleButton é true */}
            {showToggleButton && isSidebarHidden && (
              <Button
                variant="icon"
                className="sidebar-toggle-button me-2"
                onClick={onToggleSidebar}
                aria-label="Show menu"
              >
                <i className="bi bi-layout-sidebar-inset"></i>
              </Button>
            )}
            <Form.Label htmlFor="search-notes-input" visuallyHidden>
              Search Notes
            </Form.Label>
            <Form.Control
              id="search-notes-input"
              type="search"
              placeholder="Search notes..."
              className="custom-search"
              value={currentSearchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
            />
            {currentSearchTerm && (
              <Button variant="link" className="search-clear-button" onClick={handleClearSearch} aria-label="Clear search">
                <i className="bi bi-x-circle-fill"></i>
              </Button>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );

  if (!notes || notes.length === 0) {
    let message = "No notes here.";
    if (currentTagFilter) {
      message = `No notes found with the tag "${currentTagFilter}".`;
    } else if (currentFolderId === 'trash') {
      message = "Recycle bin is empty.";
    } else if (currentFolderId === 'all' && !currentSearchTerm) {
        message = "No notes found. Try creating one!";
    } else if (currentSearchTerm) {
        message = "No notes match your search.";
    } else {
        message = "This folder is empty.";
    }

    return (
      <div className="note-list-container d-flex flex-column h-100">
        {tagFilterHeader}
        {searchHeader}

        {/* Área vazia */}
        <div className="d-flex flex-column justify-content-center align-items-center flex-grow-1 text-muted">
          <i className="bi bi-journal-x fs-1 mb-3"></i>
          <p>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="note-list-container d-flex flex-column h-100">
      {tagFilterHeader}
      {searchHeader}

      {/* Lista de notas com scroll */}
      <div className="note-list-scroll-container flex-grow-1">
        {notes.map((note) => (
          <div
            key={note.id}
            ref={note.id === selectedNoteId ? selectedNoteRef : null}
            draggable="true"
            onDragStart={(e) => e.dataTransfer.setData('noteId', note.id)}
            style={{ cursor: 'grab' }}
          >
            <NoteItem
              note={note}
              isSelected={note.id === selectedNoteId}
              onSelectNote={onSelectNote}
              folders={folders}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoteList;