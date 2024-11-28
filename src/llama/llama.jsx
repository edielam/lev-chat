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
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [availableChats, setAvailableChats] = useState([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const websocketRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Copy message to clipboard
  const handleCopy = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  // Stop message generation
  const handleStop = () => {
    if (websocketRef.current && isExecuting) {
      const ctrlC = new Uint8Array([0x03]);
      websocketRef.current.send(ctrlC);
      setIsExecuting(false);
    }
  };

  // Dynamic input height
  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  // Load chat history
  const loadChatHistory = async (chatId) => {
    try {
      const messages = await invoke('get_chat_messages_command', { chatId });
      
      // Normalize messages to ensure they have the correct format
      const normalizedMessages = messages.map(msg => ({
        text: msg.content || '', // Use content, default to empty string if undefined
        isUser: msg.is_user // Preserve the original is_user flag
      }));

      setMessages(normalizedMessages);
      setCurrentChatId(chatId);
    } catch (error) {
      console.error('Failed to load chat history', error);
    }
  };

  // Create a new chat
  const createNewChat = async (firstMessage = '') => {
    try {
      // Truncate the first message to use as chat name
      const chatName = firstMessage.length > 0 
        ? firstMessage.split(' ').slice(0, 5).join(' ').substring(0, 50)
        : `Chat ${new Date().toLocaleString()}`;
  
      const newChatId = await invoke('create_new_chat_command', { name: chatName });
      setCurrentChatId(newChatId);
      setMessages([]);
      return newChatId;
    } catch (error) {
      console.error('Failed to create new chat', error);
      return null;
    }
  };

  // Delete a chat
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

  // Submit message handler
  const handleSubmit = async () => {
    if (!input.trim() || isExecuting) return;

    const optimisticMessage = {
      text: input.trim(),
      isUser: true,
      optimistic: true
    };

    // Immediately add message to UI
    setMessages(prev => [...prev, optimisticMessage]);
    
    let chatId = currentChatId;
    let isNewlyCreatedChat = false;

    // If no current chat, create a new one
    if (!chatId) {
      try {
        chatId = await invoke('create_new_chat_command', { 
          name: `Chat ${new Date().toLocaleString()}`
        });
        setCurrentChatId(chatId);
        isNewlyCreatedChat = true; 
      } catch (error) {
        console.error('Failed to create new chat', error);
        return;
      }
    }

    // Rename the chat with the first meaningful message
    if (isNewlyCreatedChat) {
    try {
      await invoke('rename_chat_command', { 
        chatId: chatId,
        newName: input.trim().split(' ').slice(0, 5).join(' ').substring(0, 50)
      });
    } catch (error) {
      console.error('Failed to rename chat', error);
    }
  }

    // Prepare user message object
    const userMessage = {
      chat_id: chatId,
      content: input.trim(),
      is_user: true,
      timestamp: new Date().toISOString()
    };

    // Save user message to database
    try {
      await invoke('save_message_command', { 
        chatId: chatId,
        message: userMessage 
      });
    } catch (error) {
      console.error('Failed to save user message', error);
    }
    
    // Reset input
    setInput('');
  
    try {
      setIsExecuting(true);
      
      // Establish WebSocket connection
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
        // Handle streaming response
        if (event.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            currentResponse += reader.result;
            updateMessagesState(currentResponse);
          };
          reader.readAsText(event.data);
        } else {
          try {
            const status = JSON.parse(event.data);
            if (status.status?.includes('completed')) {
              // Save AI response to database when generation is complete
              saveAIResponse(currentResponse);
              
              setIsExecuting(false);
              ws.close();
            }
          } catch {
            // Accumulate response chunks
            currentResponse += event.data;
            updateMessagesState(currentResponse);
          }
        }
      };
  
      // Add placeholder for AI response
      setMessages(prev => [...prev, { text: '', isUser: false }]);
  
      ws.onclose = () => {
        setIsConnected(false);
        setIsExecuting(false);
      };
  
    } catch (error) {
      // Handle connection or processing errors
      handleSubmitError(error);
    }
  
    // Helper function to update messages state
    function updateMessagesState(response) {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          text: response,
          isUser: false
        };
        return newMessages;
      });
    }
  
    // Helper function to save AI response
    async function saveAIResponse(response) {
      const aiMessage = {
        chat_id: currentChatId,
        content: response,
        is_user: false,
        timestamp: new Date().toISOString()
      };
  
      try {
        await invoke('save_message_command', { 
          chatId: currentChatId, 
          message: aiMessage 
        });
      } catch (error) {
        console.error('Failed to save AI message', error);
      }
    }
  
    // Helper function to handle submission errors
    function handleSubmitError(error) {
      setMessages(prev => [...prev, { 
        text: `Error: ${error.message}\n\nPlease try again or check your connection.`, 
        isUser: false 
      }]);
      setIsExecuting(false);
    }
  };

  // Handle Enter key for submission
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Scroll to bottom effect
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Load chats periodically
  useEffect(() => {
    const loadChats = async () => {
      try {
        const chats = await invoke('get_all_chats_command');
        
        // Only update if there are changes
        const hasChanges = JSON.stringify(chats) !== JSON.stringify(availableChats);
        
        if (hasChanges) {
          setAvailableChats(chats);
          setLastUpdateTime(Date.now());
        }
      } catch (error) {
        console.error('Failed to load chats', error);
      }
    };

    // More frequent updates for responsiveness
    const intervalId = setInterval(loadChats, 1000);
    return () => clearInterval(intervalId);
  }, [availableChats]);

  // Online/Offline status tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
        <lam.MessageWrapper>
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
          </lam.MessageWrapper>
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
