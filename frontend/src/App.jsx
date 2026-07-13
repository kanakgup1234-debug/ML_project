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
  Radar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList
} from 'recharts';

function App() {
  const [activeTab, setActiveTab] = useState('home');
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

    setUploading(true);
    setPipelineLogs("Initiating file upload & pipeline trigger...\n");
    setPipelineSuccess(null);

    const formData = new FormData();
    formData.append('quizFile', uploadFile);

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

    setUploading(true);
    setPipelineLogs("Initiating CSV text import & pipeline trigger...\n");
    setPipelineSuccess(null);

    try {
      const res = await fetch("/api/students/import-csv-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText: csvText,
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
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', marginRight: '15px' }} />
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

  const GRADE_COLORS = {
    'B+': '#38bdf8', // light blue
    'A': '#2563eb',  // blue
    'A+': '#f472b6', // pink
    'B': '#ef4444',  // red
    'D': '#10b981',  // green
    'C': '#eab308',  // yellow
    'F': '#991b1b'   // dark red
  };

  const getLowestPct = () => {
    if (students.length === 0) return 6.67;
    return Math.min(...students.map(s => s.cumulativePct));
  };

  const getTop10Students = () => {
    if (students.length === 0) return [];
    return [...students]
      .sort((a, b) => b.cumulativePct - a.cumulativePct)
      .slice(0, 10)
      .reverse(); // Lowest at top, highest at bottom for horizontal bar chart
  };

  const getGradeDonutData = () => {
    if (!stats || !stats.gradeCounts) return [];
    const grades = ['B+', 'A', 'A+', 'B', 'D', 'C', 'F'];
    return grades.map(grade => ({
      name: grade,
      value: stats.gradeCounts[grade] || 0
    })).filter(item => item.value > 0);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0d0e12', color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Sidebar Navigation */}
      <aside style={{ width: '260px', backgroundColor: '#15161c', borderRight: '1px solid #23242e', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', flexShrink: 0 }}>
        <div>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8e92a2', fontWeight: 700, marginBottom: '1.5rem' }}>Navigation</h3>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {[
              { id: 'home', label: 'Home' },
              { id: 'leaderboard', label: 'Leaderboard' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'low_performers', label: 'Low Performers' },
              { id: 'student_search', label: 'Student Search' },
              { id: 'reports', label: 'Reports' }
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'none',
                    border: 'none',
                    color: isSelected ? '#ffffff' : '#a0aec0',
                    fontSize: '0.95rem',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    padding: '4px 0',
                    textAlign: 'left',
                    width: '100%',
                    outline: 'none',
                    transition: 'color 0.2s'
                  }}
                >
                  <span style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid #ffffff' : '2px solid #4a5568',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backgroundColor: isSelected ? '#ef4444' : 'transparent',
                    boxShadow: isSelected ? 'inset 0 0 0 2px #15161c' : 'none',
                    transition: 'all 0.2s'
                  }}>
                    {isSelected && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ffffff' }} />}
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1, padding: '3rem', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        
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

        {/* TAB 1: HOME */}
        {activeTab === 'home' && stats && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2.5rem' }}>
              <div style={{
                width: '45px',
                height: '45px',
                borderRadius: '8px',
                border: '1.5px solid #4a5568',
                backgroundColor: '#1c1d24',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: '3px',
                padding: '8px'
              }}>
                <div style={{ width: '6px', height: '14px', backgroundColor: '#4ade80', borderRadius: '1px' }} />
                <div style={{ width: '6px', height: '26px', backgroundColor: '#f43f5e', borderRadius: '1px' }} />
                <div style={{ width: '6px', height: '20px', backgroundColor: '#3b82f6', borderRadius: '1px' }} />
              </div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                ML & Agentic AI Training Dashboard
              </h1>
            </div>

            {/* Metrics Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#a0aec0', fontWeight: 500, marginBottom: '6px' }}>Total Students</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ffffff' }}>{stats.totalStudents}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#a0aec0', fontWeight: 500, marginBottom: '6px' }}>Average Percentage</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ffffff' }}>{stats.avgPercentage.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#a0aec0', fontWeight: 500, marginBottom: '6px' }}>Highest Percentage</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ffffff' }}>{stats.highestPercentage.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#a0aec0', fontWeight: 500, marginBottom: '6px' }}>Lowest Percentage</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ffffff' }}>{getLowestPct().toFixed(2)}</div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #23242e', marginBottom: '2.5rem' }} />

            {/* Content Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2.5rem' }}>
              
              {/* Top 10 Students Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>🏆</span>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Top 10 Students</h2>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#a0aec0', fontWeight: 600 }}>Top 10 Students</div>
                
                <div style={{ display: 'flex', alignItems: 'stretch', marginTop: '1rem' }}>
                  <div style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    color: '#8e92a2',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    marginRight: '12px',
                    textAlign: 'center',
                    letterSpacing: '0.1em',
                    alignSelf: 'center'
                  }}>
                    Name
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={getTop10Students()}
                        layout="vertical"
                        margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                      >
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="#2a2b36"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#ffffff', fontSize: '0.8rem' }}
                          width={140}
                        />
                        <Tooltip formatter={(value) => [`${value.toFixed(2)}%`]} />
                        <Bar dataKey="cumulativePct" fill="#60a5fa" radius={[0, 4, 4, 0]} barSize={14}>
                          <LabelList
                            dataKey="cumulativePct"
                            position="right"
                            formatter={(val) => val.toFixed(1)}
                            style={{ fill: '#ffffff', fontSize: '0.8rem', fontWeight: 600 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Grade Distribution Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>🎓</span>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Grade Distribution</h2>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#a0aec0', fontWeight: 600 }}>Grade Distribution</div>
                
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '260px' }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={getGradeDonutData()}
                        cx="45%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                      >
                        {getGradeDonutData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.name] || '#cbd5e1'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} students`, `Grade ${name}`]} />
                      <Legend 
                        layout="vertical" 
                        align="right" 
                        verticalAlign="middle" 
                        iconType="square"
                        iconSize={12}
                        formatter={(value) => <span style={{ color: '#ffffff', fontSize: '0.85rem' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Emoji in the bottom right corner */}
                <div style={{ position: 'absolute', bottom: '0px', right: '0px', fontSize: '1.8rem' }}>😎</div>
              </div>

            </div>
          </>
        )}

        {/* TAB 2: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div style={{ backgroundColor: '#15161c', border: '1px solid #23242e', borderRadius: '12px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Student Rankings</h2>
              <button 
                onClick={() => handleSendEmail('all')}
                disabled={emailLoading}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.2rem',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: emailLoading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {emailLoading ? "Sending to All..." : "Send Mail to All"}
              </button>
            </div>

            {emailLogs && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#0d0e12', border: '1px solid #23242e', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace', color: emailSuccess ? '#4ade80' : '#f87171', maxHeight: '150px', overflowY: 'auto' }}>
                {emailLogs}
              </div>
            )}
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Percent</th>
                    <th>Grade</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS */}
        {activeTab === 'analytics' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Module averages bar chart */}
            <div style={{ backgroundColor: '#15161c', border: '1px solid #23242e', borderRadius: '12px', padding: '2rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem' }}>Class Module Performance Averages</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.moduleAverages || []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fill: '#ffffff', fontSize: '0.85rem' }} />
                  <YAxis tick={{ fill: '#ffffff', fontSize: '0.85rem' }} domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value.toFixed(2)}%`]} />
                  <Bar dataKey="avgPct" fill="#eab308" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Individual Student profile lookup selector */}
            <div style={{ backgroundColor: '#15161c', border: '1px solid #23242e', borderRadius: '12px', padding: '2rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem' }}>Student Spotlight Analytics</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ maxWidth: '400px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#a0aec0', display: 'block', marginBottom: '8px' }}>Select Student</label>
                  <select 
                    value={selectedStudentEmail} 
                    onChange={(e) => setSelectedStudentEmail(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#0d0e12', border: '1px solid #23242e', color: '#ffffff', borderRadius: '8px', padding: '0.8rem', fontSize: '0.95rem' }}
                  >
                    {students.map(s => (
                      <option key={s.email} value={s.email}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                </div>

                {selectedStudentProfile && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Weekly Quiz Performance Timeline</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={getQuizTimelineData()}>
                          <XAxis dataKey="name" tick={{ fill: '#ffffff', fontSize: '0.85rem' }} />
                          <YAxis tick={{ fill: '#ffffff', fontSize: '0.85rem' }} domain={[0, 100]} />
                          <Tooltip formatter={(value) => [`${value.toFixed(2)}%`]} />
                          <Area type="monotone" dataKey="percentage" stroke="#ef4444" fill="rgba(239, 68, 68, 0.2)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Module Mastery Profile</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getModuleProfileData()}>
                          <PolarGrid stroke="#23242e" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff', fontSize: '0.75rem' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#a0aec0', fontSize: '0.75rem' }} />
                          <Radar name="Student Average" dataKey="percentage" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}



        {/* TAB 5: LOW PERFORMERS */}
        {activeTab === 'low_performers' && (
          <div style={{ backgroundColor: '#15161c', border: '1px solid #23242e', borderRadius: '12px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f87171' }}>Remedial Student Support List</h2>
            <p style={{ fontSize: '0.9rem', color: '#a0aec0', marginBottom: '1.5rem' }}>Students flagged based on overall cumulative percentage below 50% or receiving a D/F grade.</p>
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student Name</th>
                    <th>Email Address</th>
                    <th>Cumulative Percentage</th>
                    <th>Current Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {remedial.map((student) => (
                    <tr key={student.email}>
                      <td><strong>{student.rank}</strong></td>
                      <td><strong>{student.name}</strong></td>
                      <td>{student.email}</td>
                      <td>{student.cumulativePct.toFixed(2)}%</td>
                      <td>
                        <span className={getGradeClass(student.grade)}>{student.grade}</span>
                      </td>
                    </tr>
                  ))}
                  {remedial.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#a0aec0' }}>Great news! No students currently fall into the remedial category.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: STUDENT SEARCH */}
        {activeTab === 'student_search' && (
          <div style={{ backgroundColor: '#15161c', border: '1px solid #23242e', borderRadius: '12px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Individual Student lookup</h2>
            
            <div style={{ maxWidth: '400px', marginBottom: '2rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#a0aec0', display: 'block', marginBottom: '8px' }}>Select student email to review</label>
              <select 
                value={selectedStudentEmail} 
                onChange={(e) => setSelectedStudentEmail(e.target.value)}
                style={{ width: '100%', backgroundColor: '#0d0e12', border: '1px solid #23242e', color: '#ffffff', borderRadius: '8px', padding: '0.8rem', fontSize: '0.95rem' }}
              >
                {students.map(s => (
                  <option key={s.email} value={s.email}>{s.name} ({s.email})</option>
                ))}
              </select>
            </div>

            {selectedStudentProfile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {/* Meta details & ML Predictions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ padding: '1.5rem', backgroundColor: '#0d0e12', border: '1px solid #23242e', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a0aec0', fontWeight: 600 }}>Student details</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: '8px 0 4px 0' }}>{selectedStudentProfile.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#a0aec0' }}>{selectedStudentProfile.email}</div>
                    <div style={{ fontSize: '0.9rem', marginTop: '12px', fontWeight: 600 }}>Rank: <span style={{ color: '#fbbf24' }}>#{selectedStudentProfile.rank}</span></div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Overall Average: <span style={{ color: '#ef4444' }}>{selectedStudentProfile.cumulativePct.toFixed(2)}%</span></div>
                  </div>

                  <div style={{ padding: '1.5rem', backgroundColor: '#0d0e12', border: '1px solid #23242e', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a0aec0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔮</span> ML Performance Predictor
                    </div>
                    {selectedStudentProfile.predictedScore !== undefined && selectedStudentProfile.predictedScore !== null ? (
                      <>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '8px 0 4px 0', color: '#4ade80' }}>
                          {selectedStudentProfile.predictedScore.toFixed(1)}% predicted
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          Predicted Grade: <span style={{ color: '#fbbf24' }}>{selectedStudentProfile.predictedGrade}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '8px' }}>
                          Calculated using Linear Regression & Random Forest model pipelines.
                        </div>
                      </>
                    ) : (
                      <div style={{ color: '#a0aec0', fontSize: '0.9rem', marginTop: '1rem' }}>No predictions available yet. Please train models in the Reports tab.</div>
                    )}
                  </div>
                </div>

                {/* Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Quiz performance timeline</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={getQuizTimelineData()}>
                        <XAxis dataKey="name" tick={{ fill: '#ffffff', fontSize: '0.85rem' }} />
                        <YAxis tick={{ fill: '#ffffff', fontSize: '0.85rem' }} domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value.toFixed(2)}%`]} />
                        <Area type="monotone" dataKey="percentage" stroke="#ef4444" fill="rgba(239, 68, 68, 0.2)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Module mastery profile</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getModuleProfileData()}>
                        <PolarGrid stroke="#23242e" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff', fontSize: '0.75rem' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#a0aec0', fontSize: '0.75rem' }} />
                        <Radar name="Student Average" dataKey="percentage" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: REPORTS / SETTINGS */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Upload form block */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
              
              <div style={{ backgroundColor: '#15161c', border: '1px solid #23242e', borderRadius: '12px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Upload Quiz File</h3>
                


                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    style={{ display: 'none' }}
                    id="quiz-file-picker-tab"
                  />
                  <label 
                    htmlFor="quiz-file-picker-tab" 
                    style={{ 
                      flexGrow: 1, 
                      backgroundColor: '#0d0e12', 
                      border: '1px solid #23242e', 
                      borderRadius: '8px', 
                      padding: '0.7rem', 
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
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.7rem 1.4rem',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: (uploading || !uploadFile) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {uploading ? "Uploading..." : "Attach and Update"}
                  </button>
                </div>

                <div>
                  <textarea 
                    placeholder="Paste CSV text here"
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    style={{
                      width: '100%',
                      height: '110px',
                      backgroundColor: '#0d0e12',
                      border: '1px solid #23242e',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '0.7rem',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '4px', display: 'block' }}>
                    Paste CSV content directly and import.
                  </span>
                </div>

                <button 
                  onClick={handleCsvTextImport}
                  disabled={uploading || !csvText.trim()}
                  style={{
                    width: '100%',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: (uploading || !csvText.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Import Pasted CSV
                </button>

                {pipelineLogs && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#0d0e12', border: '1px solid #23242e', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace', color: pipelineSuccess ? '#4ade80' : '#f87171', maxHeight: '150px', overflowY: 'auto' }}>
                    {pipelineLogs}
                  </div>
                )}
              </div>

              {/* Recent uploads */}
              <div style={{ backgroundColor: '#15161c', border: '1px solid #23242e', borderRadius: '12px', padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.2rem' }}>Recent Uploads</h3>
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
                          <td style={{ padding: '8px', color: '#a0aec0' }}>{file.filename}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#a0aec0' }}>{file.dateStr}</td>
                        </tr>
                      ))}
                      {(!stats.recentUploads || stats.recentUploads.length === 0) && (
                        <tr>
                          <td colSpan="2" style={{ padding: '8px', textAlign: 'center', color: '#a0aec0' }}>No uploads found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>



          </div>
        )}

      </main>
    </div>
  );
}

export default App;
