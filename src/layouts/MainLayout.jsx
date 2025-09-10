import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';

import Sidebar from '../components/Sidebar';
import NoteList from '../components/NoteList';
import Editor from '../components/Editor';

import './ResponsiveLayout.css';

const MainLayout = (props) => {
  const {
    notes,
    allNotes,
    selectedNoteId,
    onSelectNote,
    onUpdateNoteContent,
    onDeleteNote,
    onRecoverNote,
    onCreateNote,
    onSelectVault,
    selectedFolderId,
    // Outros que você desejar extrair explicitamente
  } = props;

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Hook para detectar mudanças no tamanho da tela
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 992; // lg breakpoint
      setIsMobile(mobile);
      
      // Se mudou para desktop (>= 992px), fecha a sidebar móvel
      if (!mobile && isSidebarOpen) {
        setSidebarOpen(false);
      }
    };

    // Verifica o tamanho inicial
    checkScreenSize();

    // Adiciona listener para redimensionamento
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isSidebarOpen]);

  const mainLayoutClasses = [
    'main-layout',
    selectedNoteId ? 'note-selected' : '',
    isSidebarOpen ? 'sidebar-open' : '',
  ].join(' ');

  const handleToggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const handleCloseSidebar = () => setSidebarOpen(false);
  const handleBackToNoteList = () => onSelectNote(null);

  const selectedNote = notes.find(note => note.id === selectedNoteId);
  const isTrashView = selectedFolderId === 'trash';

  return (
    <div className="app-container vh-100 d-flex flex-column">
      <div className={mainLayoutClasses}>
        {/* Sidebar */}
        <aside className="sidebar-column">
          <Sidebar
            {...props}
            onSelectFolder={(folderId) => {
              props.onSelectFolder(folderId);
              handleCloseSidebar();
            }}
            onSelectTag={(tag) => {
              props.onSelectTagFilter(tag);
              handleCloseSidebar();
            }}
            onSelectVault={onSelectVault}
          />
        </aside>

        {isSidebarOpen && isMobile && (
          <div className="sidebar-overlay d-md-none" onClick={handleCloseSidebar}></div>
        )}

        {/* Conteúdo Principal */}
        <main className="main-content-columns">
          <section className="note-list-column" aria-label="Note List">
            <NoteList
              {...props}
              onToggleSidebar={handleToggleSidebar}
              isSidebarHidden={!isSidebarOpen}
              showToggleButton={isMobile} // Nova prop para controlar a exibição do botão
            />
          </section>

          <section className="editor-column" aria-label="Editor">
            <Editor
              key={selectedNote?.id || 'no-note'}
              note={selectedNote}
              onSave={onUpdateNoteContent}
              onDelete={onDeleteNote}
              onRecover={onRecoverNote}
              onCreateNote={onCreateNote}
              onBackToNoteList={handleBackToNoteList} // Nova prop adicionada
              isTrashView={isTrashView}
              disabled={isTrashView}
              isCompact={false} // Pode adicionar lógica para mobile se necessário
            />
          </section>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;