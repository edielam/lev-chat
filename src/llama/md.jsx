import React, {useState} from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark, coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import styled from 'styled-components';
import { Copy, CheckCheck } from 'lucide-react';
import * as lam from './lamastyles'

const MarkdownContainer = styled.div`
  a {
    color: ${props => props.theme.accent};
  }

  pre {
    background-color: ${props => props.theme.secondary} !important;
  }
`;

const CodeBlock = ({ children, language,  isDarkMode }) => {
    const [copied, setCopied] = useState(false);
  
    const handleCopy = () => {
      navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
  
    return (
      <div style={{ position: 'relative' }}>
        <SyntaxHighlighter
          style={isDarkMode ? dark : coy}
          language={language}
          PreTag="pre"
        >
          {children}
        </SyntaxHighlighter>
        <lam.Button 
          className="copy-button" 
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <CheckCheck size={16} />
          ) : (
            <Copy size={16} />
          )}
        </lam.Button>
      </div>
    );
  };

  const StreamingMarkdownRenderer = ({ text, isDarkMode }) => {
    const isModelLine = text.trim().startsWith('Model:') && text.includes('.gguf');
    const cleanText = (inputText) => {
        // Replace multiple consecutive newlines with two newlines maximum
        return inputText.replace(/\n{3,}/g, '\n\n')
          // Remove leading and trailing whitespace from each line
          .split('\n')
          .map(line => line.trim())
          // Remove completely empty lines
          .filter(line => line.length > 0)
          .join('\n');
      };
  
    return (
      <MarkdownContainer>
        {isModelLine ? (
        <div style={{ 
          color: isDarkMode ? '#00ff00' : 'green', 
          fontWeight: 'bold',
          fontStyle: 'italic'
        }}>
          {text}
        </div>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <CodeBlock language={match[1]} isDarkMode={isDarkMode}>
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
         {cleanText(text)}
        </ReactMarkdown>
         )}
      </MarkdownContainer>
    );
  };
  
export default StreamingMarkdownRenderer;