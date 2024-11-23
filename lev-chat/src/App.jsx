// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { invoke } from "@tauri-apps/api/tauri";
// import {
//   FaFolderOpen,
//   FaCode,
//   FaTerminal,
//   FaHome,
//   FaCog,
//   FaDocker,
//   FaGlobe,
// } from "react-icons/fa";
// // import EditorComponent from "./EditorComp";
// import TerminalComponent from "./t3";
// import FileExplorer from "./FileExplorer2";
// import ImprovedHomePage from "./Home";
// import PeerAddressManagement from "./PeerAddressManagement";
// import ChatOverlay from "./components/chatOverlay";
// import {
//   AppContainer,
//   MainContent,
//   Panel,
//   IconButton,
//   EditorTerminalContainer,
//   VerResizer,
//   Sidebar,
//   Footer,
//   Logo,
//   ContentWrapper,
//   PanelContainer,
// } from "./styles";
// import ComputeRequestUI from "./components/square";
// // import MLTrainingUI from "./components/mergeUI";
// import CollaborativeEditor from "./components/EditorWithML";

// function App() {
//   const [message, setMessage] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [activePanel, setActivePanel] = useState("home");
//   const [showTerminal, setShowTerminal] = useState(false);
//   const [terminalKey, setTerminalKey] = useState(0);
//   const [showChat, setShowChat] = useState(true);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [showFileExplorer, setShowFileExplorer] = useState(false);
//   const [fileExplorerWidth, setFileExplorerWidth] = useState(20);
//   const containerRef = useRef(null);

//   useEffect(() => {
//     fetchMessages();
//     const interval = setInterval(fetchMessages, 50);
//     return () => clearInterval(interval);
//   }, []);

//   useEffect(() => {
//     const handleResize = () => {
//       setActivePanel((prevPanel) => prevPanel);
//     };

//     window.addEventListener("resize", handleResize);
//     return () => {
//       window.removeEventListener("resize", handleResize);
//     };
//   }, []);

//   const fetchMessages = async () => {
//     try {
//       if (window.__TAURI_IPC__) {
//         const response = await invoke("get_messages");
//         const formattedMessages = response.map((msg) => {
//           if (typeof msg === "string") {
//             return { sender: "peer", content: msg };
//           } else if (typeof msg === "object" && msg.content) {
//             return { sender: msg.sender || "peer", content: msg.content };
//           } else {
//             return { sender: "unknown", content: JSON.stringify(msg) };
//           }
//         });
//         setMessages(formattedMessages);
//       }
//     } catch (error) {
//       console.error("Failed to fetch messages:", error);
//     }
//   };
//   const handleSendFile = async (event) => {
//     const file = event.target.files[0];
//     if (file) {
//       try {
//         // Read the file as an ArrayBuffer
//         const arrayBuffer = await file.arrayBuffer();
//         // Convert ArrayBuffer to Uint8Array
//         const uint8Array = new Uint8Array(arrayBuffer);
        
//         // Invoke the command with file name and content
//         await invoke('share_file', { 
//           fileName: file.name,
//           fileContent: Array.from(uint8Array) // Convert Uint8Array to regular array
//         });
        
//         setMessage(`Sharing file: ${file.name}`);
//         handleSendMessage();
//       } catch (error) {
//         console.error('Error sharing file:', error);
//       }
//     }
//   };
//   const handleSendMessage = async () => {
//     if (message.trim()) {
//       try {
//         await invoke("send_message", { content: message.trim() });
//         setMessage("");
//         fetchMessages();
//       } catch (error) {
//         console.error("Failed to send message:", error);
//       }
//     }
//   };

//   const handleFileSelect = (filePath) => {
//     setSelectedFile(filePath);
//   };

//   const handleResize = (e) => {
//     const startY = e.clientY;
//     const startHeight = terminalHeight;

//     const doDrag = (e) => {
//       const newHeight = startHeight - (e.clientY - startY);
//       setTerminalHeight(
//         Math.max(50, Math.min(newHeight, window.innerHeight - 200)),
//       );
//     };

//     const stopDrag = () => {
//       document.removeEventListener("mousemove", doDrag);
//       document.removeEventListener("mouseup", stopDrag);
//     };

//     document.addEventListener("mousemove", doDrag);
//     document.addEventListener("mouseup", stopDrag);
//   };

//   const verResize = (e) => {
//     e.preventDefault();
//     const startX = e.clientX;
//     const startWidth = chatWidth;

//     const doPull = (e) => {
//       const containerWidth = containerRef.current.getBoundingClientRect().width;
//       const pull = startX - e.clientX;
//       const newChatWidth = startWidth + (pull / containerWidth) * 100;
//       setChatWidth(Math.max(20, Math.min(newChatWidth, 80)));
//     };

//     const stopPull = () => {
//       document.removeEventListener("mousemove", doPull);
//       document.removeEventListener("mouseup", stopPull);
//     };

//     document.addEventListener("mousemove", doPull);
//     document.addEventListener("mouseup", stopPull);
//   };

//   const handlePanelChange = (newPanel) => {
//     setActivePanel(newPanel);
//   };

//   const handleCloseTerminal = () => {
//     setShowTerminal(false);
//   };

