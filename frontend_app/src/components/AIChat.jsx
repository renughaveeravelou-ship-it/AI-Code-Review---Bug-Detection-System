import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Terminal, 
  User, 
  Bot, 
  FileCode, 
  ChevronRight, 
  Sparkles,
  RefreshCw,
  Cpu,
  AlertTriangle
} from 'lucide-react';

// Custom lightweight Markdown parser for chat messages
function parseMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let codeBlock = false;
  let codeLines = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (codeBlock) {
        elements.push(
          <div className="code-wrapper" key={key++} style={{ margin: '8px 0', border: '1px solid var(--glass-border)', borderRadius: '6px', background: '#090d16', padding: '12px' }}>
            <pre style={{ margin: 0, overflowX: 'auto' }}>
              <code style={{ color: '#e2e8f0', background: 'transparent', padding: 0, fontSize: '0.85rem', fontFamily: 'var(--mono)' }}>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        codeLines = [];
        codeBlock = false;
      } else {
        codeBlock = true;
      }
      continue;
    }

    if (codeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} style={{ marginTop: '16px', marginBottom: '8px', fontSize: '1.15rem', fontWeight: 600, color: '#fff' }}>{line.replace('### ', '')}</h3>);
    } else if (line.startsWith('- ')) {
      const listItems = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        const cleanItem = lines[i].replace('- ', '');
        const boldParts = cleanItem.split('**');
        const renderedParts = [];
        for (let idx = 0; idx < boldParts.length; idx++) {
          if (idx % 2 === 1) {
            renderedParts.push(<strong key={idx} style={{ color: 'var(--accent-secondary)' }}>{boldParts[idx]}</strong>);
          } else {
            renderedParts.push(boldParts[idx]);
          }
        }
        listItems.push(<li key={key++} style={{ marginBottom: '4px' }}>{renderedParts}</li>);
        i++;
      }
      i--;
      elements.push(<ul key={key++} style={{ paddingLeft: '16px', marginBottom: '10px', listStyleType: 'disc' }}>{listItems}</ul>);
    } else if (line.trim()) {
      const boldParts = line.split('**');
      const renderedParts = [];
      for (let idx = 0; idx < boldParts.length; idx++) {
        if (idx % 2 === 1) {
          renderedParts.push(<strong key={idx} style={{ color: 'var(--accent-secondary)' }}>{boldParts[idx]}</strong>);
        } else {
          renderedParts.push(boldParts[idx]);
        }
      }
      elements.push(<p key={key++} style={{ marginBottom: '8px', fontSize: '0.92rem', lineHeight: '1.5' }}>{renderedParts}</p>);
    }
  }
  return elements;
}

export default function AIChat({ activeReviewId, onSelectReview }) {
  const [historyList, setHistoryList] = useState([]);
  const [currentReview, setCurrentReview] = useState(null);
  const [selectedReviewId, setSelectedReviewId] = useState(activeReviewId || '');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  // Load reviews for context switcher dropdown
  const loadReviews = async () => {
    try {
      const res = await axios.get('/api/history');
      setHistoryList(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // Load chat messages and details for selected review
  const loadChatAndReview = async (id) => {
    if (!id) {
      // General Chat Context
      setCurrentReview(null);
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I am your AI Code Assistant. Upload a file in the Code Auditor tab to chat about it contextually, or ask me any general programming questions here!',
          timestamp: new Date().toISOString()
        }
      ]);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(`/api/history/${id}`);
      setCurrentReview(res.data.review);
      setMessages(res.data.chat_history || []);
    } catch (err) {
      console.error("Failed to load review chat details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    setSelectedReviewId(activeReviewId || '');
    if (activeReviewId) {
      loadChatAndReview(activeReviewId);
    } else {
      // Setup general chat if no active audit is present
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I am your AI Code Assistant. Upload a file in the Code Auditor tab to chat about it contextually, or ask me any general programming questions here!',
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [activeReviewId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleContextChange = (e) => {
    const val = e.target.value;
    setSelectedReviewId(val);
    if (val) {
      loadChatAndReview(val);
      if (onSelectReview) onSelectReview(val);
    } else {
      setCurrentReview(null);
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I am your AI Code Assistant. Upload a file in the Code Auditor tab to chat about it contextually, or ask me any general programming questions here!',
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setInputValue('');
    
    // Add user message to UI immediately (Short-term feedback)
    const tempUserMsg = {
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await axios.post('/api/chat', {
        message: userText,
        review_id: selectedReviewId || null
      });

      // Add assistant response to UI
      const tempAiMsg = {
        role: 'assistant',
        content: res.data.reply,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempAiMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error: Failed to fetch response. Please verify the backend is active.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', height: '620px', width: '100%', gap: '16px' }}>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Chat Control Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', gap: '12px', background: 'rgba(15, 22, 38, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
            <Terminal size={18} style={{ color: 'var(--accent-secondary)' }} />
            <div>
              <h4 style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>AI Quality Assistant</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Conversational recall & code refactoring console
              </span>
            </div>
          </div>
          
          {/* Active Context Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Context:</span>
            <select
              value={selectedReviewId}
              onChange={handleContextChange}
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
            >
              <option value="">General Coding Help</option>
              {historyList.map(h => (
                <option key={h.id} value={h.id}>{h.filename} (Score: {h.pylint_score ? `${h.pylint_score}/10` : 'N/A'})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Context Metrics Info Banner */}
        {currentReview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', background: 'rgba(99, 102, 241, 0.05)', borderBottom: '1px solid var(--glass-border)', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
            <FileCode size={14} style={{ color: 'var(--accent)' }} />
            <span>Audited **{currentReview.filename}**:</span>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Score: {currentReview.pylint_score}/10</span>
            <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>{currentReview.security_status}</span>
            <span className="badge badge-error" style={{ fontSize: '0.7rem' }}>{currentReview.complexity_label}</span>
          </div>
        )}

        {/* Message Feed Area */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(5, 8, 16, 0.2)' }}>
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  alignItems: 'flex-start',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                }}
              >
                {/* Bubble avatar */}
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: msg.role === 'user' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {msg.role === 'user' ? <User size={14} style={{ color: 'var(--accent-secondary)' }} /> : <Bot size={14} style={{ color: 'var(--accent)' }} />}
                </div>

                {/* Bubble content */}
                <div style={{ 
                  padding: '12px 16px', 
                  borderRadius: '12px', 
                  background: msg.role === 'user' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)', 
                  border: msg.role === 'user' ? '1px solid rgba(6, 182, 212, 0.15)' : '1px solid var(--glass-border)',
                  color: '#fff',
                  textAlign: 'left'
                }}>
                  {parseMarkdown(msg.content)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing/Loading indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', alignSelf: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={14} className="spinner" style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                AI Assistant is typing...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', padding: '16px 20px', borderTop: '1px solid var(--glass-border)', background: 'rgba(15, 22, 38, 0.5)', gap: '10px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={currentReview ? `Ask about "${currentReview.filename}" quality warnings or complexity...` : "Ask a general programming question..."}
            style={{ flexGrow: 1, padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
          />
          <motion.button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="btn-primary"
            style={{ marginTop: 0, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send size={18} />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
