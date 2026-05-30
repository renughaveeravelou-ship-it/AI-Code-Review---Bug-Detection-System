import { useState } from 'react';
import UploadBox from '../components/UploadBox';
import Dashboard from '../components/Dashboard';
import AIChat from '../components/AIChat';
import ParticleBackground from '../components/ParticleBackground';
import FloatingBackgroundOrbs from '../components/FloatingBackgroundOrbs';
import MouseFollower from '../components/MouseFollower';
import { motion } from 'framer-motion';
import { FileCode, Gauge, MessageSquareCode } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('auditor');
  const [activeReviewId, setActiveReviewId] = useState(null);

  const handleSelectReviewFromHistory = (id) => {
    setActiveReviewId(id);
    setActiveTab('auditor'); // Go to Auditor tab to see the details!
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '90vh' }}>
      <ParticleBackground />
      <FloatingBackgroundOrbs />
      <MouseFollower />
      
      <header className="header" style={{ marginBottom: '24px' }}>
        <h1 className="title-gradient">AI Code Reviewer</h1>
        <p className="subtitle">Multi-Tool Static Quality Auditor & AI Bug Detection Dashboard</p>
      </header>

      {/* Navigation tabs bar with premium glass design */}
      <div 
        className="glass-panel" 
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          margin: '0 auto 30px auto', 
          padding: '6px', 
          borderRadius: '12px', 
          maxWidth: '540px',
          width: '100%',
          gap: '4px'
        }}
      >
        <button
          onClick={() => setActiveTab('auditor')}
          className={`tab-btn ${activeTab === 'auditor' ? 'active' : ''}`}
          style={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            borderRadius: '8px', 
            padding: '10px 16px',
            borderBottom: 'none',
            background: activeTab === 'auditor' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
            color: activeTab === 'auditor' ? 'var(--accent-secondary)' : 'var(--text-secondary)'
          }}
        >
          <FileCode size={16} />
          Auditor
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          style={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            borderRadius: '8px', 
            padding: '10px 16px',
            borderBottom: 'none',
            background: activeTab === 'dashboard' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
            color: activeTab === 'dashboard' ? 'var(--accent-secondary)' : 'var(--text-secondary)'
          }}
        >
          <Gauge size={16} />
          Dashboard
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          style={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            borderRadius: '8px', 
            padding: '10px 16px',
            borderBottom: 'none',
            background: activeTab === 'chat' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
            color: activeTab === 'chat' ? 'var(--accent-secondary)' : 'var(--text-secondary)'
          }}
        >
          <MessageSquareCode size={16} />
          AI Chat
        </button>
      </div>

      <main style={{ width: '100%', flexGrow: 1 }}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ width: '100%' }}
        >
          {activeTab === 'auditor' && (
            <UploadBox 
              activeReviewId={activeReviewId} 
              onAnalysisComplete={(id) => setActiveReviewId(id)}
              onNavigateToChat={() => setActiveTab('chat')}
            />
          )}
          {activeTab === 'dashboard' && (
            <Dashboard onSelectReview={handleSelectReviewFromHistory} />
          )}
          {activeTab === 'chat' && (
            <AIChat 
              activeReviewId={activeReviewId}
              onSelectReview={(id) => setActiveReviewId(id)} 
            />
          )}
        </motion.div>
      </main>
    </div>
  );
}



