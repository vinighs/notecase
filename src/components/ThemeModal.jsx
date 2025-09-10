import React from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from './Modal';
import Button from './Button';
import '../assets/index.css';

const ThemeModal = ({ isOpen, onClose }) => {
  const { theme, toggleTheme } = useAppContext();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Display Settings"
      footer={
        <Button onClick={onClose} className="btn-primary">
          Done
        </Button>
      }
    >
      <div className="theme-option" style={{ marginTop: 8, marginBottom: 8 }}>
        <span>Dark Mode</span>
        <div className="toggle-switch">
          <input
            type="checkbox"
            id="darkModeToggle"
            className="toggle-input"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
          <label htmlFor="darkModeToggle" className="toggle-label"></label>
        </div>
      </div>
    </Modal>
  );
};

export default ThemeModal;
