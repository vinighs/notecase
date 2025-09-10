import React, { useState, useRef } from 'react';
import Modal from './Modal';
import Button from './Button';
import './ImageModal.css';

const ImageModal = ({ isOpen, onClose, onInsert }) => {
  const [tab, setTab] = useState('url'); // 'url' or 'upload'
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB.');
        return;
      }
      const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Please select a PNG, JPG, GIF, SVG, or WebP.');
        return;
      }
      setFile(selectedFile);
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleInsert = () => {
    if (tab === 'url') {
      if (url) {
        onInsert({ src: url, altText: 'Image from URL' }, 'url');
        resetState();
      }
    } else {
      if (file) {
        onInsert({ file, altText: file.name }, 'upload');
        resetState();
      }
    }
  };

  const resetState = () => {
    setUrl('');
    setFile(null);
    setPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleClose = () => {
    resetState();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Insert Image"
      footer={
        <>
          <Button onClick={handleClose} className="btn btn-secondary">
            Cancel
          </Button>
          <Button
            onClick={handleInsert}
            disabled={(tab === 'url' ? !url : !file)}
            className="btn btn-warning"
          >
            Insert
          </Button>
        </>
      }
    >
      <div className="image-modal-tabs">
        <button className={tab === 'url' ? 'active' : ''} onClick={() => setTab('url')}>From URL</button>
        <button className={tab === 'upload' ? 'active' : ''} onClick={() => setTab('upload')}>Upload</button>
      </div>
      <div className="image-modal-content">
        {error && <p className="image-modal-error">{error}</p>}
        {tab === 'url' ? (
          <div className="image-modal-url">
            <input
              type="text"
              placeholder="https://example.com/image.png"
              value={url}
              onChange={handleUrlChange}
              className="form-control" // Usando classe do Bootstrap para consistência
            />
          </div>
        ) : (
          <div className="image-modal-upload">
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="form-control" // Usando classe do Bootstrap para consistência
              key={tab} // Force re-mount when switching tabs to ensure clean state
            />
            {preview && <img src={preview} alt="Preview" className="image-modal-preview" />}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImageModal;