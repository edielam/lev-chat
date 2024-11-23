import React, { useState, useRef, useEffect } from 'react';
import styled, { ThemeProvider, css } from 'styled-components';
import { Send, Square, Loader, Sun, Moon, Copy, Check } from 'lucide-react';

const darkTheme = {
  name: 'dark',
  background: '#1a1b26',
  secondary: '#24283b',
  border: '#15161e',
  text: '#a9b1d6',
  textStrong: '#c0caf5',
  accent: '#ff8c00',
  accentHover: '#ff9d1a',
  error: '#f7768e',
  errorHover: '#ff8c9e',
  success: '#9ece6a',
  messageBackground: '#282d3f',
  inputBackground: '#1a1b26',
  scrollbarTrack: '#1a1b26',
  scrollbarThumb: '#24283b',
};

const lightTheme = {
  name: 'light',
  background: '#f8f9fa',
  secondary: '#eaecef',
  border: '#dde0e4',
  text: '#4a4a4a',
  textStrong: '#2d2d2d',
  accent: '#ff8c00',
  accentHover: '#ff9d1a',
  error: '#d93025',
  errorHover: '#b31412',
  success: '#1e8e3e',
  messageBackground: '#f0f2f5',
  inputBackground: '#ffffff',
  scrollbarTrack: '#eaecef',
  scrollbarThumb: '#c8ccd1',
};

const globalStyles = css`
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
               "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", 
               "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 15px;
  line-height: 1.2;
  letter-spacing: -0.01em;
`;

const Container = styled.div`
  ${globalStyles}
  display: flex;
  flex-direction: column;
  height: 97vh;
  background-color: ${props => props.theme.background};
  color: ${props => props.theme.text};
  transition: all 0.3s ease;
`;

const Header = styled.header`
  background-color: ${props => props.theme.secondary};
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.scrollbarTrack};
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.scrollbarThumb};
    border-radius: 4px;
  }
`;

const MessageContainer = styled.div`
  position: relative;
  width: fit-content;
  max-width: 80%;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
`;

const Message = styled.div`
  padding: 1rem;
  border-radius: 0.5rem;
  line-height: 1.5;
  white-space: pre-wrap;
  font-size: 15px;
  
  ${props => props.isUser ? `
    background-color: ${props.theme.secondary};
    color: ${props.theme.textStrong};
  ` : `
    background-color: ${props.theme.messageBackground};
    color: ${props.theme.text};
  `}
`;

const CopyButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: ${props => props.isUser ? 'auto' : '0.5rem'};
  left: ${props => props.isUser ? '0.5rem' : 'auto'};
  background-color: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: all 0.2s ease;
  color: ${props => props.theme.text};
  font-size: 12px;

  &:hover {
    background-color: ${props => props.theme.secondary}40;
  }

  ${MessageContainer}:hover & {
    opacity: 1;
  }
`;

const CopyText = styled.span`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

const InputContainer = styled.div`
  padding: 1rem;
  background-color: ${props => props.theme.secondary};
  border-top: 1px solid ${props => props.theme.border};
`;

const InputWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
`;

const Title = styled.h1`
  font-size: 1.25rem;
  color: ${props => props.theme.textStrong};
  margin: 0;
  font-weight: 600;
`;

const Input = styled.textarea`
  ${globalStyles}
  flex: 1;
  background-color: ${props => props.theme.inputBackground};
  border: 1px solid ${props => props.theme.border};
  border-radius: 0.5rem;
  padding: 0.75rem;
  color: ${props => props.theme.textStrong};
  resize: none;
  min-height: 2.5rem;
  max-height: 150px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.accent};
  }

  &::placeholder {
    color: ${props => props.theme.text}80;
  }
`;

const Button = styled.button`
  background-color: ${props => props.theme.accent};
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.accentHover};
  }

  &:disabled {
    background-color: ${props => props.theme.text}80;
    cursor: not-allowed;
  }
`;

const ThemeButton = styled(Button)`
  background-color: transparent;
  color: ${props => props.theme.text};
  padding: 0.5rem;
  
  &:hover {
    background-color: ${props => props.theme.messageBackground};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const StopButton = styled(Button)`
  background-color: ${props => props.theme.error};
  
  &:hover {
    background-color: ${props => props.theme.errorHover};
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.isConnected ? props.theme.success : props.theme.error};
  font-size: 0.875rem;
`;

const HeaderGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;
const LamaChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const websocketRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const handleCopy = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  const handleStop = () => {
    if (websocketRef.current && isExecuting) {
      // Create a Uint8Array with the Ctrl+C character (0x03)
      const ctrlC = new Uint8Array([0x03]);
      websocketRef.current.send(ctrlC);
      setIsExecuting(false);
    }
  };


  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  const handleSubmit = async () => {
    if (!input.trim() || isExecuting) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);

    try {
      setIsExecuting(true);
      
      const ws = new WebSocket('ws://localhost:15555');
      websocketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        const config = {
          prompt: userMessage,
          temperature: 0.7,
          max_tokens: 1024
        };
        ws.send(JSON.stringify(config));
      };

      let currentResponse = '';
      
      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            currentResponse += reader.result;
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                text: currentResponse,
                isUser: false
              };
              return newMessages;
            });
          };
          reader.readAsText(event.data);
        } else {
          try {
            const status = JSON.parse(event.data);
            if (status.status?.includes('completed')) {
              setIsExecuting(false);
              ws.close();
            }
          } catch {
            currentResponse += event.data;
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                text: currentResponse,
                isUser: false
              };
              return newMessages;
            });
          }
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsExecuting(false);
      };

      setMessages(prev => [...prev, { text: '', isUser: false }]);
      
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: `Error: ${error.message}`, 
        isUser: false 
      }]);
      setIsExecuting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <Container>
        <Header>
          <Title>Lever Chat</Title>
          <HeaderGroup>
            <StatusIndicator isConnected={isConnected}>
              {isConnected}
            </StatusIndicator>
            <ThemeButton onClick={toggleTheme} title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </ThemeButton>
          </HeaderGroup>
        </Header>

        <ChatContainer ref={chatContainerRef}>
          {messages.map((message, index) => (
            <MessageContainer key={index} isUser={message.isUser}>
              <Message isUser={message.isUser}>
                {message.text}
              </Message>
              {!message.isUser && message.text && (
                <CopyButton
                  onClick={() => handleCopy(message.text, index)}
                  isUser={message.isUser}
                  title="Copy message"
                >
                  {copiedMessageId === index ? (
                    <>
                      <Check size={14} />
                      <CopyText>Copied</CopyText>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <CopyText>Copy</CopyText>
                    </>
                  )}
                </CopyButton>
              )}
            </MessageContainer>
          ))}
        </ChatContainer>

        <InputContainer>
          <InputWrapper>
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={1}
            />
            <ButtonGroup>
              {isExecuting && (
                <StopButton onClick={handleStop} title="Stop generation (Ctrl+C)">
                  <Square size={20} />
                </StopButton>
              )}
              <Button onClick={handleSubmit} disabled={isExecuting || !input.trim()}>
                {isExecuting ? <Loader className="animate-spin" /> : <Send size={20} />}
              </Button>
            </ButtonGroup>
          </InputWrapper>
        </InputContainer>
      </Container>
    </ThemeProvider>
  );
};

export default LamaChat;
