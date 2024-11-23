import styled from "styled-components";


export const darkTheme = {
    primaryColor: "#1a1b26", 
    secondaryColor: "#1f2335",  
    tertiaryColor: "#16171f",  
    accentColor: "#b05a00", 
    highlightColor: "#c26400",
    bgColor: "#1a1b26",
    textColor: "#a9b1d6",
    textColor2: "#f0f0f0", 
    sentBubbleColor: "rgba(176, 90, 0, 0.6)", 
    receivedBubbleColor: "rgba(22, 23, 31, 0.9)",  
    receivedTextColor: "#a9b1d6", 
    borderColor: "#2f3240", 
    hoverColor: "rgba(176, 90, 0, 0.08)",
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
  background: ${({ theme }) =>
    `linear-gradient(135deg, ${theme.bgColor} 0%, ${theme.secondaryColor} 100%)`};
  color: ${({ theme }) => theme.textColor};
  overflow: hidden;
`;

export const TerminalWrapper = styled.div`
  height: ${(props) => props.height}px;
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

export const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: ${({ theme }) => `${theme.bgColor}CC`};
`;

export const ChatInput = styled.input`
  flex: 1;
  padding: 10px 15px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  background-color: ${({ theme }) => `${theme.secondaryColor}4D`};
  color: ${({ theme }) => theme.textColor};
  transition: all 0.3s;

  &::placeholder {
    color: ${({ theme }) => `${theme.textColor}80`};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.highlightColor};
    background-color: ${({ theme }) => `${theme.secondaryColor}80`};
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
export const ContentWrapper = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
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
export const Panel = styled.div`
  display: ${props => props.visible ? 'flex' : 'none'};
  flex-direction: column;
  background-color: ${({ theme }) => `${theme.primaryColor}E6`};
  overflow: hidden;
  transition: width 0.3s ease;
`;
export const PanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
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
