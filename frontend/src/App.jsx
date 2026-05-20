import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import './App.css';

function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [shake, setShake] = useState(false);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [exampleLoading, setExampleLoading] = useState(false);
  
  const [totalChecks, setTotalChecks] = useState(0);
  const [fakeCount, setFakeCount] = useState(0);
  
  const resultsRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    const storedTotal = localStorage.getItem('factforge_total');
    const storedFake = localStorage.getItem('factforge_fake');
    const storedHistory = localStorage.getItem('factforge_history');
    if (storedTotal) setTotalChecks(parseInt(storedTotal));
    if (storedFake) setFakeCount(parseInt(storedFake));
    if (storedHistory) setHistory(JSON.parse(storedHistory));
  }, []);

  // Create stars and particles for background
  useEffect(() => {
    const starsContainer = document.getElementById('stars-container');
    if (starsContainer && starsContainer.children.length === 0) {
      for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 5 + 's';
        star.style.animationDuration = 2 + Math.random() * 3 + 's';
        starsContainer.appendChild(star);
      }
    }

    const particlesContainer = document.getElementById('particles-container');
    if (particlesContainer && particlesContainer.children.length === 0) {
      for (let i = 0; i < 60; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = 2 + Math.random() * 4;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = 8 + Math.random() * 10 + 's';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particlesContainer.appendChild(particle);
      }
    }
  }, []);

  const saveHistory = (newHistory) => {
    localStorage.setItem('factforge_history', JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  const addToHistory = (articleText, prediction, confidence) => {
    const newEntry = {
      id: Date.now(),
      text: articleText.substring(0, 100) + (articleText.length > 100 ? '...' : ''),
      fullText: articleText,
      prediction,
      confidence,
      timestamp: new Date().toLocaleString()
    };
    const updatedHistory = [newEntry, ...history].slice(0, 10);
    saveHistory(updatedHistory);
  };

  const loadFromHistory = (entry) => {
    setText(entry.fullText);
    setResult({
      prediction: entry.prediction,
      confidence: entry.confidence
    });
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const clearHistory = () => {
    saveHistory([]);
  };

  const exportHistoryAsJSON = () => {
    if (history.length === 0) return alert("No history to export.");
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factforge_history_${new Date().toISOString().slice(0,19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const team = [
    { name: "Yusuf Adel", role: "AI Research & Training", type: "student", img: "/yusuf.jpg" },
    { name: "Ziad Sameh", role: "Backend & Optimization", type: "student", img: "/ziad.jpg" },
    { name: "Omar Salah", role: "Frontend & UI/UX Design", type: "student", img: "/omar.jpg" },
    { name: "Eng. Mahinda", role: "Senior Advisor", type: "advisor" }
  ];

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

  const exampleNews = {
    real: "The World Health Organization announced today that a new vaccine has shown 94% efficacy in clinical trials. The vaccine, developed by a multinational team, will be distributed globally starting next quarter. Health officials urge continued adherence to safety protocols until then.",
    fake: "BREAKING: Secret UN documents reveal that 5G towers are being used to control human thoughts through microchip implants. A former intelligence official has confirmed that every smartphone update contains hidden code to activate these chips in 2025. This is the biggest cover-up in history."
  };

  const loadExample = (type) => {
    setText(exampleNews[type]);
    setResult(null);
  };

  const loadExampleWithLoading = (type) => {
    setExampleLoading(true);
    setTimeout(() => {
      loadExample(type);
      setExampleLoading(false);
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const loadRandomExample = () => {
    const random = Math.random() < 0.5 ? 'real' : 'fake';
    setText(exampleNews[random]);
    setResult(null);
  };

  const loadRandomWithLoading = () => {
    setExampleLoading(true);
    setTimeout(() => {
      loadRandomExample();
      setExampleLoading(false);
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const charCount = text.length;

  // Progress simulation
  useEffect(() => {
    let interval;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);
    } else {
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handlePredict = async () => {
    if (!text.trim()) return alert("⚠️ System requires input news article.");
    setLoading(true);
    setResult(null);
    try {
      const response = await axios.post(`${API_URL}/predict`, { text });
      setResult(response.data);
      
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
      addToHistory(text, response.data.prediction, response.data.confidence);
      
      const newTotal = totalChecks + 1;
      setTotalChecks(newTotal);
      localStorage.setItem('factforge_total', newTotal);
      
      const isFakePrediction = response.data.prediction?.toLowerCase().includes('fake');
      if (isFakePrediction) {
        const newFake = fakeCount + 1;
        setFakeCount(newFake);
        localStorage.setItem('factforge_fake', newFake);
        
        const confidence = parseConfidence(response.data.confidence);
        if (confidence > 0.9) {
          setShake(true);
          setTimeout(() => setShake(false), 500);
        }
      }
    } catch (error) {
      console.error(error);
      alert("❌ Neural Link Failure: Check Backend Server.");
    }
    setLoading(false);
  };

  const resetCounters = () => {
    setTotalChecks(0);
    setFakeCount(0);
    localStorage.removeItem('factforge_total');
    localStorage.removeItem('factforge_fake');
  };

  const handleRipple = (e) => {
    const btn = e.currentTarget;
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size/2}px`;
    ripple.style.top = `${e.clientY - rect.top - size/2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    handlePredict();
  };

  const clearText = () => {
    setText('');
    setResult(null);
  };

  const copyResult = () => {
    if (!result) return;
    const copyText = `${result.prediction} (Confidence: ${result.confidence})`;
    navigator.clipboard.writeText(copyText);
  };

  const handleCopyWithFeedback = () => {
    copyResult();
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
  };

  const parseConfidence = (val) => {
    if (typeof val === 'number') return Math.min(Math.max(val / 100, 0), 1);
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : Math.min(Math.max(num / 100, 0), 1);
    }
    return 0;
  };

  const confidenceValue = parseConfidence(result?.confidence) * 100;
  const isFake = result?.prediction?.toLowerCase().includes('fake');
  const fakePercentage = totalChecks === 0 ? 0 : ((fakeCount / totalChecks) * 100).toFixed(1);
  const realCount = totalChecks - fakeCount;

  const pieData = [
    { name: 'Fake News', value: fakeCount, color: '#ef4444' },
    { name: 'Real News', value: realCount, color: '#22c55e' }
  ].filter(item => item.value > 0);

  return (
    <div className="main-container">
      {/* طبقات الخلفية المحسنة */}
      <div className="aurora"></div>
      <div className="stars-bg" id="stars-container"></div>
      <div className="particles-bg" id="particles-container"></div>
      <div className="fog-layer"></div>
      <div className="mesh-gradient"></div>
      <div className="grid-background"></div>
      <div className="scanline"></div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        <header className="glass-panel" style={{ textAlign: 'center', padding: '2rem', marginBottom: '2rem', position: 'relative' }}>
          <h1 className="logo-text">FACT FORGE</h1>
          <p style={{ color: '#cbd5e6', marginTop: '0.5rem' }}>Advanced NLP Framework v3.0 | Real-time Deception Analysis</p>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2rem',
            marginTop: '1rem',
            flexWrap: 'wrap'
          }}>
            <div className="counter-card counter-total">
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>📊 TOTAL CHECKS</span>
              <span className="counter-value">{totalChecks}</span>
            </div>
            <div className="counter-card counter-fake">
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>⚠️ FAKE NEWS</span>
              <span className="counter-value">{fakeCount}</span>
            </div>
            <div className="counter-card counter-real">
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>✅ REAL RATE</span>
              <span className="counter-value">{100 - parseFloat(fakePercentage)}%</span>
            </div>
            {totalChecks > 0 && (
              <>
                <div style={{ width: '80px', height: '80px' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={35}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <button onClick={resetCounters} className="reset-btn">Reset</button>
              </>
            )}
          </div>

          <button className="report-btn" onClick={() => setShowReport(true)}>
            📄 OPEN TECHNICAL REPORT
          </button>
        </header>

        <div className="dashboard-grid">
          {/* Input Section */}
          <div className="glass-panel" style={{ padding: '1.8rem' }}>
            <h3 style={{ color: '#7dd3fc', marginBottom: '1rem', fontSize: '0.9rem', letterSpacing: '1px' }}>
              ⚡ DATA INPUT TERMINAL
            </h3>
            <textarea
              className="terminal-input"
              rows="12"
              placeholder="📝 Paste news article text here for neural validation..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            
            {text.trim() !== '' && (
              <div style={{ marginTop: '0.5rem', textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8' }}>
                📝 {wordCount} words | 🔤 {charCount} characters
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="execute-btn" onClick={handleRipple} disabled={loading} style={{ flex: 2 }}>
                {loading ? '🔄 COMPUTING...' : '🧠 RUN INFERENCE'}
              </button>
              <button onClick={clearText} className="secondary-btn clear-btn">
                🗑️ CLEAR
              </button>
            </div>

            <div className="example-buttons">
              <button onClick={() => loadExampleWithLoading('real')} className="example-btn example-real" disabled={exampleLoading}>
                {exampleLoading ? '⏳ Loading...' : '📰 Real Example'}
              </button>
              <button onClick={() => loadExampleWithLoading('fake')} className="example-btn example-fake" disabled={exampleLoading}>
                {exampleLoading ? '⏳ Loading...' : '⚠️ Fake Example'}
              </button>
              <button onClick={loadRandomWithLoading} className="example-btn example-random" disabled={exampleLoading}>
                {exampleLoading ? '⏳ Loading...' : '🎲 Random'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div ref={resultsRef} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '500px' }}>
            {!result ? (
              loading ? (
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <div className="skeleton-loader">
                    <div className="skeleton-line"></div>
                    <div className="skeleton-line short"></div>
                    <div className="skeleton-line"></div>
                  </div>
                  <div className="spinner"></div>
                  <div style={{ marginTop: '1rem', width: '100%' }}>
                    <div style={{ height: '4px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(progress, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)', transition: 'width 0.2s ease' }} />
                    </div>
                    <p style={{ color: '#7dd3fc', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                      Neural processing {Math.floor(Math.min(progress, 100))}%
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', opacity: 0.7 }}>
                  <span style={{ fontSize: '4rem', animation: 'pulse 2s infinite' }}>📡</span>
                  <p style={{ marginTop: '1rem' }}>✨ Paste an article and click RUN INFERENCE ✨</p>
                  <p style={{ fontSize: '0.7rem', color: '#64748b' }}>or try one of the example buttons below</p>
                </div>
              )
            ) : (
              <div className={`result-animate ${shake ? 'shake-effect' : ''}`} style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: 'rgba(56, 189, 248, 0.2)', borderRadius: '40px', padding: '0.2rem 1rem', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#7dd3fc' }}>
                  🧬 BERT CLASSIFICATION
                </div>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px', height: '220px', borderRadius: '50%', background: isFake ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', filter: 'blur(40px)', zIndex: -1 }} />
                  <div className={`prediction-text ${isFake ? 'fake-glow' : 'real-glow'}`}>
                    {result.prediction?.toUpperCase()}
                  </div>
                </div>
                <div style={{ marginTop: '2rem', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                    <span>CONFIDENCE METRIC</span>
                    <span>{result.confidence || '0%'}</span>
                  </div>
                  <div className="confidence-bar" data-percent={result.confidence || '0%'}>
                    <div className="confidence-fill" style={{ width: `${confidenceValue}%`, background: isFake ? '#ef4444' : '#22c55e' }} />
                  </div>
                </div>
                <button onClick={handleCopyWithFeedback} className="copy-btn">
                  {copyFeedback ? '✅ Copied!' : '📋 COPY RESULT'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="history-container">
            <div className="history-title">
              <h3 style={{ color: '#38bdf8', fontSize: '1.2rem' }}>📜 Recent Analyses</h3>
              <div>
                <button onClick={exportHistoryAsJSON} className="export-btn">📥 Export JSON</button>
                <button onClick={clearHistory} className="clear-history-btn">🗑️ Clear All</button>
              </div>
            </div>
            <div>
              {history.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => loadFromHistory(entry)}
                  className={`history-item ${entry.prediction.toLowerCase().includes('fake') ? 'history-fake' : 'history-real'}`}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: entry.prediction.toLowerCase().includes('fake') ? '#f87171' : '#4ade80' }}>{entry.prediction}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{entry.text}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.6rem', color: '#64748b' }}>{entry.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(56,189,248,0.2)', paddingTop: '2rem' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, color: '#38bdf8', marginBottom: '2rem' }}>PROJECT PERSONNEL</h2>
          <div className="team-grid">
            {team.map((member, idx) => (
              <div key={idx} className="glass-panel team-card">
                <div className="avatar">
                  {member.type === 'advisor' ? <span style={{ fontSize: '3rem' }}>🏛️</span> : 
                    <img src={member.img} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                         onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?background=0ea5e9&color=fff&name=${member.name.split(' ')[0]}`; }} />
                  }
                </div>
                <h4 style={{ fontSize: '1.3rem', margin: '0.5rem 0' }}>{member.name}</h4>
                <p style={{ color: '#7dd3fc', fontSize: '0.8rem', fontWeight: 500 }}>{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        <footer style={{ textAlign: 'center', marginTop: '3rem', color: '#5b6e8c', fontSize: '0.7rem' }}>
          🧪 NVIDIA CUDA ACCELERATED | RTX 3070 SERIES | FUE NLP LAB 2026
        </footer>
      </div>

      {showReport && (
        <div className="modal-overlay" onClick={() => setShowReport(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowReport(false)} className="modal-close">✕</button>
            <h2 style={{ color: '#38bdf8', marginBottom: '1rem' }}>📄 Technical Report: Fact Forge</h2>
            <p><strong>DeBERTa-v3</strong> based fake news detector with 95.67% accuracy.</p>
            <p>Trained on WELFake dataset (72,134 articles).</p>
            <p>Validation Loss: 0.1832 | Inference time &lt;800ms</p>
            <button onClick={() => window.open('/FactForgeFinalReport.pdf', '_blank')} className="pdf-btn">📥 OPEN FULL REPORT (PDF)</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;