import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import Lottie from 'lottie-react';
const LottieComponent = Lottie ? (Lottie.default || Lottie) : null;
import { 
  UploadCloud, 
  Shield, 
  Zap, 
  Cpu, 
  AlertTriangle, 
  Sparkles, 
  Terminal, 
  Code, 
  FileCode, 
  CheckCircle2, 
  XCircle, 
  AlertCircle 
} from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

// Helper to render Markdown elements safely in React
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
          <div className="code-wrapper" key={key++}>
            <pre style={{ margin: 0 }}>
              <code style={{ color: '#e2e8f0', background: 'transparent', padding: 0 }}>{codeLines.join('\n')}</code>
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
      elements.push(<h3 key={key++} style={{ marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem', fontWeight: 600 }}>{line.replace('### ', '')}</h3>);
    } else if (line.startsWith('#### ')) {
      elements.push(<h4 key={key++} style={{ marginTop: '18px', marginBottom: '8px', fontSize: '1.05rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>{line.replace('#### ', '')}</h4>);
    } 
    else if (line.startsWith('- ')) {
      const listItems = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        const cleanItem = lines[i].replace('- ', '');
        const boldParts = cleanItem.split('**');
        const renderedParts = [];
        for (let idx = 0; idx < boldParts.length; idx++) {
          if (idx % 2 === 1) {
            renderedParts.push(<strong key={idx}>{boldParts[idx]}</strong>);
          } else {
            renderedParts.push(boldParts[idx]);
          }
        }
        listItems.push(<li key={key++} style={{ marginBottom: '6px' }}>{renderedParts}</li>);
        i++;
      }
      i--;
      elements.push(<ul key={key++} style={{ paddingLeft: '20px', marginBottom: '16px' }}>{listItems}</ul>);
    }
    else if (line.startsWith('> [!NOTE]') || line.startsWith('> [!WARNING]')) {
      const alertType = line.includes('WARNING') ? 'warning' : 'note';
      const alertLines = [];
      i++;
      while (i < lines.length && lines[i].startsWith('> ')) {
        alertLines.push(lines[i].replace('> ', ''));
        i++;
      }
      i--;
      elements.push(
        <div 
          key={key++} 
          style={{
            padding: '14px 18px',
            margin: '18px 0',
            borderLeft: `4px solid ${alertType === 'warning' ? 'var(--warning)' : 'var(--accent)'}`,
            background: alertType === 'warning' ? 'var(--warning-bg)' : 'var(--accent-glow)',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px',
            fontSize: '0.9rem',
            color: alertType === 'warning' ? 'var(--warning-text)' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          {alertType === 'warning' ? <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} /> : <Sparkles size={18} style={{ flexShrink: 0, marginTop: '2px' }} />}
          <div>{alertLines.join(' ')}</div>
        </div>
      );
    }
    else if (line.trim()) {
      const boldParts = line.split('**');
      const renderedParts = [];
      for (let idx = 0; idx < boldParts.length; idx++) {
        if (idx % 2 === 1) {
          renderedParts.push(<strong key={idx}>{boldParts[idx]}</strong>);
        } else {
          renderedParts.push(boldParts[idx]);
        }
      }
      elements.push(<p key={key++} style={{ marginBottom: '12px' }}>{renderedParts}</p>);
    }
  }

  return elements;
}

export default function UploadBox({ activeReviewId, onAnalysisComplete, onNavigateToChat }) {
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [lottieData, setLottieData] = useState(null);
  
  const fileInputRef = useRef(null);

  // Load past review if activeReviewId changes
  useEffect(() => {
    if (activeReviewId) {
      const loadPastReview = async () => {
        setLoading(true);
        setLoadingStep('Retrieving historical audit from memory...');
        try {
          const res = await axios.get(`/api/history/${activeReviewId}`);
          setResult(res.data.review.full_report_json);
          setFileContent(res.data.review.code);
          setFile({ name: res.data.review.filename, size: 0 }); 
        } catch (e) {
          console.error("Failed to load historical review", e);
        } finally {
          setLoading(false);
        }
      };
      loadPastReview();
    }
  }, [activeReviewId]);

  // Fetch Lottie JSON on component mount with internet-safe try/catch
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/airbnb/lottie-web/master/demo/bodymovin/data.json')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Fallback to standard spinner');
      })
      .then(data => setLottieData(data))
      .catch(err => console.warn('Lottie loading bypassed. Using default spinner.'));
  }, []);

  // GSAP staggered reveal for dashboard cards when results are ready
  useEffect(() => {
    if (result && !loading) {
      gsap.fromTo('.summary-card', 
        { opacity: 0, y: 30, scale: 0.95 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.7, 
          stagger: 0.12, 
          ease: 'power2.out',
          clearProps: 'all' // Prevents conflict with hover transition CSS
        }
      );
    }
  }, [result, loading]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    setFile(selectedFile);
    
    // Read the file contents for source viewer
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target.result);
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setResult({ error: 'Please choose a file before uploading.' });
      return;
    }

    // Start animated loading states
    setLoading(true);
    setResult(null);
    setLoadingStep('Uploading code script...');

    const timers = [
      setTimeout(() => setLoadingStep('Running Pylint code quality static audit...'), 1000),
      setTimeout(() => setLoadingStep('Auditing security vulnerabilities with Bandit...'), 2200),
      setTimeout(() => setLoadingStep('Calculating radon McCabe complexity metrics...'), 3500),
      setTimeout(() => setLoadingStep('Predicting logical bug risk with CodeBERT classifier...'), 4600),
      setTimeout(() => setLoadingStep('Requesting AI review recommendations...'), 5800)
    ];

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setResult(response.data);
      if (response.data && response.data.analyzed_code) {
        setFileContent(response.data.analyzed_code);
      }
      if (response.data && response.data.id) {
        if (onAnalysisComplete) {
          onAnalysisComplete(response.data.id);
        }
      }
      setActiveTab('summary');
    } catch (error) {
      const responseData = error.response?.data;
      const message = responseData
        ? typeof responseData === 'string'
          ? responseData
          : JSON.stringify(responseData, null, 2)
        : error.message || 'Upload analysis failed.';

      setResult({ error: message });
    } finally {
      // Clear timers
      timers.forEach(clearTimeout);
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'success') return <span className="badge badge-success">Passed</span>;
    if (status === 'warning') return <span className="badge badge-warning">Warning</span>;
    return <span className="badge badge-error">Failed</span>;
  };

  const getComplexityFillColor = (comp) => {
    if (comp <= 3) return 'var(--success)';
    if (comp <= 5) return 'var(--accent-secondary)';
    if (comp <= 10) return 'var(--warning)';
    return 'var(--error)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      
      {/* Upload Panel */}
      <motion.div 
        className="upload-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div 
          className={`dropzone glass-panel ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          whileHover={{ scale: 1.01, boxShadow: '0 0 25px var(--accent-glow)' }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="file-input"
            onChange={handleFileInput}
          />
          <motion.div
            animate={dragActive ? { scale: 1.1, color: 'var(--accent-secondary)' } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            <UploadCloud className="upload-icon" style={{ width: '52px', height: '52px' }} />
          </motion.div>
          
          <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '6px' }}>
            Drag and drop your code file here, or click to browse
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Supports Python (.py) and general text code files
          </p>
          
          {file && (
            <motion.div 
              className="selected-file" 
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <FileCode size={18} />
              <span>Selected: <strong>{file.name}</strong></span>
            </motion.div>
          )}
        </motion.div>
        
        <motion.button 
          className="btn-primary" 
          onClick={handleUpload}
          disabled={!file || loading}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{ width: '100%', marginTop: '20px' }}
        >
          {loading ? 'Analyzing...' : 'Analyze Code'}
        </motion.button>
      </motion.div>

      {/* Loading Box */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            className="glass-panel loading-box"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            style={{ marginTop: '20px', zIndex: 10 }}
          >
            {lottieData && LottieComponent ? (
              <div style={{ width: '120px', height: '120px', marginBottom: '10px' }}>
                <LottieComponent animationData={lottieData} loop={true} />
              </div>
            ) : (
              <div className="spinner"></div>
            )}
            <motion.div 
              key={loadingStep}
              className="loading-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {loadingStep}
            </motion.div>
            <div className="loading-subtext">Executing analyzer pipeline. Please hold...</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Panel */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ marginTop: '20px' }}
          >
            
            {/* Error Banner */}
            {result.error && (
              <motion.div 
                className="glass-panel" 
                style={{ padding: '20px', borderLeft: '4px solid var(--error)', background: 'var(--error-bg)', color: 'var(--error-text)', textAlign: 'left', marginBottom: '24px' }}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <XCircle size={22} />
                  <h4 style={{ fontWeight: 600 }}>Execution Error</h4>
                </div>
                <p style={{ marginTop: '8px', paddingLeft: '32px' }}>{result.error}</p>
              </motion.div>
            )}

            {result.summary && (
              <>
                {/* Chat Control Bar */}
                <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'rgba(99, 102, 241, 0.04)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--glass-border)', textAlign: 'left', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} style={{ color: 'var(--accent-secondary)' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Audit Run:</span>
                    <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{file?.name || 'Uploaded File'}</strong>
                  </div>
                  <motion.button
                    onClick={onNavigateToChat}
                    className="btn-primary"
                    style={{ margin: 0, padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    💬 Chat & Refactor
                  </motion.button>
                </div>

                {/* Dashboard Grid */}
                <div className="dashboard-grid">
                  
                  {/* Code Quality Card */}
                  <div className="glass-panel summary-card">
                    <div className="card-header">
                      <span className="card-title">Code Quality</span>
                      <Cpu size={18} style={{ color: 'var(--accent-secondary)' }} />
                    </div>
                    <div>
                      {result.summary.code_quality.score && result.summary.code_quality.score !== "N/A" ? (
                        <div className="card-score">
                          <AnimatedCounter value={result.summary.code_quality.score} decimals={1} />
                          <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/10</span>
                        </div>
                      ) : (
                        <div className="card-score">N/A</div>
                      )}
                      <div className="card-label">
                        {result.summary.code_quality.label}
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', textAlign: 'left' }}>
                      {getStatusBadge(result.summary.code_quality.status)}
                    </div>
                  </div>

                  {/* Security Card */}
                  <div className="glass-panel summary-card">
                    <div className="card-header">
                      <span className="card-title">Security</span>
                      <Shield size={18} style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                      <div className="card-label" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {result.summary.security.label}
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', textAlign: 'left' }}>
                      {getStatusBadge(result.summary.security.status)}
                    </div>
                  </div>

                  {/* Complexity Card */}
                  <div className="glass-panel summary-card">
                    <div className="card-header">
                      <span className="card-title">Complexity</span>
                      <Zap size={18} style={{ color: 'var(--warning)' }} />
                    </div>
                    <div>
                      <div className="card-label" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {result.summary.complexity.label}
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', textAlign: 'left' }}>
                      {getStatusBadge(result.summary.complexity.status)}
                    </div>
                  </div>

                  {/* Bug Risk Card */}
                  <div className="glass-panel summary-card">
                    <div className="card-header">
                      <span className="card-title">Bug Risk</span>
                      <AlertTriangle size={18} style={{ color: 'var(--error)' }} />
                    </div>
                    <div>
                      <div className="card-label" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {result.summary.bug_risk.label}
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', textAlign: 'left' }}>
                      {getStatusBadge(result.summary.bug_risk.status)}
                    </div>
                  </div>

                  {/* AI Review Card */}
                  <div className="glass-panel summary-card">
                    <div className="card-header">
                      <span className="card-title">AI Review</span>
                      <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <div className="card-label" style={{ fontSize: '0.85rem', lineHeight: '1.3' }}>
                        {result.summary.ai_review.label}
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', textAlign: 'left' }}>
                      {getStatusBadge(result.summary.ai_review.status)}
                    </div>
                  </div>

                </div>

                {/* Tabs Detail Panel */}
                <div className="glass-panel details-panel">
                  <div className="tabs-header" style={{ padding: '0 24px' }}>
                    <button 
                      className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                      onClick={() => setActiveTab('summary')}
                    >
                      Summary & AI Review
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'pylint' ? 'active' : ''}`}
                      onClick={() => setActiveTab('pylint')}
                    >
                      Code Quality (Pylint)
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                      onClick={() => setActiveTab('security')}
                    >
                      Security (Bandit)
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'complexity' ? 'active' : ''}`}
                      onClick={() => setActiveTab('complexity')}
                    >
                      Complexity (Radon)
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
                      onClick={() => setActiveTab('code')}
                    >
                      Source Code
                    </button>
                  </div>

                  <div className="tab-content" style={{ padding: '24px', overflow: 'hidden', position: 'relative' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                      >
                        {/* Tab 1: AI Review */}
                        {activeTab === 'summary' && (
                          <div className="ai-review-content">
                            {parseMarkdown(result.ai_review)}
                          </div>
                        )}

                        {/* Tab 2: Pylint */}
                        {activeTab === 'pylint' && (
                          <div className="raw-report-view">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                              <Terminal size={20} style={{ color: 'var(--accent-secondary)' }} />
                              <h3 style={{ fontWeight: 600, margin: 0 }}>Pylint Static Audit Output</h3>
                            </div>
                            <div className="raw-report-text">
                              {result.static_analysis?.report || 'No static analysis report available.'}
                            </div>
                          </div>
                        )}

                        {/* Tab 3: Security */}
                        {activeTab === 'security' && (
                          <div className="raw-report-view">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                              <Shield size={20} style={{ color: 'var(--success)' }} />
                              <h3 style={{ fontWeight: 600, margin: 0 }}>Bandit Security Scanner Output</h3>
                            </div>
                            <div className="raw-report-text">
                              {result.security_analysis?.report || 'No security scanner report available.'}
                            </div>
                          </div>
                        )}

                        {/* Tab 4: Complexity */}
                        {activeTab === 'complexity' && (
                          <div className="raw-report-view">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                              <Zap size={20} style={{ color: 'var(--warning)' }} />
                              <h3 style={{ fontWeight: 600, margin: 0 }}>Radon Complexity Metrics</h3>
                            </div>
                            {result.complexity_analysis && result.complexity_analysis.length > 0 ? (
                              <div className="complexity-grid">
                                {result.complexity_analysis.map((func, i) => {
                                  if (func.warning) {
                                    return (
                                      <div key={i} className="complexity-row" style={{ color: 'var(--warning-text)', background: 'var(--warning-bg)' }}>
                                        <span>{func.warning}</span>
                                      </div>
                                    );
                                  }
                                  const val = func.complexity || 1;
                                  const percentage = Math.min((val / 15) * 100, 100);
                                  return (
                                    <div key={i} className="complexity-row">
                                      <span className="complexity-name">def {func.function}()</span>
                                      <div className="complexity-bar-container">
                                        <div className="complexity-bar">
                                          <div 
                                            className="complexity-fill" 
                                            style={{ 
                                              width: `${percentage}%`, 
                                              backgroundColor: getComplexityFillColor(val) 
                                            }}
                                          ></div>
                                        </div>
                                        <span className="complexity-value" style={{ color: getComplexityFillColor(val) }}>
                                          {val}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="no-functions">No functions found or evaluated in this file.</div>
                            )}
                          </div>
                        )}

                        {/* Tab 5: Code */}
                        {activeTab === 'code' && (
                          <div className="raw-report-view">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                              <Code size={20} style={{ color: 'var(--accent)' }} />
                              <h3 style={{ fontWeight: 600, margin: 0 }}>Uploaded Source Inspector</h3>
                            </div>
                            <div className="code-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                              <pre style={{ margin: 0 }}>
                                <code style={{ color: '#cbd5e1', background: 'transparent' }}>
                                  {fileContent || '# No file content available.'}
                                </code>
                              </pre>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
