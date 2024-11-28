import React, {useState} from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark, coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import styled from 'styled-components';
import { Copy, CheckCheck } from 'lucide-react';
import * as lam from './lamastyles'

const MarkdownContainer = styled.div`
  pre {
    background-color: ${props => props.theme.secondary} !important;
    border-radius: 0.5rem;
    padding: 0.8rem;
    overflow-x: auto;
  }

  code {
    font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
    font-size: 0.9rem;
  }
    .copy-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: ${props => props.theme.background};
    border: 1px solid ${props => props.theme.border};
    border-radius: 0.25rem;
    padding: 0.25rem;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      opacity: 1;
    }
  }

  a {
    color: ${props => props.theme.accent};
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: ${props => props.theme.accentHover};
      text-decoration: underline;
    }
  }

  blockquote {
    border-left: 4px solid ${props => props.theme.accent};
    margin: 1rem 0;
    padding-left: 1rem;
    font-style: italic;
    color: ${props => props.theme.text}80;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }

  th, td {
    border: 1px solid ${props => props.theme.border};
    padding: 0.5rem;
    text-align: left;
  }

  th {
    background-color: ${props => props.theme.secondary};
    color: ${props => props.theme.textStrong};
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
          {text}
        </ReactMarkdown>
         )}
      </MarkdownContainer>
    );
  };
  
export default StreamingMarkdownRenderer;