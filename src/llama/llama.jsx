import React, { useState, useRef, useEffect } from 'react';
import { ThemeProvider} from 'styled-components';
import { Send, Square, Loader, Sun, Moon, Copy, Check } from 'lucide-react';
import RAGSidebar from './sidebar';
import { lightTheme, darkTheme } from './lamastyles';
import * as lam from './lamastyles';

const LamaChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
      <lam.Container>
        <lam.Header>
        <lam.ThemeButton 
              onClick={toggleTheme} 
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </lam.ThemeButton>
          <lam.Title>LevChat</lam.Title>
          <lam.HeaderGroup>            
            {/* <lam.StatusIndicator isConnected={isConnected}>
              {isConnected }
            </lam.StatusIndicator> */}
            
            <RAGSidebar 
                // theme={isDarkMode ? lightTheme : darkTheme} 
                onToggle={setIsSidebarOpen} 
              />
          </lam.HeaderGroup>
        </lam.Header>

        <lam.ChatContainer ref={chatContainerRef}>
          {messages.map((message, index) => (
            <lam.MessageContainer key={index} isUser={message.isUser}>
              <lam.Message isUser={message.isUser}>
                {message.text}
              </lam.Message>
              {!message.isUser && message.text && (
                <lam.CopyButton
                  onClick={() => handleCopy(message.text, index)}
                  isUser={message.isUser}
                  title="Copy message"
                >
                  {copiedMessageId === index ? (
                    <>
                      <Check size={14} />
                      <lam.CopyText>Copied</lam.CopyText>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <lam.CopyText>Copy</lam.CopyText>
                    </>
                  )}
                </lam.CopyButton>
              )}
            </lam.MessageContainer>
          ))}
        </lam.ChatContainer>

        <lam.InputContainer>
          <lam.InputWrapper>
            <lam.Input
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Start typing..."
              rows={1}
            />
            <lam.ButtonGroup>
              <lam.Button 
                onClick={isExecuting ? handleStop : handleSubmit} 
                disabled={!input.trim()}
              >
                {isExecuting ? (
                  <>
                    <Square size={10} />
                    Stop
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Send
                  </>
                )}
              </lam.Button>
          </lam.ButtonGroup>
          </lam.InputWrapper>
        </lam.InputContainer>
      </lam.Container>
    </ThemeProvider>
  );
};

export default LamaChat;
