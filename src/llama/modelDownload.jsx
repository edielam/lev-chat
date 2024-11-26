import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { X, Download, AlertTriangle} from 'lucide-react';


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
  background-color: ${props => props.theme.background};
  border-radius: 1rem;
  padding: 2rem;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
`;

const OverlayHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.textMuted};
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: ${props => props.theme.textStrong};
  }
`;

const DownloadDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProgressContainer = styled.div`
  width: 100%;
  background-color: ${props => props.theme.border};
  border-radius: 0.5rem;
  overflow: hidden;
  height: 20px;
`;

const ProgressBar = styled.div`
  width: ${props => props.progress}%;
  height: 100%;
  background-color: ${props => 
    props.error ? '#ff4d4d' : 
    props.complete ? '#4caf50' : 
    props.theme.accent};
  transition: width 0.5s ease;
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s;

  &.cancel {
    background-color: ${props => props.theme.border};
    color: ${props => props.theme.textMuted};

    &:hover {
      background-color: ${props => props.theme.borderHover};
    }
  }

  &.confirm {
    background-color: ${props => props.theme.accent};
    color: white;

    &:hover {
      background-color: ${props => props.theme.accentHover};
    }

    &:disabled {
      background-color: ${props => props.theme.border};
      cursor: not-allowed;
    }
  }
`;

const ModelDownloadOverlay = ({ 
  isOpen, 
  onClose, 
  modelType, 
  url, 
  onConfirmDownload 
}) => {
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Validate URL ends with .gguf or .gguf?download=true
    const isValid = url && (
      url.toLowerCase().endsWith('.gguf') || 
      url.toLowerCase().includes('.gguf?download=true')
    );
    setIsValidUrl(isValid);
    setError(isValid ? null : 'Invalid model file type. Must end with .gguf');
  }, [url]);

  const handleConfirmDownload = () => {
    if (isValidUrl) {
      onConfirmDownload(url, modelType);
    }
  };

  if (!isOpen) return null;

  return (
    <OverlayBackground>
      <OverlayContainer>
        <OverlayHeader>
          <h2>Download {modelType === 'language' ? 'Language' : 'Embedding'} Model</h2>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </OverlayHeader>

        <DownloadDetails>
          <DetailRow>
            <span>Model Type:</span>
            <strong>{modelType === 'language' ? 'Language Model' : 'Embedding Model'}</strong>
          </DetailRow>
          <DetailRow>
            <span>Download URL:</span>
            <span>{url}</span>
          </DetailRow>
        </DownloadDetails>

        {error && (
          <DetailRow>
            <AlertTriangle color="red" size={20} />
            <span style={{ color: 'red', marginLeft: '0.5rem' }}>{error}</span>
          </DetailRow>
        )}

        <ActionButtons>
          <Button 
            className="cancel" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            className="confirm" 
            onClick={handleConfirmDownload}
            disabled={!isValidUrl}
          >
            <Download size={18} />
            Confirm Download
          </Button>
        </ActionButtons>
      </OverlayContainer>
    </OverlayBackground>
  );
};

export default ModelDownloadOverlay;