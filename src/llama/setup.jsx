import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import styled from 'styled-components';
import { X, Download, AlertTriangle } from 'lucide-react';

const ProgressOverlay = styled.div`
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

const ProgressContainer = styled.div`
  background-color: ${props => props.theme.background};
  border-radius: 0.5rem;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: ${props => props.theme.textMuted};
  cursor: pointer;
  
  &:hover {
    color: ${props => props.theme.textStrong};
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 20px;
  background-color: ${props => props.theme.border};
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const ProgressFill = styled.div`
  width: ${props => props.percentage}%;
  height: 100%;
  background-color: ${props => props.theme.accent};
  transition: width 0.5s ease;
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${props => props.theme.textStrong};
  margin-bottom: 1rem;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  color: red;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 1rem;
  background-color: ${props => props.theme.border};
  border-radius: 0.5rem;
`;

const CancelButton = styled.button`
  background-color: ${props => props.theme.accentHover};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 1rem;
  width: 100%;
  justify-content: center;

  &:hover {
    background-color: ${props => props.theme.accent};
  }
`;

const LlamaCppInstallProgress = ({ 
  onCancel, 
  onComplete 
}) => {
  const [progress, setProgress] = useState({
    percentage: 0,
    downloaded_size: 0,
    total_size: 0,
    filename: '',
    is_downloading: false,
    is_unzipping: false,
    unzip_total_files: 0,
    unzip_current_progress: 0,
    unzip_current_file: null
  });
  const [statusMessage, setStatusMessage] = useState('Preparing setup...');
  const [error, setError] = useState(null);

  useEffect(() => {
    let progressInterval;
    
    const startInstallation = async () => {
      try {
        await invoke('install_llama_cpp_command');
      } catch (error) {
        console.error('Setup initiation error:', error);
        setError(error.toString());
        setStatusMessage('Setup failed to start');
      }
    };

    const trackProgress = async () => {
      try {
        const currentProgress = await invoke('get_setup_progress');
        
        // Update progress state
        setProgress(currentProgress);

        // Update status based on current stage
        if (currentProgress.is_downloading) {
          if (currentProgress.percentage === 0) {
            setStatusMessage('Preparing download...');
          } else {
            setStatusMessage(`Downloading ${currentProgress.filename}`);
          }
        } else if (currentProgress.is_unzipping) {
          // Calculate unzip progress percentage
          const unzipPercentage = currentProgress.unzip_total_files > 0 
            ? Math.round((currentProgress.unzip_current_progress / currentProgress.unzip_total_files) * 100)
            : 0;
          
          setStatusMessage(`Extracting: ${currentProgress.unzip_current_file || 'Preparing...'}`);
        } else if (currentProgress.percentage === 100) {
          setStatusMessage('Setup complete!');
          onComplete && onComplete();
          clearInterval(progressInterval);
        }
      } catch (error) {
        console.error('Progress tracking error:', error);
        setError(error.toString());
        clearInterval(progressInterval);
      }
    };

    // Initial setup and start of installation
    startInstallation();

    // Start progress tracking
    progressInterval = setInterval(trackProgress, 2000);

    // Cleanup interval on unmount
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [onComplete]);

  const handleCancel = async () => {
    try {
      await invoke('cancel_setup');
      onCancel && onCancel();
    } catch (error) {
      console.error('Cancellation error:', error);
      setError(error.toString());
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Determine which progress to show
  const displayPercentage = progress.is_unzipping 
    ? (progress.unzip_total_files > 0 
      ? Math.round((progress.unzip_current_progress / progress.unzip_total_files) * 100)
      : 0)
    : progress.percentage;

  return (
    <ProgressOverlay>
      <ProgressContainer>
        <CloseButton onClick={onCancel}>
          <X size={24} />
        </CloseButton>
        
        <ProgressText>
          <span>{statusMessage}</span>
          {progress.is_downloading && (
            <span>
              {formatFileSize(progress.downloaded_size)} / 
              {formatFileSize(progress.total_size || 0)}
            </span>
          )}
          {progress.is_unzipping && (
            <span>
              {progress.unzip_current_progress} / {progress.unzip_total_files} files
            </span>
          )}
        </ProgressText>
        
        <ProgressBar>
          <ProgressFill 
            percentage={displayPercentage || 0} 
          />
        </ProgressBar>
        
        {error && (
          <ErrorMessage>
            <AlertTriangle size={18} />
            {error}
          </ErrorMessage>
        )}
        
        <CancelButton onClick={handleCancel}>
          <X size={18} />
          Cancel Installation
        </CancelButton>
      </ProgressContainer>
    </ProgressOverlay>
  );
};

export default LlamaCppInstallProgress;