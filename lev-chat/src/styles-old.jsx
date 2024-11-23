import styled from "styled-components";

export const darkTheme = {
  primaryColor: "#121212", // Softer black
  secondaryColor: "#1e1e1e", // Dark charcoal
  tertiaryColor: "#2a2a2a", // Medium charcoal
  accentColor: "#b05a00", // Muted burnt orange
  highlightColor: "#c26400", // Slightly lighter muted orange
  bgColor: "#0a0a0a", // Very dark gray for background
  textColor: "#d4d4d4", // Soft light gray for text
  textColor2: "#f0f0f0", // Off-white
  sentBubbleColor: "rgba(196, 90, 0, 0.6)", // Subtle muted orange
  receivedBubbleColor: "rgba(42, 42, 42, 0.9)", // Subtle medium charcoal
  sentTextColor: "#d4d4d4", // Soft light gray for sent text
  receivedTextColor: "#f0f0f0", // Off-white for received text
  borderColor: "rgba(212, 212, 212, 0.1)", // Subtle border color
  hoverColor: "rgba(176, 90, 0, 0.08)", // Subtle hover effect color
};

export const lightTheme = {
  primaryColor: "#fafafa", // Off-white
  secondaryColor: "#f0f0f0", // Light gray
  tertiaryColor: "#e6e6e6", // Medium light gray
  accentColor: "#b05a00", // Muted burnt orange (same as dark theme)
  highlightColor: "#c26400", // Slightly lighter muted orange (same as dark theme)
  bgColor: "#f7f7f7", // Soft off-white for background
  textColor: "#2e2e2e", // Soft black for text
  textColor2: "#fafafa", // Off-white
  sentBubbleColor: "rgba(176, 90, 0, 0.08)", // Very light muted orange
  receivedBubbleColor: "rgba(230, 230, 230, 0.5)", // Light gray
  sentTextColor: "#2e2e2e", // Soft black for sent text
  receivedTextColor: "#2e2e2e", // Soft black for received text
  borderColor: "rgba(46, 46, 46, 0.1)", // Subtle border color
  hoverColor: "rgba(176, 90, 0, 0.04)", // Very light hover effect color
};

export const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.bgColor} 0%, ${theme.secondaryColor} 100%)`};
  color: ${({ theme }) => theme.textColor};
  overflow: hidden;
`;

export const TerminalWrapper = styled.div`
height: ${props => props.height}px;
min-height: 50px;
max-height: calc(100% - 50px);
display: flex;
flex-direction: column;
overflow: hidden;
position: relative;
`;

export const MainContent = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
`;

export const Sidebar = styled.div`
  width: 3.5rem;
  height: 100%;
  background-color: ${({ theme }) => theme.secondaryColor};
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 2rem;
  transition: width 0.3s ease;
  overflow: hidden;
`;

export const Logo = styled.div`
  margin-bottom: 20px;
  cursor: pointer;

  img {
    width: 40px;
    height: 40px;
  }
`;

export const ContentWrapper = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

export const PanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`;

export const Footer = styled.footer`
  width: 100%;
  height: 2rem; 
  background-color: ${({ theme }) => theme.secondaryColor};
  display: flex;
  align-items: center;
  justify-content: flex-end; 
  padding-right: 10px; 
  font-size: 1.2rem;
  color: ${({ theme }) => theme.textColor}; 
  border-top: 1px solid ${({ theme }) => theme.borderColor}; 
`;

export const HomePage = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
  padding: 40px;
  box-sizing: border-box;
  background-color: ${({ theme }) => theme.bgColor};

  .logo-container {
    display: flex;
    align-items: center;
    margin-bottom: 20px;

    img {
      width: 80px;
      height: 80px;
      margin-right: 20px;
    }

    h1 {
      font-size: 36px;
      margin: 0;
      color: ${({ theme }) => theme.textColor};
    }
  }

  > p {
    font-size: 18px;
    margin-bottom: 40px;
    max-width: 600px;
    line-height: 1.5;
  }
`;

export const FeatureCard = styled.div`
  background-color: ${({ theme }) => theme.secondaryColor};
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }

  svg {
    font-size: 2.5rem;
    margin-bottom: 15px;
    color: ${({ theme }) => theme.accentColor};
  }

  h3 {
    margin-bottom: 10px;
    color: ${({ theme }) => theme.textColor};
  }

  p {
    color: ${({ theme }) => theme.textColor};
  }
`;

export const Button = styled.button`
  padding: 12px 24px;
  font-size: 16px;
  background-color: ${({ theme, primary }) => primary ? theme.accentColor : theme.secondaryColor};
  color: ${({ theme, primary }) => primary ? theme.primaryColor : theme.textColor};
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;

  &:hover {
    background-color: ${({ theme, primary }) => primary ? theme.highlightColor : theme.tertiaryColor};
    transform: scale(1.05);
  }
`;

export const DockerConfigPage = styled.div`
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.bgColor} 0%, ${theme.secondaryColor} 100%)`};
`;

