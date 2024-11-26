import React, { useState,useEffect } from 'react';
import styled from 'styled-components';
import { Download, Database, FileText, MenuIcon, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { documentDir } from '@tauri-apps/api/path';
import { writeBinaryFile } from '@tauri-apps/api/fs';
// import path from '@tauri-apps/api/path';

const SidebarContainer = styled.div`
  position: fixed;
  top: 0;
  right: ${props => props.$isOpen ? '0' : '-400px'};
  width: 400px;
  height: 100vh;
  background-color: ${props => props.theme.secondary};
  box-shadow: -4px 0 15px rgba(0,0,0,0.1);
  transition: right 0.3s ease-in-out;
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const SidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: ${props => props.theme.border};
  color: ${props => props.theme.textStrong};
`;

const CloseButton = styled.button`
  background-color: ${props => props.theme.accentHover};
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.accent};
  }
`;

const ConfigToggle = styled.button`
  background-color: ${props => props.theme.accentHover};
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.accent};
  }
`;

const SidebarSection = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.border};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.theme.textStrong};
  margin: 0;
`;

const SelectContainer = styled.div`
  position: relative;
  width: 100%;
  margin-bottom: 1rem;
`;

const SelectLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.textStrong};
  font-size: 0.875rem;
`;

const DropdownSelect = styled.select`
  width: 100%;
  padding: 0.75rem;
  padding-right: 2.5rem;
  background-color: ${props => props.theme.background};
  border: 2px solid ${props => props.theme.border};
  border-radius: 0.5rem;
  color: ${props => props.theme.textStrong};
  font-size: 0.9rem;
  appearance: none;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${props => props.theme.accentHover};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.accent};
    box-shadow: 0 0 0 2px ${props => props.theme.accent}40;
  }
`;

const SelectIcon = styled.div`
  position: absolute;
  right: 0.75rem;
  top: 70%;
  transform: translateY(-50%);
  pointer-events: none;
  color: ${props => props.theme.textMuted};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModelDownloadSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ModelDownloadGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ModelUrlLabel = styled.label`
  color: ${props => props.theme.textMuted};
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
`;

const ModelDownloadContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModelUrlInput = styled.input`
  flex-grow: 1;
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 0.25rem;
`;

const DownloadModelButton = styled.button`
  background-color: ${props => props.theme.accentHover};
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.theme.accent};
  }
`;

const InstallButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background-color: ${props => props.disabled 
    ? props.theme.border 
    : props.theme.accentHover};
  color: white;
  border: none;
  border-radius: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.accent};
  }
`;

const StatusMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.theme.textMuted};
  margin-top: 0.5rem;
`;

const ProgressBar = styled.div`
  width: ${props => props.$progress}%;
  height: 4px;
  background-color: blue;
  transition: width 0.5s ease;
`;
const ModelItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: ${props => props.$selected 
    ? props.theme.messageBackground 
    : 'transparent'};
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.messageBackground}80;
  }
`;

const ErrorMessage = styled.div`
color: red;
font-size: 0.8rem;
margin-top: 0.5rem;
`;

