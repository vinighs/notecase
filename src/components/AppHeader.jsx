import React from 'react';
import { Button } from 'react-bootstrap';

const AppHeader = ({ onToggleSidebar, showBackButton, onBack }) => {
  return (
    <header className="app-header">
      <Button
        variant="icon"
        className="sidebar-toggle-btn d-md-none" // Visível apenas em telas < md
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <i className="bi bi-list"></i>
      </Button>

      {showBackButton && (
         <Button
            variant="icon"
            className="editor-back-btn d-md-none" // Visível apenas em telas < md
            onClick={onBack}
            aria-label="Back to note list"
        >
            <i className="bi bi-arrow-left"></i>
        </Button>
      )}

      <h1 className="app-title">.</h1>
    </header>
  );
};

export default AppHeader;