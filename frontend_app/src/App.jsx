import React from 'react';
import Home from './pages/Home';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', color: '#ef4444', fontFamily: 'monospace', background: '#080c14', minHeight: '100vh', zIndex: 99999 }}>
          <h2>React Runtime Crash Captured</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '15px', padding: '15px', border: '1px solid #ef4444', borderRadius: '8px', background: '#0f1626' }}>
            {this.state.error ? this.state.error.stack : 'Unknown error'}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <div>
        <Home />
      </div>
    </ErrorBoundary>
  );
}

export default App;
