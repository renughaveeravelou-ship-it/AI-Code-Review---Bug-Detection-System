import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { 
  History, 
  Settings, 
  Sparkles, 
  Trash2, 
  ExternalLink, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  Gauge, 
  CheckCircle,
  Clock,
  BookOpen
} from 'lucide-react';

export default function Dashboard({ onSelectReview }) {
  const [history, setHistory] = useState([]);
  const [preferences, setPreferences] = useState({
    experience_level: 'Intermediate',
    coding_style: 'PEP8 standard',
    framework_focus: 'General Python',
    review_strictness: 'Normal',
    security_priority: 'High'
  });
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingPref, setUpdatingPref] = useState(false);
  
  const statsRef = useRef(null);

  // Fetch all dashboard data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [historyRes, prefRes, recsRes] = await Promise.all([
        axios.get('/api/history'),
        axios.get('/api/preferences'),
        axios.get('/api/recommendations')
      ]);
      setHistory(historyRes.data);
      setPreferences(prefRes.data);
      setRecommendations(recsRes.data);
    } catch (err) {
      console.error("Error loading dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // GSAP animation for stats cards
  useEffect(() => {
    if (!loading && history.length > 0) {
      gsap.fromTo('.stat-card', 
        { opacity: 0, scale: 0.9, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.2)' }
      );
    }
  }, [loading, history]);

  const handlePreferenceChange = async (key, value) => {
    setUpdatingPref(true);
    try {
      const updatedPrefs = { ...preferences, [key]: value };
      const response = await axios.post('/api/preferences', { preferences: updatedPrefs });
      setPreferences(response.data.preferences);
      
      // Refresh recommendations to reflect updated preferences
      const recsRes = await axios.get('/api/recommendations');
      setRecommendations(recsRes.data);
    } catch (err) {
      console.error("Failed to update preferences", err);
    } finally {
      setUpdatingPref(false);
    }
  };

  const handleDeleteReview = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this audit from your history?")) return;
    try {
      await axios.delete(`/api/history/${id}`);
      setHistory(history.filter(item => item.id !== id));
      // Refresh recommendations since metrics changed
      const recsRes = await axios.get('/api/recommendations');
      setRecommendations(recsRes.data);
    } catch (err) {
      console.error("Failed to delete review", err);
    }
  };

  // Helper stats derivations
  const totalAudits = history.length;
  const avgPylintScore = history.reduce((sum, item) => sum + (item.pylint_score || 0), 0) / (history.filter(item => item.pylint_score !== null).length || 1);
  const bugRiskCount = history.filter(item => item.bug_risk_label && item.bug_risk_label.includes("Bug")).length;
  const secureAudits = history.filter(item => item.security_status && item.security_status.includes("No issues")).length;

  if (loading) {
    return (
      <div className="glass-panel loading-box" style={{ marginTop: '20px' }}>
        <div className="spinner"></div>
        <p className="loading-text">Loading personalization profile...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      
      {/* 1. Analytics & Statistics */}
      <div className="dashboard-grid" ref={statsRef}>
        <div className="glass-panel stat-card summary-card">
          <div className="card-header">
            <span className="card-title">Audits Conducted</span>
            <History size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="card-score">{totalAudits}</div>
          <div className="card-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Long-term memory storage
          </div>
        </div>

        <div className="glass-panel stat-card summary-card">
          <div className="card-header">
            <span className="card-title">Avg Quality Score</span>
            <TrendingUp size={18} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div className="card-score">
            {totalAudits > 0 ? avgPylintScore.toFixed(1) : 'N/A'}
            {totalAudits > 0 && <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>/10</span>}
          </div>
          <div className="card-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Pylint static quality index
          </div>
        </div>

        <div className="glass-panel stat-card summary-card">
          <div className="card-header">
            <span className="card-title">Bugs Predicted</span>
            <AlertTriangle size={18} style={{ color: 'var(--error)' }} />
          </div>
          <div className="card-score">{bugRiskCount}</div>
          <div className="card-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            CodeBERT risk detections
          </div>
        </div>

        <div className="glass-panel stat-card summary-card">
          <div className="card-header">
            <span className="card-title">Secure Checkouts</span>
            <Award size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div className="card-score">
            {totalAudits > 0 ? ((secureAudits / totalAudits) * 100).toFixed(0) : '0'}%
          </div>
          <div className="card-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Vulnerability-free audits
          </div>
        </div>
      </div>

      {/* 2. Interactive Preferences & Smart Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* Preference Settings Panel */}
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Settings size={20} style={{ color: 'var(--accent-secondary)' }} />
            <h3 style={{ fontWeight: 600, margin: 0 }}>Adaptive AI Preferences</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Configure your development environment. The AI review engine automatically incorporates these parameters to tailor reports, checklists, and suggestions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Experience Level</label>
              <select 
                value={preferences.experience_level}
                onChange={(e) => handlePreferenceChange('experience_level', e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: '#fff' }}
              >
                <option value="Beginner">Beginner (Detailed, explanatory feedback)</option>
                <option value="Intermediate">Intermediate (Balanced tips & standards)</option>
                <option value="Advanced">Advanced (High-performance code pattern audits)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Target Coding Style</label>
              <select 
                value={preferences.coding_style}
                onChange={(e) => handlePreferenceChange('coding_style', e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: '#fff' }}
              >
                <option value="PEP8 standard">PEP8 standard (Recommended)</option>
                <option value="Google Python Style Guide">Google Python Style Guide</option>
                <option value="Concise / Minimal Style">Concise / Minimal Style</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Framework Focus (Learned automatically or manual)
              </label>
              <select 
                value={preferences.framework_focus}
                onChange={(e) => handlePreferenceChange('framework_focus', e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: '#fff' }}
              >
                <option value="General Python">General Python</option>
                <option value="FastAPI Web App">FastAPI Web App</option>
                <option value="Django Web App">Django Web App</option>
                <option value="Flask Web App">Flask Web App</option>
                <option value="Data Science & ML">Data Science & ML (Pandas, Numpy, PyTorch)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Audit Strictness</label>
              <select 
                value={preferences.review_strictness}
                onChange={(e) => handlePreferenceChange('review_strictness', e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: '#fff' }}
              >
                <option value="Low">Low (Ignore minor styling items)</option>
                <option value="Normal">Normal (Standard linting warnings)</option>
                <option value="High">High (Strict refactoring checkups)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Smart Recommendations */}
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Sparkles size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontWeight: 600, margin: 0 }}>Smart Adaptive Recommendations</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, overflowY: 'auto', maxHeight: '350px', paddingRight: '4px' }}>
            {recommendations.length > 0 ? (
              recommendations.map((rec, index) => (
                <motion.div 
                  key={index}
                  className="glass-panel"
                  style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--accent-secondary)', fontSize: '0.9rem' }}
                  whileHover={{ scale: 1.01, background: 'rgba(255,255,255,0.03)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-secondary)' }}>{rec.category}</span>
                  </div>
                  <h4 style={{ fontWeight: 600, marginBottom: '4px', color: '#fff' }}>{rec.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>{rec.description}</p>
                  {rec.action_link && (
                    <a 
                      href={rec.action_link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600 }}
                    >
                      Learn more <ExternalLink size={10} />
                    </a>
                  )}
                </motion.div>
              ))
            ) : (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '40px', fontStyle: 'italic' }}>
                No recommendations yet. Upload code scripts to feed the adaptive quality auditor.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Previous Audits Recall List */}
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <History size={20} style={{ color: 'var(--accent-secondary)' }} />
          <h3 style={{ fontWeight: 600, margin: 0 }}>Previous Conversations & Audits</h3>
        </div>

        {totalAudits > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {history.map((item) => (
              <motion.div
                key={item.id}
                onClick={() => onSelectReview(item.id)}
                className="glass-panel"
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '14px 20px', 
                  cursor: 'pointer', 
                  background: 'rgba(15, 22, 38, 0.4)' 
                }}
                whileHover={{ scale: 1.008, border: '1px solid var(--accent-secondary)', background: 'rgba(99, 102, 241, 0.03)' }}
                whileTap={{ scale: 0.995 }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{item.filename}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                    {item.pylint_score !== null && (
                      <span className="badge badge-success" style={{ textTransform: 'none' }}>
                        Quality: {item.pylint_score}/10
                      </span>
                    )}
                    {item.security_status && (
                      <span className={`badge ${item.security_status.includes("No issues") ? 'badge-success' : 'badge-warning'}`}>
                        {item.security_status}
                      </span>
                    )}
                  </div>
                  <motion.button
                    onClick={(e) => handleDeleteReview(item.id, e)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '4px' }}
                    whileHover={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.05)' }}
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No past reviews found. Upload your first code script to start logging.
          </div>
        )}
      </div>

    </div>
  );
}
