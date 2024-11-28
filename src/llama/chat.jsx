import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const SidebarContainer = styled.div`
  width: ${props => props.isOpen ? '250px' : '0px'};
  background-color: ${props => props.theme.secondary};
  border-right: 1px solid ${props => props.theme.border};
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 10;
  overflow: hidden;
  transition: width 0.3s ease;
`;

const ToggleButton = styled.button`
  position: absolute;
  left: ${props => props.isOpen ? '250px' : '0px'};
  top: 30%;
  transform: translateY(-50%);
  background-color: ${props => props.theme.accentHover};
  border: 1px solid ${props => props.theme.border};
  border-left: none;
  padding: 0.5rem;
  cursor: pointer;
  z-index: 11;
  transition: left 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.accent};
  }
`;

const SidebarContent = styled.div`
  display: ${props => props.isOpen ? 'flex' : 'none'};
  flex-direction: column;
  height: 100%;
  opacity: ${props => props.isOpen ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const NewChatButton = styled.button`
  background-color: ${props => props.theme.accent};
  color: ${props => props.theme.text};
  border: none;
  padding: 0.75rem;
  margin: 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.accentHover};
  }
`;

const ChatList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const ChatItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.messageBackground};
  }

  ${props => props.isActive && `
    background-color: ${props.theme.messageBackground};
    font-weight: bold;
  `}
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.error};
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;

  &:hover {
    background-color: ${props => props.theme.errorHover}20;
  }
`;

const ChatSidebar = ({ 
  chats, 
  currentChatId, 
  onNewChat, 
  onSelectChat, 
  onDeleteChat 
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <ToggleButton 
        isOpen={isOpen} 
        onClick={toggleSidebar}
        title={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
      </ToggleButton>
      <SidebarContainer isOpen={isOpen}>
        <SidebarContent isOpen={isOpen}>
          <NewChatButton onClick={onNewChat}>
            + New Chat
          </NewChatButton>
          <ChatList>
            {chats.map(chat => (
              <ChatItem 
                key={chat.id} 
                isActive={chat.id === currentChatId}
                onClick={() => onSelectChat(chat.id)}
              >
                <span>{chat.name}</span>
                <DeleteButton 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent selecting chat when deleting
                    onDeleteChat(chat.id);
                  }}
                >
                  🗑️
                </DeleteButton>
              </ChatItem>
            ))}
          </ChatList>
        </SidebarContent>
      </SidebarContainer>
    </>
  );
};

export default ChatSidebar;