export const ConfigForm = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;

  textarea {
    width: 100%;
    padding: 10px;
    border-radius: 5px;
    border: 1px solid ${({ theme }) => theme.borderColor};
    background-color: ${({ theme }) => theme.primaryColor};
    color: ${({ theme }) => theme.textColor};
    font-family: monospace;
    resize: vertical;
  }
`;

export const StatusIndicator = styled.div`
  display: inline-block;
  padding: 8px 12px;
  border-radius: 20px;
  background-color: ${props => props.active ? '#4CAF50' : '#F44336'};
  color: white;
  font-weight: bold;
  text-align: center;
  margin-bottom: 15px;
`;

export const Panel = styled.div`
  display: ${props => props.visible ? 'flex' : 'none'};
  flex-direction: column;
  background-color: ${({ theme }) => `${theme.primaryColor}E6`};
  overflow: hidden;
  transition: width 0.3s ease;
`;

export const IconButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.accentColor};
  font-size: 22px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  margin: 0 5px;
  padding-bottom: 1rem;

  &:hover {
    color: ${({ theme }) => theme.highlightColor};
    text-shadow: 0 0 10px ${({ theme }) => theme.highlightColor};
  }

  &:after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    border-radius: 10%;
    transition: all 0.3s;
  }
`;

export const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  border-top: 1px solid ${({ theme }) => theme.tertiaryColor};
`;

export const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: ${({ theme }) => `${theme.bgColor}CC`};

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.secondaryColor};
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.tertiaryColor};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.accentColor};
  }

  .sent,
  .received {
    display: flex;
    align-items: flex-start;
    margin-bottom: 15px;
  }

  .sent {
    flex-direction: row-reverse;
  }

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    margin: 0 10px;
  }

  .content {
    padding: 10px 15px;
    border-radius: 18px;
    max-width: 70%;
    word-wrap: break-word;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }

  .sent .content {
    background-color: ${({ theme }) => theme.sentBubbleColor};
    color: ${({ theme }) => theme.sentTextColor};
  }

  .received .content {
    background-color: ${({ theme }) => theme.receivedBubbleColor};
    color: ${({ theme }) => theme.receivedTextColor};
  }
`;

export const ChatInputContainer = styled.div`
  display: flex;
  padding: 15px;
  background-color: ${({ theme }) => theme.secondaryColor};
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
`;

export const ChatInput = styled.input`
  flex: 1;
  padding: 10px 15px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  background-color: ${({ theme }) => `${theme.tertiaryColor}4D`};
  color: ${({ theme }) => theme.textColor};
  transition: all 0.3s;

  &::placeholder {
    color: ${({ theme }) => `${theme.textColor}80`};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.highlightColor};
    background-color: ${({ theme }) => `${theme.tertiaryColor}80`};
  }
`;

export const SendButton = styled.button`
  background-color: ${({ theme }) => theme.accentColor};
  color: ${({ theme }) => theme.primaryColor};
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  margin-left: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;

  &:hover {
    background-color: ${({ theme }) => theme.highlightColor};
  }

  &:active {
    transform: scale(0.95);
  }
`;

export const ChatOverlayContainer = styled.div`
  position: fixed;
  top: 60%;
  left: 80%;
  transform: translate(-50%, -50%);
  width: 25rem;
  height: 40rem;
  background-color: ${({ theme }) => `${theme.primaryColor}E6`};
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  z-index: 1000;
`;

export const ChatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: ${({ theme }) => theme.secondaryColor};
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  color: ${({ theme }) => theme.textColor};
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.textColor};
  font-size: 20px;
  cursor: pointer;
  transition: color 0.3s;

  &:hover {
    color: ${({ theme }) => theme.highlightColor};
  }
`;

export const ChatButtonContainer = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.accentColor};
  color: ${({ theme }) => theme.primaryColor};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;

  &:hover {
    background-color: ${({ theme }) => theme.highlightColor};
    transform: scale(1.1);
  }
`;

export const EditorTerminalContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.tertiaryColor};
  border-radius: 5px;
  box-shadow: 0 0 20px ${({ theme }) => `${theme.accentColor}1A`};
`;

export const HorResizer = styled.div`
  height: 3px;
  background-color: ${({ theme }) => theme.tertiaryColor};
  cursor: row-resize;
  &:hover {
    background-color: ${({ theme }) => theme.accentColor};
  }
`;

export const VerResizer = styled.div`
  height: 100%;
  width: 3px;
  background-color: ${({ theme }) => theme.tertiaryColor};
  cursor: col-resize;
  &:hover {
    background-color: ${({ theme }) => theme.accentColor};
  }
`;
export const VerResizer2 = styled.div`
  height: 100%;
  width: 3px;
  background-color: ${({ theme }) => theme.primaryColor};
`;

export const ChatBox = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-top: 0.5px solid ${({ theme }) => theme.tertiaryColor};
  border-right: 0.5px solid ${({ theme }) => theme.tertiaryColor};
`;

export const ThemeToggle = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.textColor};
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.3s ease;

  &:hover {
    color: ${({ theme }) => theme.accentColor};
  }
`;