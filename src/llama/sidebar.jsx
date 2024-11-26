import React, { useState,useEffect } from 'react';
import styled from 'styled-components';
import { Download, Database, FileText, MenuIcon, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import ModelDownloadOverlay from './modelDownload';
import LlamaCppInstallProgress from './setup';
import SetupDownloadOverlay from './setup';

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
//   display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.theme.textMuted};
  margin-top: 0.5rem;
  margin-bottom: 1rem;
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
    const [windowsOS, setWindowsOS] = useState([]);
    const [linuxOS, setLinuxOS] = useState([]);
    const [activeSetupType, setActiveSetupType] = useState(null);

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

    const [setupUrls, setSetupUrls] = useState({
        Windows: 'https://github.com/ggerganov/llama.cpp/releases/download/b4179/llama-b4179-bin-win-avx2-x64.zip',
        Linux: 'https://github.com/ggerganov/llama.cpp/releases/download/b4179/llama-b4179-bin-ubuntu-x64.zip'
        });
    const [activeDownloadType, setActiveDownloadType] = useState(null);


    useEffect(() => {
        checkLlamaCppInstallation();
    }, []);

    const checkLlamaCppInstallation = async () => {
        try {
            const installed = await invoke('is_llama_cpp_installed');
            
            if (installed) {
                setLlamaCppInstalled(true);
                setInstallError(null);
            } else {
                // If not installed, check for existing executable
                try {
                    const executableName = await invoke('check_llama_cpp_executable_exists');
                    console.log(executableName + " was found")
                    // Simply set a descriptive message instead of treating it as an error
                    setLlamaCppInstalled(false);
                    setInstallError(`Executable ${executableName} found but is incompatible with your system`);
                } catch (execError) {
                    // No executable found
                    setLlamaCppInstalled(false);
                    setInstallError(null);
                }
            }
        } catch (error) {
            console.error('Error checking llama.cpp installation:', error);
            setLlamaCppInstalled(false);
            setInstallError('Error checking installation');
        }
    };
    
    const cancelInstallation = () => {
        setActiveSetupType(null);
        setIsInstalling(false);
    };
    
    const handleInstallComplete = async () => {
        await checkLlamaCppInstallation();
        setActiveSetupType(null);
        setIsInstalling(false);
    };
    const handleModelUrlChange = (type, value) => {
        const key = type === 'language' ? 'languageModel' : 'embeddingModel';
        setModelUrls(prev => ({
        ...prev,
        [key]: value
        }));
    };
    const handleSetupUrlChange = (type, value) => {
        setSetupUrls(prev => ({
            ...prev,
            [type]: value
        }));
    };
    
    
    const handleModelDownload = async (type) => {
        console.log(`Attempting to download ${type} model`);
        console.log('Current model URLs:', modelUrls);
        
        const url = type === 'language' ? modelUrls.languageModel : modelUrls.embeddingModel;
        
        console.log(`Selected ${type} model URL:`, url);
        
        setActiveDownloadType(type);
      };
    
      const cancelDownload = () => {
        setActiveDownloadType(null);
      };
      const handleInstallLlamaCpp = async (type) => {
        setActiveSetupType(type); // This will be 'Windows' or 'Linux'
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
        fetchModels();
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
                Setup (llama.cpp)
                </SectionTitle>
                {sectionsOpen.prerequisites ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </SectionHeader>
            {sectionsOpen.prerequisites && (
    <>
    {!llamaCppInstalled ? (
        <>
        {installError ? (
        <StatusMessage>
            <AlertTriangle color="orange" size={18} style={{ marginRight: '10px' }} />
            {installError}
        </StatusMessage>
    ) : (
        <StatusMessage>
            You can use the pre-loaded URLs or visit the{' '}
            <a 
                href="https://github.com/ggerganov/llama.cpp/releases/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                    color: '#0066cc', 
                    textDecoration: 'underline', 
                    marginLeft: '4px'
                }}
            >
                llama.cpp releases page
            </a>{' '}
            to download compatible binaries.
        </StatusMessage>
    )}
        <ModelDownloadSection>
            <ModelDownloadGroup>
                <ModelUrlLabel>Windows-x64</ModelUrlLabel>
                <ModelDownloadContainer>
                    <ModelUrlInput 
                    placeholder="Enter URL for llama binaries"
                    value={setupUrls.Windows}
                    onChange={(e) => handleSetupUrlChange('Windows', e.target.value)}
                    />
                    <DownloadModelButton 
                    onClick={(e) => {
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        console.log('Download button clicked for windows');
                        handleInstallLlamaCpp('Windows');
                    }}>
                    <Download size={18} />
                    </DownloadModelButton>
                </ModelDownloadContainer>
            </ModelDownloadGroup>
            <ModelDownloadGroup>
                <ModelUrlLabel>Linux-x64</ModelUrlLabel>
                <ModelDownloadContainer>
                    <ModelUrlInput 
                    placeholder="Enter URL for llama binaries"
                    value={setupUrls.Linux}
                    onChange={(e) => handleSetupUrlChange('Linux', e.target.value)}
                    />
                    <DownloadModelButton 
                    onClick={(e) => {
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        console.log('Download button clicked for linux');
                        handleInstallLlamaCpp('Linux');
                    }}>
                    <Download size={18} />
                    </DownloadModelButton>
                </ModelDownloadContainer>
            </ModelDownloadGroup>
        </ModelDownloadSection>
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
                        onClick={(e) => {
                            e.preventDefault(); // Prevent default form submission
                            e.stopPropagation(); // Stop event from bubbling
                            console.log('Download button clicked for language model'); // Debug log
                            handleModelDownload('language');
                        }}>
                        <Download size={18} />
                        </DownloadModelButton>
                    </ModelDownloadContainer>
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
                        onClick={(e) => {
                            e.preventDefault(); // Prevent default form submission
                            e.stopPropagation(); // Stop event from bubbling
                            console.log('Download button clicked for embedding model'); // Debug log
                            handleModelDownload('embedding');
                        }}>
                        <Download size={18} />
                        </DownloadModelButton>
                    </ModelDownloadContainer>
                </ModelDownloadGroup>
            </ModelDownloadSection>
            )}
        </SidebarSection>
        <ModelDownloadOverlay
            isOpen={!!activeDownloadType}
            onClose={cancelDownload}
            modelType={activeDownloadType}
            url={modelUrls[activeDownloadType === 'language' ? 'languageModel' : 'embeddingModel']}
     />
        </SidebarContainer>
        <SetupDownloadOverlay
            isOpen={!!activeSetupType}
            onClose={cancelInstallation}
            modelType={activeSetupType}
            url={setupUrls[activeSetupType]}
        />
        </>
    );
    };

export default RAGSidebar;