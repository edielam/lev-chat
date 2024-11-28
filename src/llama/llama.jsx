import React, { useState, useRef, useEffect } from 'react';
import { ThemeProvider} from 'styled-components';
import { Send, Square, Loader, Sun, Moon, Copy, Check } from 'lucide-react';
import RAGSidebar from './sidebar';
import { lightTheme, darkTheme } from './lamastyles';
import * as lam from './lamastyles';
import StreamingMarkdownRenderer from './md';
import { invoke } from '@tauri-apps/api/tauri';
import ChatSidebar from './chat';

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
  const [currentChatId, setCurrentChatId] = useState(null);
  const [availableChats, setAvailableChats] = useState([]);


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

    // If no current chat, create one
    if (!currentChatId) {
      await createNewChat();
    }

    const userMessage = {
      chat_id: currentChatId,
      content: input.trim(),
      is_user: true,
      timestamp: new Date().toISOString()
    };
    setInput('');
    setMessages(prev => [...prev, { text: userMessage.content, isUser: true }]);

    try {
      
      setIsExecuting(true);
      
      const ws = new WebSocket('ws://localhost:15555');
      websocketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        const config = {
          prompt: userMessage.content,
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
  const loadChatHistory = async (chatId) => {
    try {
      const messages = await invoke('get_chat_messages_command', { chatId });
      setMessages(messages);
      setCurrentChatId(chatId);
    } catch (error) {
      console.error('Failed to load chat history', error);
    }
  };

  // Create new chat
  const createNewChat = async () => {
    try {
      const newChatId = await invoke('create_new_chat_command', { 
        name: `Chat ${new Date().toLocaleString()}` 
      });
      setCurrentChatId(newChatId);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create new chat', error);
    }
  };

  useEffect(() => {
    const loadChats = async () => {
      try {
        const chats = await invoke('get_all_chats_command');
        setAvailableChats(chats);
      } catch (error) {
        console.error('Failed to load chats', error);
      }
    };
    loadChats();
  }, []);

  const deleteChat = async (chatId) => {
    try {
      await invoke('delete_chat_command', { chatId });
      // Remove the deleted chat from availableChats
      setAvailableChats(prev => prev.filter(chat => chat.id !== chatId));
      
      // If the current chat is deleted, create a new chat
      if (currentChatId === chatId) {
        await createNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat', error);
    }
  };

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
            
            <RAGSidebar 
                onToggle={setIsSidebarOpen} 
              />
          </lam.HeaderGroup>
        </lam.Header>
        <ChatSidebar 
        chats={availableChats}
        currentChatId={currentChatId}
        onNewChat={createNewChat}
        onSelectChat={loadChatHistory}
        onDeleteChat={deleteChat}
      />
        <lam.ChatContainer ref={chatContainerRef}>
          {messages.map((message, index) => (
            <lam.MessageContainer key={index} isUser={message.isUser}>
              <lam.Message isUser={message.isUser}>
                <StreamingMarkdownRenderer 
                      text={message.text} 
                      isDarkMode={isDarkMode} 
                    />
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
              
                {isExecuting ? (
                  <>
                   <lam.Button onClick={handleStop} title="Stop generation (Ctrl+C)"
                   style={{ width: '4rem', height: '4rem' }}>
                      <Square size={15} />
                    </lam.Button>
                  </>
                ) : (
                  <>
                    <lam.Button onClick={handleSubmit} disabled={isExecuting || !input.trim()}
                    style={{ height: '4rem' }}>
                       <Send size={20} />
                    </lam.Button>
                  </>
                )}

          </lam.ButtonGroup>
          </lam.InputWrapper>
        </lam.InputContainer>
      </lam.Container>
    </ThemeProvider>
  );
};

export default LamaChat;
