import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { X, Download, AlertTriangle, XIcon } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { Button } from './lamastyles';

const OverlayBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const OverlayContainer = styled.div`
  background-color: ${props => props.theme.secondary};
  border-radius: 1rem;
  padding: 2rem;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
`;

const ProgressContainer = styled.div`
  width: 100%;
  background-color: #e0e0e0;
  border-radius: 0.5rem;
  overflow: hidden;
  height: 10px;
  margin-top: 1rem;
`;

const ProgressBar = styled.div`
  width: ${props => props.progress}%;
  height: 100%;
  background-color: ${props => 
    props.error ? '#ff4d4d' : 
    props.progress === 100 ? '#275c91' : 
    props.theme.progressbarTrack};
  transition: width 0.5s ease;
`;

const SetupDownloadOverlay = ({ 
  isOpen, 
  onClose, 
  modelType, 
  url 
}) => {
    const [isValidUrl, setIsValidUrl] = useState(false);
    const [localError, setLocalError] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(null);
    const [downloadError, setDownloadError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const progressIntervalRef = useRef(null);

  useEffect(() => {
    const isValid = url && (
      url.toLowerCase().endsWith('.zip') || 
      url.toLowerCase().includes('.zip?download=true')
    );
    setIsValidUrl(isValid);
    setLocalError(isValid ? null : 'Invalid file type. Download zipped binary files');
  }, [url]);

  useEffect(() => {
    const checkInitialDownloadProgress = async () => {
      if (isOpen) {
        try {
          const progress = await invoke('get_download_progress');
          
          if (progress.is_downloading) {
            setIsDownloading(true);
            setDownloadProgress(progress.percentage || 0);
            
            // If download is in progress, always start tracking progress
            startDownloadProgress();
          } else {
            // Reset states if no download is in progress
            setDownloadProgress(null);
            setIsDownloading(false);
            setDownloadError(null);
          }
        } catch (error) {
          console.error('Error checking initial download progress:', error);
          // Reset all states in case of error
          setDownloadProgress(null);
          setIsDownloading(false);
          setDownloadError(error instanceof Error ? error.message : String(error));
        }
      }
    };
  
    // If modal is open, immediately check download status
    if (isOpen) {
      checkInitialDownloadProgress();
    }
  }, [isOpen]); // Dependency on isOpen ensures this runs when modal opens

  const startDownloadProgress = () => {
    progressIntervalRef.current = setInterval(async () => {
      try {
        const progress = await invoke('get_download_progress');
        
        if (progress.percentage !== undefined) {
          setDownloadProgress(progress.percentage);
          
          if (progress.percentage === 100 || !progress.is_downloading) {
            stopProgressTracking();
          }
        }
      } catch (error) {
        console.error('Error fetching download progress:', error);
        stopProgressTracking();
      }
    }, 2000);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleConfirmDownload = async () => {
    if (isValidUrl) {
      try {

        setDownloadError(null);
        setDownloadProgress(0);
        setIsDownloading(true);

        startDownloadProgress();

        await invoke('download_model', { 
          url, 
          modelType: modelType === 'language' ? 'languageModel' : 'embeddingModel' 
        });

      } catch (error) {

        stopProgressTracking();
        setDownloadError(error instanceof Error ? error.message : String(error));
        setDownloadProgress(null);
        setIsDownloading(false);
      }
    }
  };

  const handleCancelDownload = async () => {
    try {
      await invoke('cancel_download');
      stopProgressTracking();
      setDownloadProgress(null);
      setIsDownloading(false);
      onClose();
    } catch (error) {
      console.error('Error cancelling download:', error);
    }
  };

  const handleClose = () => {

    stopProgressTracking();
    

    setDownloadProgress(null);
    setDownloadError(null);
    setLocalError(null);
    setIsDownloading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <OverlayBackground>
      <OverlayContainer>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Download {modelType === 'language' ? 'Language' : 'Embedding'} Model</h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div>
          <p><strong>Download URL:</strong> {url}</p>
          
          {localError && (
            <div style={{ color: 'red', display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
              <AlertTriangle color="red" size={20} style={{ marginRight: '0.5rem' }} />
              {localError}
            </div>
          )}

          {downloadError && (
            <div style={{ color: 'red', display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
              <AlertTriangle color="red" size={20} style={{ marginRight: '0.5rem' }} />
              {downloadError}
            </div>
          )}

          <ProgressContainer>
            <ProgressBar 
              progress={downloadProgress || 0} 
              error={!!downloadError}
            />
          </ProgressContainer>

          <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
            {downloadProgress !== null && `${downloadProgress}%`}
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginTop: '1rem', 
          gap: '1rem' 
        }}>
        {downloadProgress === 100 ? (
            <Button
            onClick={handleClose}
            style={{ 
                padding: '0.5rem 1rem', 
                // background: '#4caf50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                width: '100%'
            }}
            >
            Done
            </Button>
        ) : isDownloading ? (
            <Button
              onClick={handleCancelDownload}
              style={{ 
                padding: '0.5rem 1rem', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer' 
              }}
            >
              <XIcon size={18} />
              Cancel
            </Button>
          ) : (
            <Button 
              onClick={handleClose}
              style={{ 
                padding: '0.5rem 1rem', 
                background: '#f0f0f0',
                color: 'black', 
                border: 'none', 
                borderRadius: '0.5rem',
                cursor: 'pointer' 
              }}
            >
              Close
            </Button>
          )}
          {downloadProgress !== 100 && (
          <Button 
            onClick={handleConfirmDownload}
            disabled={!isValidUrl || (downloadProgress !== null && downloadProgress < 100)}
            style={{ 
              padding: '0.5rem 1rem',
              border: 'none',
              color: 'white', 
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <Download size={18} />
            Confirm
          </Button>
          )}
        </div>
      </OverlayContainer>
    </OverlayBackground>
  );
};

export default SetupDownloadOverlay;