const RAGSidebar = ({onToggle}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedEmbedding, setSelectedEmbedding] = useState('');
    const [llamaCppInstalled, setLlamaCppInstalled] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [installError, setInstallError] = useState(null);
    const [languageModels, setLanguageModels] = useState([]);
    const [embeddingModels, setEmbeddingModels] = useState([]);
    const [sectionsOpen, setSectionsOpen] = useState({
        prerequisites: true,
        languageModels: false,
        embeddingModels: false,
        downloadModels: false
    });

    const [modelUrls, setModelUrls] = useState({
    languageModel: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q6_K.gguf',
    embeddingModel: 'https://huggingface.co/CompendiumLabs/bge-large-en-v1.5-gguf/resolve/main/bge-large-en-v1.5-f16.gguf'
    });
    const [downloadProgress, setDownloadProgress] = useState({
        languageModel: 0,
        embeddingModel: 0
    });

    const [downloadErrors, setDownloadErrors] = useState({
        languageModel: null,
        embeddingModel: null
    });

    useEffect(() => {
        checkLlamaCppInstallation();
    }, []);

    const checkLlamaCppInstallation = async () => {
        try {
        const isInstalled = await invoke('is_llama_cpp_installed');
        setLlamaCppInstalled(isInstalled);
        } catch (error) {
        console.error('Error checking llama.cpp installation:', error);
        }
    };

    const handleInstallLlamaCpp = async () => {
        setIsInstalling(true);
        setInstallError(null);

        try {
        await invoke('install_llama_cpp_command');
        await checkLlamaCppInstallation();
        } catch (error) {
        console.error('Installation error:', error);
        setInstallError(error.toString());
        } finally {
        setIsInstalling(false);
        }
    };
    const handleModelUrlChange = (type, value) => {
        const key = type === 'language' ? 'languageModel' : 'embeddingModel';
        setModelUrls(prev => ({
        ...prev,
        [key]: value
        }));
    };
    
    const handleModelDownload = async (type) => {
        const key = type === 'language' ? 'languageModel' : 'embeddingModel';
        const url = modelUrls[key];

        try {
        // Reset previous progress and errors
        setDownloadProgress(prev => ({ ...prev, [key]: 0 }));
        setDownloadErrors(prev => ({ ...prev, [key]: null }));

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentLength = response.headers.get('Content-Length');
        const total = parseInt(contentLength, 10);
        let downloaded = 0;

        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            downloaded += value.length;
            
            // Calculate and update progress
            const progress = contentLength 
            ? Math.round((downloaded / total) * 100) 
            : 0;
            
            setDownloadProgress(prev => ({ ...prev, [key]: progress }));
        }

        // Combine chunks
        const blob = new Blob(chunks);
        
        // Get the document directory path
        const baseDir = await documentDir();
        
        // Determine the save path based on model type
        const modelDir = type === 'language' 
            ? await path.join(baseDir, 'LevChat', 'model')
            : await path.join(baseDir, 'LevChat', 'em_model');

        // Extract filename from URL
        const filename = url.split('/').pop();
        const fullPath = await path.join(modelDir, filename);

        // Ensure directory exists (Tauri should handle this)
        // Write the file
        await writeBinaryFile(fullPath, await blob.arrayBuffer());

        // Refresh models list after download
        await fetchModels();

        // Reset progress
        setDownloadProgress(prev => ({ ...prev, [key]: 100 }));

        } catch (error) {
        console.error(`Error downloading ${type} model:`, error);
        setDownloadErrors(prev => ({ 
            ...prev, 
            [key]: error.message || 'Download failed' 
        }));
        }
    };

    const toggleSection = (section) => {
        setSectionsOpen(prev => ({
        ...prev,
        [section]: !prev[section]
        }));
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (onToggle) {
        onToggle(!isOpen);
        }
    };
    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
        const [languageList, embeddingList] = await Promise.all([
            invoke('list_language_models'),
            invoke('list_embedding_models')
        ]);
        setLanguageModels(languageList);
        setEmbeddingModels(embeddingList);
        } catch (error) {
        console.error('Error fetching models:', error);
        }
    };

    return (
        <>
        <ConfigToggle onClick={handleToggle}>
            <MenuIcon size={18} />
        </ConfigToggle>

        <SidebarContainer $isOpen={isOpen}>
            <SidebarHeader>
            <h2>Settings</h2>
            <CloseButton onClick={() => setIsOpen(false)}>
                <MenuIcon size={18} />
            </CloseButton>
            </SidebarHeader>

            <SidebarSection>
            <SectionHeader onClick={() => toggleSection('prerequisites')}>
                <SectionTitle>
                <Download size={18} />
                Prerequisites Setup
                </SectionTitle>
                {sectionsOpen.prerequisites ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </SectionHeader>

            {sectionsOpen.prerequisites && (
                <>
                {!llamaCppInstalled ? (
                    <>
                    <p>llama.cpp is required for local AI processing.</p>
                    <InstallButton 
                        onClick={handleInstallLlamaCpp}
                        disabled={isInstalling}
                    >
                        {isInstalling ? 'Installing...' : 'Install llama.cpp'}
                    </InstallButton>
                    
                    {installError && (
                        <StatusMessage>
                        <AlertTriangle color="red" size={18} />
                        Installation failed: {installError}
                        </StatusMessage>
                    )}
                    </>
                ) : (
                    <StatusMessage>
                    <CheckCircle2 color="green" size={18} />
                    llama.cpp is installed
                    </StatusMessage>
                )}
                </>
            )}
            </SidebarSection>

            <SidebarSection>
            <SectionHeader onClick={() => toggleSection('languageModels')}>
            <SectionTitle>
                <Database size={18} />
                Language Models
            </SectionTitle>
            {sectionsOpen.languageModels ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </SectionHeader>

            {sectionsOpen.languageModels && (
            <>
                <SelectContainer>
                <SelectLabel>Select Language Model</SelectLabel>
                <DropdownSelect 
                    value={selectedModel} 
                    onChange={(e) => setSelectedModel(e.target.value)}
                >
                    {languageModels.map((model, index) => (
                    <option key={index} value={model}>
                        {model}
                    </option>
                    ))}
                </DropdownSelect>
                <SelectIcon>
                    <ChevronDown size={20} />
                </SelectIcon>
                </SelectContainer>

                {/* <ModelsList>
                <ModelListTitle>Available Language Models</ModelListTitle>
                {languageModels.length > 0 ? (
                    languageModels.map((model, index) => (
                    <ModelListItem key={index}>{model}</ModelListItem>
                    ))
                ) : (
                    <NoModelsMessage>No language models downloaded</NoModelsMessage>
                )}
                </ModelsList> */}
            </>
            )}
        </SidebarSection>

        <SidebarSection>
            <SectionHeader onClick={() => toggleSection('embeddingModels')}>
            <SectionTitle>
                <FileText size={18} />
                Embedding Models
            </SectionTitle>
            {sectionsOpen.embeddingModels ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </SectionHeader>

            {sectionsOpen.embeddingModels && (
            <>
                <SelectContainer>
                <SelectLabel>Select Embedding Model</SelectLabel>
                <DropdownSelect 
                    value={selectedEmbedding} 
                    onChange={(e) => setSelectedEmbedding(e.target.value)}
                >
                    {embeddingModels.map((model, index) => (
                    <option key={index} value={model}>
                        {model}
                    </option>
                    ))}
                </DropdownSelect>
                <SelectIcon>
                    <ChevronDown size={16} />
                </SelectIcon>
                </SelectContainer>

                {/* <ModelsList>
                <ModelListTitle>Available Embedding Models</ModelListTitle>
                {embeddingModels.length > 0 ? (
                    embeddingModels.map((model, index) => (
                    <ModelListItem key={index}>{model}</ModelListItem>
                    ))
                ) : (
                    <NoModelsMessage>No embedding models downloaded</NoModelsMessage>
                )}
                </ModelsList> */}
            </>
            )}
        </SidebarSection>
        <SidebarSection>
            <SectionHeader onClick={() => toggleSection('downloadModels')}>
            <SectionTitle>
                <Download size={18} />
                Download Models
            </SectionTitle>
            {sectionsOpen.downloadModels ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </SectionHeader>

            {sectionsOpen.downloadModels && (
            <ModelDownloadSection>
                <ModelDownloadGroup>
                <ModelUrlLabel>Language Model URL (GGUF format)</ModelUrlLabel>
                <ModelDownloadContainer>
                    <ModelUrlInput 
                    placeholder="Enter URL for language model (e.g., Llama, Mistral)"
                    value={modelUrls.languageModel}
                    onChange={(e) => handleModelUrlChange('language', e.target.value)}
                    />
                    <DownloadModelButton 
                    onClick={() => handleModelDownload('language')}
                    disabled={downloadProgress.languageModel > 0 && downloadProgress.languageModel < 100}
                    >
                    <Download size={18} />
                    </DownloadModelButton>
                </ModelDownloadContainer>
                {downloadProgress.languageModel > 0 && (
                    <ProgressBar 
                    progress={downloadProgress.languageModel} 
                    error={downloadErrors.languageModel}
                    />
                )}
                {downloadErrors.languageModel && (
                    <ErrorMessage>{downloadErrors.languageModel}</ErrorMessage>
                )}
                </ModelDownloadGroup>

                <ModelDownloadGroup>
                <ModelUrlLabel>Embedding Model URL (GGUF format)</ModelUrlLabel>
                <ModelDownloadContainer>
                    <ModelUrlInput 
                    placeholder="Enter URL for embedding model (e.g., BGE, E5)"
                    value={modelUrls.embeddingModel}
                    onChange={(e) => handleModelUrlChange('embedding', e.target.value)}
                    />
                    <DownloadModelButton 
                    onClick={() => handleModelDownload('embedding')}
                    disabled={downloadProgress.embeddingModel > 0 && downloadProgress.embeddingModel < 100}
                    >
                    <Download size={18} />
                    </DownloadModelButton>
                </ModelDownloadContainer>
                {downloadProgress.embeddingModel > 0 && (
                    <ProgressBar 
                    progress={downloadProgress.embeddingModel} 
                    error={downloadErrors.embeddingModel}
                    />
                )}
                {downloadErrors.embeddingModel && (
                    <ErrorMessage>{downloadErrors.embeddingModel}</ErrorMessage>
                )}
                </ModelDownloadGroup>
            </ModelDownloadSection>
            )}
        </SidebarSection>
        </SidebarContainer>
        </>
    );
    };

export default RAGSidebar;