import React from 'react';
import ReactDOM from 'react-dom';
import '../assets/index.css';

// Adiciona animação de entrada/saída e estrutura inspirada no macOS HIG
const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // O conteúdo do modal que será "portado"
  const modalContent = (
    <div className="modal-overlay macos-modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content macos-modal-content animate-in" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header macos-modal-header">
          <h3 className="modal-title macos-modal-title" id="modal-title">{title}</h3>
          <button onClick={onClose} className="modal-close-button macos-modal-close" aria-label="Close">&times;</button>
        </div>
        <div className="modal-body macos-modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer macos-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Usamos um portal para renderizar o modal no final do body,
  // escapando do contexto de empilhamento da sidebar.
  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

export default Modal;
