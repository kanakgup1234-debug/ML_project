import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Search, 
  Mail, 
  Award, 
  AlertCircle, 
  Calendar,
  Sparkles,
  Upload,
  RefreshCw,
  Sliders,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

function App() {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [remedial, setRemedial] = useState([]);
  const [selectedStudentEmail, setSelectedStudentEmail] = useState('');
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState(null);

  // File Upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [quizId, setQuizId] = useState('');
  const [isNewQuiz, setIsNewQuiz] = useState(false);
  const [moduleId, setModuleId] = useState('Module 1: Python and Math for ML');
  const [maxMarks, setMaxMarks] = useState(10);
  const [uploading, setUploading] = useState(false);
  const [pipelineLogs, setPipelineLogs] = useState('');
  const [pipelineSuccess, setPipelineSuccess] = useState(null);
  const [csvText, setCsvText] = useState('');

  // Email states
  const [senderEmail, setSenderEmail] = useState('kanak.gup1234@gmail.com');
  const [senderPassword, setSenderPassword] = useState('');
  const [mockMode, setMockMode] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailLogs, setEmailLogs] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(null);
  const [sendingIndividualEmail, setSendingIndividualEmail] = useState('');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (refreshTrigger === 0) {
          setLoading(true);
        }
        // Fetch All Students
        const resStudents = await fetch('/api/students');
        const dataStudents = await resStudents.json();
        setStudents(dataStudents);

        if (dataStudents.length > 0 && !selectedStudentEmail) {
          setSelectedStudentEmail(dataStudents[0].email);
        }

        // Fetch Stats
        const resStats = await fetch('/api/students/stats');
        const dataStats = await resStats.json();
        setStats(dataStats);

        // Fetch Remedial
        const resRemedial = await fetch('/api/students/remedial');
        const dataRemedial = await resRemedial.json();
        setRemedial(dataRemedial);

        // Fetch Email Settings
        const resEmail = await fetch('/api/students/email-settings');
        const dataEmail = await resEmail.json();
        setSenderEmail(dataEmail.sender_email || 'kanak.gup1234@gmail.com');
        setMockMode(dataEmail.mock_mode !== false);

        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError("Could not connect to the backend server. Please verify the Express backend is running on http://localhost:5000.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  // Fetch student profile when email selection changes
  useEffect(() => {
    if (!selectedStudentEmail) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/students/profile/${selectedStudentEmail}`);
        const data = await res.json();
        setSelectedStudentProfile(data);
      } catch (err) {
        console.error('Error fetching student profile:', err);
      }
    };
    fetchProfile();
  }, [selectedStudentEmail]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert("Please select a CSV file first!");
      return;
    }
    if (!quizId) {
      alert("Please enter a Quiz ID (e.g. day8_module3_quiz8)!");
      return;
    }

    setUploading(true);
    setPipelineLogs("Initiating file upload & pipeline trigger...\n");
    setPipelineSuccess(null);

    const formData = new FormData();
    formData.append("quizFile", uploadFile);
    formData.append("quizId", quizId.trim().toLowerCase());
    formData.append("isNewQuiz", String(isNewQuiz));
    formData.append("moduleId", moduleId);
    formData.append("maxMarks", String(maxMarks));

    try {
      const res = await fetch("/api/students/upload-quiz", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPipelineLogs(data.logs || "Pipeline completed successfully with no logs output.");
        setPipelineSuccess(true);
        // Refresh dashboard data
        setRefreshTrigger(prev => prev + 1);
        setUploadFile(null);
      } else {
        setPipelineLogs((data.logs || "") + `\n\nERROR: ${data.error || "Failed to upload quiz and run pipeline"}\nDetails: ${data.details || ""}`);
        setPipelineSuccess(false);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setPipelineLogs(prev => prev + `\n\nNETWORK ERROR: Failed to communicate with backend server.\nDetails: ${err.message}`);
      setPipelineSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEmailSettings = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailLogs("Saving configuration to config.json...\n");
    setEmailSuccess(null);

    try {
      const res = await fetch("/api/students/email-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_email: senderEmail,
          sender_password: senderPassword,
          mock_mode: mockMode
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailLogs(prev => prev + "Settings saved successfully!");
        setEmailSuccess(true);
        setSenderPassword(''); // clear password field
      } else {
        setEmailLogs(prev => prev + `ERROR: ${data.error || "Failed to save settings"}`);
        setEmailSuccess(false);
      }
    } catch (err) {
      setEmailLogs(prev => prev + `NETWORK ERROR: ${err.message}`);
      setEmailSuccess(false);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendEmail = async (type, email = '') => {
    if (type === 'individual') {
      setSendingIndividualEmail(email);
    } else {
      setEmailLoading(true);
      setEmailLogs("Initiating bulk email dispatch pipeline...\n");
      setEmailSuccess(null);
    }

    try {
      const res = await fetch("/api/students/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, email })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (type === 'individual') {
          alert(`Email successfully processed for ${email}!`);
        } else {
          setEmailLogs(data.logs || "Emails sent successfully!");
          setEmailSuccess(true);
        }
      } else {
        if (type === 'individual') {
          alert(`ERROR: ${data.error || "Failed to send email"}\n${data.details || ""}`);
        } else {
          setEmailLogs((data.logs || "") + `\n\nERROR: ${data.error || "Failed to dispatch emails"}\nDetails: ${data.details || ""}`);
          setEmailSuccess(false);
        }
      }
    } catch (err) {
      if (type === 'individual') {
        alert(`NETWORK ERROR: ${err.message}`);
      } else {
        setEmailLogs(prev => prev + `\n\nNETWORK ERROR: ${err.message}`);
        setEmailSuccess(false);
      }
    } finally {
      if (type === 'individual') {
        setSendingIndividualEmail('');
      } else {
        setEmailLoading(false);
      }
    }
  };

  const handleCsvTextImport = async (e) => {
    e.preventDefault();
    if (!csvText.trim()) {
      alert("Please paste some CSV text first!");
      return;
    }
    if (!quizId) {
      alert("Please enter a Quiz ID (e.g. day8_module3_quiz8)!");
      return;
    }

    setUploading(true);
    setPipelineLogs("Initiating CSV text import & pipeline trigger...\n");
    setPipelineSuccess(null);

    try {
      const res = await fetch("/api/students/import-csv-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText: csvText,
          quizId: quizId.trim().toLowerCase(),
          isNewQuiz: isNewQuiz,
          moduleId: moduleId,
          maxMarks: maxMarks
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPipelineLogs(data.logs || "Pasted CSV imported and pipeline completed successfully.");
        setPipelineSuccess(true);
        setCsvText('');
        // Refresh dashboard data
        setRefreshTrigger(prev => prev + 1);
      } else {
        setPipelineLogs((data.logs || "") + `\n\nERROR: ${data.error || "Failed to import pasted CSV"}\nDetails: ${data.details || ""}`);
        setPipelineSuccess(false);
      }
    } catch (err) {
      console.error("Import error:", err);
      setPipelineLogs(prev => prev + `\n\nNETWORK ERROR: Failed to communicate with backend server.\nDetails: ${err.message}`);
      setPipelineSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ffffff', fontSize: '1.5rem', fontFamily: 'Outfit' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #6366f1', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', marginRight: '15px' }} />
        Loading LIET Dashboard Metrics...
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Format grade data for Recharts
  const getGradeChartData = () => {
    if (!stats || !stats.gradeCounts) return [];
    const order = ['A+', 'A', 'B', 'C', 'D', 'F'];
    return order.map(g => ({
      name: g,
      count: stats.gradeCounts[g] || 0
    }));
  };

  const getModuleChartData = () => {
    if (!stats || !stats.moduleAverages) return [];
    return stats.moduleAverages;
  };

  // Reconstruct quiz timeline data for Recharts area chart
  const getQuizTimelineData = () => {
    if (!selectedStudentProfile) return [];
    const scores = selectedStudentProfile.quizScores || {};
    const percentages = selectedStudentProfile.quizPercentages || {};
    
    // Sort quiz keys day1, day2...
    return Object.keys(scores)
      .sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''), 10);
        const numB = parseInt(b.replace(/[^0-9]/g, ''), 10);
        return numA - numB;
      })
      .map(key => ({
        name: key.split('_')[0].toUpperCase(), // e.g. DAY1
        percentage: percentages[`${key}_pct`] || 0,
        score: scores[key]
      }));
  };

  // Reconstruct radar chart module data
  const getModuleProfileData = () => {
    if (!selectedStudentProfile) return [];
    const percentages = selectedStudentProfile.modulePercentages || {};
    return Object.keys(percentages).map(key => ({
      subject: key.length > 25 ? key.substring(0, 22) + '...' : key,
      percentage: percentages[key]
    }));
  };

  // Helper for grade pill colors
  const getGradeClass = (grade) => {
    const formatted = grade.replace('+', 'p');
    return `grade-pill grade-${formatted}`;
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#080c14', color: '#ffffff', minHeight: '100vh', padding: '2rem' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#818cf8', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Training Performance Manager
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '5px 0 0 0', color: '#ffffff' }}>
            Quiz Dashboard
          </h1>
        </div>
        {stats && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600, marginTop: '10px' }}>
            {stats.totalStudents} students &bull; {stats.totalQuizzes} uploads
          </div>
        )}
      </header>

      {/* Connection Error Banner */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '16px',
          padding: '1.25rem',
          color: '#f87171',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.15)'
        }}>
          <AlertCircle size={24} color="#f87171" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: '1rem', color: '#ffffff' }}>Backend Connection Error:</strong>
            <div style={{ fontSize: '0.9rem', marginTop: '2px', color: '#fca5a5' }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {stats && (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.2rem', marginBottom: '2.5rem' }}>
            
            {/* Students Card */}
            <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>Students</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0 4px 0', color: '#ffffff' }}>{stats.totalStudents}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>unique email IDs tracked</div>
            </div>

            {/* Quizzes Card */}
            <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>Quizzes</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0 4px 0', color: '#ffffff' }}>{stats.totalQuizzes}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>uploaded quiz files</div>
            </div>

            {/* Average Card */}
            <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>Average</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0 4px 0', color: '#ffffff' }}>{stats.avgPercentage.toFixed(2)}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>overall class average</div>
            </div>

            {/* Top Score Card */}
            <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>Top Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0 4px 0', color: '#ffffff' }}>{stats.highestPercentage.toFixed(2)}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>highest overall performance</div>
            </div>

            {/* Top Scorer Card */}
            <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>Top Scorer</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, margin: '14px 0 8px 0', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stats.highestScorer?.name || 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {stats.highestScorer ? `${stats.highestScorer.cumulativePct.toFixed(2)}% | Rank ${stats.highestScorer.rank}` : 'No data'}
              </div>
            </div>

            {/* Bottom Scorer Card */}
            <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>Bottom Scorer</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, margin: '14px 0 8px 0', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stats.lowestScorer?.name || 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {stats.lowestScorer ? `${stats.lowestScorer.cumulativePct.toFixed(2)}% | Rank ${stats.lowestScorer.rank}` : 'No data'}
              </div>
            </div>

          </div>

          {/* Main Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            
            {/* Upload Quiz File Card */}
            <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Upload Quiz File</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Quiz ID</label>
                  <input 
                    type="text" 
                    placeholder="day9_quiz1"
                    value={quizId}
                    onChange={(e) => setQuizId(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#111827', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', padding: '0.5rem', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.2rem' }}>
                  <input 
                    type="checkbox" 
                    id="new-quiz-check" 
                    checked={isNewQuiz} 
                    onChange={(e) => setIsNewQuiz(e.target.checked)} 
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <label htmlFor="new-quiz-check" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>New Quiz</label>
                </div>
              </div>

              {isNewQuiz && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Belongs to Module</label>
                    <select 
                      value={moduleId} 
                      onChange={(e) => setModuleId(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#111827', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <option value="Module 1: Python and Math for ML">Module 1: Python & Math</option>
                      <option value="Module 2: Classical Machine Learning">Module 2: Classical ML</option>
                      <option value="Module 3: Unsupervised & Ensemble Learning">Module 3: Unsupervised</option>
                      <option value="Module 4: Deep Learning & NLP">Module 4: Deep Learning</option>
                      <option value="Module 5: LLMs & Agentic AI">Module 5: LLMs & Agents</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Max Marks</label>
                    <input 
                      type="number" 
                      value={maxMarks} 
                      onChange={(e) => setMaxMarks(Number(e.target.value))}
                      style={{ width: '100%', backgroundColor: '#111827', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', padding: '0.5rem', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                </div>
              )}

              {/* File Attachment Selector */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  style={{ display: 'none' }}
                  id="quiz-file-picker"
                />
                <label 
                  htmlFor="quiz-file-picker" 
                  style={{ 
                    flexGrow: 1, 
                    backgroundColor: '#111827', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    padding: '0.6rem', 
                    fontSize: '0.85rem', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {uploadFile ? uploadFile.name : "Choose file"}
                </label>
                <button 
                  onClick={handleFileUpload}
                  disabled={uploading || !uploadFile}
                  style={{
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.6rem 1.2rem',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: (uploading || !uploadFile) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploading ? "Uploading..." : "Attach and Update"}
                </button>
              </div>

              {/* Paste CSV Box */}
              <div>
                <textarea 
                  placeholder="Paste CSV text here"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  style={{
                    width: '100%',
                    height: '110px',
                    backgroundColor: '#111827',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '0.7rem',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Paste CSV text or attach a quiz file and the dashboard refreshes from the new data.
                </span>
              </div>

              <button 
                onClick={handleCsvTextImport}
                disabled={uploading || !csvText.trim()}
                style={{
                  width: '100%',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.7rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: (uploading || !csvText.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                Import Pasted CSV
              </button>

            </div>

            {/* Module Summary Card */}
            <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Module Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginTop: '0.5rem' }}>
                {stats.moduleAverages && stats.moduleAverages.map((mod, idx) => {
                  const cleanedName = mod.name.includes(':') ? mod.name.split(':')[1].trim() : mod.name;
                  const pct = mod.avgPct || 0;
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                      <div style={{ width: '120px', fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cleanedName}>
                        {cleanedName}
                      </div>
                      <div style={{ flexGrow: 1, height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#38bdf8', borderRadius: '4px' }} />
                      </div>
                      <div style={{ width: '40px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}>{pct.toFixed(1)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grade Distribution Card */}
            <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Grade Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                {['A', 'A+', 'B', 'B+', 'C', 'D', 'F'].map((grade) => {
                  const count = stats.gradeCounts[grade] || 0;
                  const maxCount = Math.max(...Object.values(stats.gradeCounts), 1);
                  const pct = (count / maxCount) * 100;
                  return (
                    <div key={grade} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                      <div style={{ width: '30px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>{grade}</div>
                      <div style={{ flexGrow: 1, height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#f59e0b', borderRadius: '4px' }} />
                      </div>
                      <div style={{ width: '45px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}>{count.toFixed(1)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Recent Uploads & Logs console card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            
            {/* Recent Uploads Table Card */}
            <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Uploads</h3>
              <div className="table-container">
                <table style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px' }}>Filename</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentUploads && stats.recentUploads.map((file, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{file.filename}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>{file.dateStr}</td>
                      </tr>
                    ))}
                    {(!stats.recentUploads || stats.recentUploads.length === 0) && (
                      <tr>
                        <td colSpan="2" style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>No uploads found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pipeline Console Logs Card */}
            <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Console Logs</h3>
                {pipelineSuccess !== null && (
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    fontWeight: 700,
                    backgroundColor: pipelineSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: pipelineSuccess ? '#34d399' : '#f87171'
                  }}>
                    {pipelineSuccess ? "SUCCESS" : "FAILED"}
                  </span>
                )}
              </div>
              <pre style={{
                backgroundColor: '#05070c',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.8rem',
                color: pipelineSuccess === false ? '#f87171' : '#a7f3d0',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                height: '130px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {pipelineLogs || "No logs output yet. Try attaching a CSV file or importing pasted CSV."}
              </pre>
            </div>

          </div>

          {/* Student Rankings Card */}
          <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Student Rankings</h3>
              <button 
                onClick={() => handleSendEmail('all')}
                disabled={emailLoading}
                style={{
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: emailLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {emailLoading ? "Sending to All..." : "Send Mail to All"}
              </button>
            </div>
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Percent</th>
                    <th>Grade</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.email}>
                      <td><strong>{student.rank}</strong></td>
                      <td><strong>{student.name}</strong></td>
                      <td>{student.email}</td>
                      <td>{student.cumulativePct.toFixed(2)}%</td>
                      <td>
                        <span className={getGradeClass(student.grade)}>{student.grade}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleSendEmail('individual', student.email)}
                          disabled={sendingIndividualEmail === student.email}
                          style={{
                            backgroundColor: '#3b82f6',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          {sendingIndividualEmail === student.email ? "Sending..." : "Send Email"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SMTP Config form in footer */}
      <hr style={{ margin: '3rem 0 var(--border-color)', opacity: 0.1 }} />
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>✉️ SMTP Settings</h4>
        <form onSubmit={handleSaveEmailSettings} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <input 
            type="email" 
            placeholder="Sender Email Address"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            style={{ width: '100%', backgroundColor: '#111827', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', padding: '0.5rem', fontSize: '0.85rem' }}
            required
          />
          <input 
            type="password" 
            placeholder="Gmail App Password"
            value={senderPassword}
            onChange={(e) => setSenderPassword(e.target.value)}
            style={{ width: '100%', backgroundColor: '#111827', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', padding: '0.5rem', fontSize: '0.85rem' }}
          />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              id="mock-check-footer" 
              checked={mockMode} 
              onChange={(e) => setMockMode(e.target.checked)} 
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            <label htmlFor="mock-check-footer" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>Enable Mock Mode</label>
            <button 
              type="submit" 
              style={{ marginLeft: 'auto', backgroundColor: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

export default App;
