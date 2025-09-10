// src/components/RenameFolderModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

const RenameFolderModal = ({ isOpen, onClose, onRename, folderToRename }) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  // Atualiza o nome no input sempre que o modal for aberto para uma nova pasta
  useEffect(() => {
    if (folderToRename) {
      setNewName(folderToRename.name);
    }
  }, [folderToRename]);
  
  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleRename = () => {
    // Validação para garantir que o nome não está vazio e é diferente do original
    if (newName.trim() && newName.trim() !== folderToRename.name) {
      onRename(folderToRename.id, newName.trim());
    } else if (newName.trim().toLowerCase() === 'assets') {
      setError('The folder name "assets" is reserved and cannot be used.');
      return; // Não fecha o modal se houver erro
    }
    onClose(); // Fecha o modal após a tentativa de renomear
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRename();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Rename Folder"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleRename} variant="warning" disabled={!newName.trim() || newName.trim() === folderToRename?.name}>
            Save
          </Button>
        </>
      }
    >
      <p>Enter a new name for the folder "{folderToRename?.name}":</p>
      <input
        type="text"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={handleKeyPress}
        className="form-control"
        autoFocus
      />
    </Modal>
  );
};

export default RenameFolderModal;