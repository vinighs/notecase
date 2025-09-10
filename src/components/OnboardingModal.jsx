
import React from 'react';
import logoUrl from '../assets/logo-new-anota.svg';
import './OnboardingModal.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const OnboardingModal = ({ on_create_vault }) => {
  return (
    <div className="onboarding-modal">
      <div className="onboarding-content">
        <div className="onboarding-logo">
          <img src={logoUrl} alt="Anota app logo" />
        </div>
        <h1 className="onboarding-title">Your Notes Space.</h1>
        <p className="onboarding-subtitle">
          Your notes are stored in a 'vault'—a local, secure folder on your device.
        </p>

        <div className="features-section">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="bi bi-shield-lock"></i>
            </div>
            <div className="feature-text">
              <h2 className="feature-title">Your Personal Vault</h2>
              <p>Your notes are saved in a 100% local folder on your device. Total privacy, total control.</p>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="bi bi-cloud-arrow-up"></i>
            </div>
            <div className="feature-text">
              <h2 className="feature-title">Cloud Backup & Sync</h2>
              <p>For extra security, create your vault in an iCloud, Google Drive, or OneDrive folder to keep everything in sync.</p>
            </div>
          </div>
        </div>

        <div className="cta-section">
          <p className="cta-text">Ready to start?</p>
          <button className="cta-button" onClick={on_create_vault}>
            <i className="bi bi-folder-plus"></i>
            Create Vault
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
