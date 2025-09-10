import React from 'react';
import { Button } from 'react-bootstrap';
import Modal from './Modal';

const ConfirmDeleteModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  folderName,
  type = 'folder' // 'folder' ou 'note' para reutilização
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIcon = () => {
    return type === 'folder' ? 'bi-folder-x' : 'bi-trash3';
  };

  const getTitle = () => {
    return type === 'folder' ? 'Delete Folder' : 'Delete Note';
  };

  const getMessage = () => {
    if (type === 'folder') {
      return `Are you sure you want to delete "${folderName}"?`;
    }
    return `Are you sure you want to delete "${folderName}"?`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      footer={
        <>
          <Button 
            variant="outline-secondary" 
            onClick={onClose} 
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleConfirm} 
            style={{ flex: 1 }}
          >
            <i className="bi bi-trash-fill me-2"></i>
            Delete {type === 'folder' ? 'Folder' : 'Note'}
          </Button>
        </>
      }
    >
      <div className="text-center">
        <div className="mb-3">
          <i 
            className={`bi ${getIcon()} text-warning confirm-delete-icon`} 
            style={{ fontSize: '3rem' }}
          ></i>
        </div>
        <p className="mb-2 fw-semibold">
          {getMessage()}
        </p>
        <small className="text-muted fst-italic">
          This action cannot be undone.
        </small>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;