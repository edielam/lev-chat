import styled, { css } from 'styled-components';

export const darkTheme = {
  name: 'dark',
  background: '#121619',     
  secondary: '#1E2429',         
  border: '#2C3640', 
  text: '#E2E8F0',             
  textStrong: '#FFFFFF',       
  accent: '#6D4C41',            
  accentHover: '#543a32',       
  error: '#E53935',     
  errorHover: '#FF5252',   
  success: '#43A047',    
  messageBackground: '#1E2429',
  chatBar: '#121619',  
  inputBackground: '#2C3640',   
  scrollbarTrack: '#1E2429',    
  scrollbarThumb: '#8D6E63',   
  progressbarTrack: '#2C3640',
  progressbarThumb: '#6D4C41',
};

export const lightTheme = {
  name: 'light',
  background: '#F5F1E7',       
  secondary: '#FFFFFF',         
  border: '#E0D2C1',            
  text: '#3A3335',              
  textStrong: '#1A1818',        
  accent: '#dbcabf',            
  accentHover: '#6D4C41',       
  error: '#C1292E',             
  errorHover: '#A01D26',        
  success: '#3E8914',           
  messageBackground: '#F3E5DC', 
  chatBar: '#F3E5DC', 
  inputBackground: '#FFFFFF',   
  scrollbarTrack: '#E9DFD3',    
  scrollbarThumb: '#dbcabf',    
  progressbarTrack: '#D5C1B1',  
  progressbarThumb: '#6D4C41',  
};

export const globalStyles = css`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
                "Helvetica Neue", Arial, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  letter-spacing: -0.02em;
  box-sizing: border-box;
`;

export const Container = styled.div`
  ${globalStyles}
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: ${props => props.theme.background};
  color: ${props => props.theme.text};
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
`;

export const Header = styled.header`
  background-color: ${props => props.theme.secondary};
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 10;
`;

export const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.scrollbarTrack};
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.scrollbarThumb};
    border-radius: 6px;
  }
`;
export const MessageWrapper = styled.div`
  flex: 1;
  max-width: 80%;
  margin-left: 10rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;
export const MessageContainer = styled.div`
  position: relative;
  width: fit-content;
  max-width: 80%; // Keep existing max-width
  min-width: 0; // Ensure flex items can shrink below their content size
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.02);
  }
`;

export const Message = styled.div`
  padding: 1rem;
  border-radius: 0.75rem;
  line-height: 1.5;
  white-space: pre-wrap;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%; // Ensure full width of container
  overflow-x: auto; // Allow horizontal scrolling if needed
  
  ${props => props.isUser ? `
    background-color: ${props.theme.accent};
    color: ${props.theme.text};
  ` : `
    background-color: ${props.theme.messageBackground};
    color: ${props.theme.text};
  `}
`;

export const InputContainer = styled.div`
  padding: 1rem 1.5rem;
  background-color: ${props => props.theme.secondary};
  border-top: 1px solid ${props => props.theme.border};
  box-shadow: 0 -2px 4px rgba(0,0,0,0.05);
`;

export const Input = styled.textarea`
  ${globalStyles}
  flex: 1;
  background-color: ${props => props.theme.inputBackground};
  border: 1px solid ${props => props.theme.border};
  border-radius: 0.75rem;
  padding: 1rem;
  color: ${props => props.theme.text};
  resize: none;
  min-height: 3rem;
  max-height: 150px;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.accent};
    box-shadow: 0 0 0 3px ${props => props.theme.accent}20;
  }

  &::placeholder {
    color: ${props => props.theme.text}80;
  }
`;

export const Button = styled.button`
  background-color: ${props => props.theme.accentHover};
  color: ${props => props.theme.text};
  border: none;
  border-radius: 0.75rem;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  font-weight: 500;

  &:hover {
    background-color: ${props => props.theme.accentHover};
    transform: translateY(-2px);
    box-shadow: 0 3px 6px rgba(0,0,0,0.1);
  }

  &:active {
    transform: translateY(1px);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  &:disabled {
    background-color: ${props => props.theme.border};
    color: ${props => props.theme.text}80;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;
export const HeaderGroup = styled.div`
display: flex;
align-items: center;
gap: 1rem;
`;

export const CopyButton = styled.button`
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

export const CopyText = styled.span`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

export const InputWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
`;

export const Title = styled.h1`
  font-size: 1.25rem;
  color: ${props => props.theme.textStrong};
  margin: 0;
  font-weight: 600;
`;

export const ThemeButton = styled(Button)`
  background-color: transparent;
  color: ${props => props.theme.text};
  padding: 0.5rem;
  
  &:hover {
    background-color: ${props => props.theme.messageBackground};
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const StopButton = styled(Button)`
  background-color: ${props => props.theme.error};
  
  &:hover {
    background-color: ${props => props.theme.errorHover};
  }
`;

export const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.isConnected ? props.theme.success : props.theme.error};
  font-size: 0.875rem;
`;