//   const toggleChat = () => {
//     setShowChat((prev) => !prev);
//   };

//   const toggleFileExplorer = () => {
//     setShowFileExplorer((prev) => !prev);
//   };

//   const startNewTerminal = () => {
//     if (!showTerminal) {
//       setShowTerminal(true);
//       setTerminalKey((prevKey) => prevKey + 1);
//     }
//   };

//   const fileExplorerResize = (e) => {
//     e.preventDefault();
//     const startX = e.clientX;
//     const startWidth = fileExplorerWidth;

//     const doPull = (e) => {
//       const containerWidth = containerRef.current.getBoundingClientRect().width;
//       const pull = e.clientX - startX;
//       const newFileExplorerWidth = startWidth + (pull / containerWidth) * 100;
//       setFileExplorerWidth(Math.max(10, Math.min(newFileExplorerWidth, 30)));
//     };

//     const stopPull = () => {
//       document.removeEventListener("mousemove", doPull);
//       document.removeEventListener("mouseup", stopPull);
//     };

//     document.addEventListener("mousemove", doPull);
//     document.addEventListener("mouseup", stopPull);
//   };
//   const sidebarButtons = [
//     { icon: <FaHome />, panel: "home" },
//     // { icon: <FaDocker />, panel: "docker" },
//     { icon: <FaCode />, panel: "editor" },
//     { icon: <FaGlobe />, panel: "peer" },
//   ];

//   return (
//     <AppContainer>
//       <ContentWrapper>
//         <Sidebar>
//           <Logo 
//             //  onClick={() => handlePanelChange("sender")}
//           >
//             <img
//               src="https://raw.githubusercontent.com/edielam/TerminalEditor-CC/main/icon.png"
//               alt="Logo"
//             />
//           </Logo>
//           {sidebarButtons.map((button) => (
//             <IconButton
//               key={button.panel}
//               onClick={() => handlePanelChange(button.panel)}
//             >
//               {button.icon}
//             </IconButton>
//           ))}
//           {activePanel === "editor" && (
//             <>
//               <IconButton onClick={toggleFileExplorer}>
//                 <FaFolderOpen />
//               </IconButton>
//               <IconButton
//                 onClick={startNewTerminal}
//               >
//                 <FaTerminal />
//               </IconButton>
//             </>
//           )}
//         </Sidebar>
//         <MainContent ref={containerRef}>
//           <PanelContainer>
//             <Panel style={{ display: activePanel === "home" ? "flex" : "none" }}>
//               <ImprovedHomePage 
//                 onStartCoding={() => setActivePanel("editor")}
//                 onOpenPeerConfig={() => handlePanelChange("peer")}
//               />
//             </Panel>
//             <Panel style={{ display: activePanel === "editor" ? "flex" : "none", flexDirection: "row", flex: 1 }}>
//               {showFileExplorer && (
//                 <>
//                   <Panel
//                     style={{
//                       width: `${fileExplorerWidth}%`,
//                       display: showFileExplorer ? 'flex' : 'none'
//                     }}
//                   >
//                     <FileExplorer onFileSelect={handleFileSelect} />
//                   </Panel>
//                   <VerResizer onMouseDown={fileExplorerResize} />
//                 </>
//               )}
//               <EditorTerminalContainer style={{ display: "flex", flexDirection: "row", flex: 1 }}>
//                 <div style={{ width: showTerminal ? "60%" : "100%", height: "100%" }}>
//                   <CollaborativeEditor
//                     height="100%"
//                     selectedFile={selectedFile}
//                   />
//                 </div>
//                 {showTerminal && (
//                   <div style={{
//                     width: "40%",
//                     height: "100%",
//                     display: "flex",
//                     flexDirection: "column",
//                     overflow: "hidden",
//                     position: "relative",
//                   }}>
//                     <TerminalComponent
//                       key={terminalKey}
//                       onClose={handleCloseTerminal}
//                     />
//                   </div>
//                 )}
//               </EditorTerminalContainer>
//               {/* {!showChat && <ChatButton onClick={() => setShowChat(true)} />} */}
//               {showChat && (
//                 <ChatOverlay
//                   messages={messages}
//                   message={message}
//                   setMessage={setMessage}
//                   handleSendMessage={handleSendMessage}
//                   handleSendFile={handleSendFile}
//                 />
//               )}
//             </Panel>
//             {/* <Panel style={{ display: activePanel === "docker" ? "flex" : "none" }}>
//               <MLTrainingUI />
//             </Panel> */}
//             <Panel style={{ display: activePanel === "peer" ? "flex" : "none" }}>
//               <PeerAddressManagement />
//             </Panel>
//             {/* <Panel style={{ display: activePanel === "sender" ? "flex" : "none" }}>
//               <ComputeRequestUI/>
//             </Panel> */}
//             {/* <Panel style={{ display: activePanel === "term" ? "flex" : "none" }}>
//               <LLMTestComponent />
//             </Panel> */}
//           </PanelContainer>
//         </MainContent>
//       </ContentWrapper>
//       <Footer>
//         <FaCog  /> {/* onClick={() => handlePanelChange("term")} */}
//       </Footer>
//     </AppContainer>
//   );
// }

// export default App;