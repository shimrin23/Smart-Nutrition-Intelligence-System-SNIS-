import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Apple, 
  Plus, 
  Trash2, 
  Brain, 
  BarChart2, 
  Settings, 
  User, 
  UserPlus, 
  Send, 
  Flame,
  Calendar,
  Sparkles,
  Scale,
  Camera,
  Loader2,
  ListPlus,
  Sun,
  Moon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [activeUser, setActiveUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'analytics', 'coach', 'settings'
  
  // Auth state
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup' | 'forgot' | 'check-email'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);

  // App states
  const [foodLogs, setFoodLogs] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  
  // ML States
  const [mlRecommendations, setMlRecommendations] = useState([]);
  const [trendRange, setTrendRange] = useState('week'); // 'day', 'week', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState(() => {
    const past = new Date();
    past.setDate(past.getDate() - 6);
    return past.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentSummaryRange, setCurrentSummaryRange] = useState({ start: null, end: null });

  // Onboarding form state
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    age: 28,
    gender: 'male',
    weight_kg: 70,
    height_cm: 175,
    activity_level: 'moderately_active',
    goal: 'maintain'
  });

  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Food log form state
  const [newLog, setNewLog] = useState({
    food_name: '',
    quantity: '',
    unit: 'grams',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    iron: '',
    calcium: '',
    sodium: ''
  });

  // AI parsing loading/input states
  const [aiTextInput, setAiTextInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Coach Chat state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: "Hello! I am your AI Nutrition Coach. Register or select a user profile to get customized dietary advice!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  // Check URL query parameters for verification / reset tokens
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (path === '/verify-email' && token) {
      setAuthView('verify-email');
      verifyEmailToken(token);
    } else if (path === '/reset-password' && token) {
      setAuthView('reset-password');
      setResetToken(token);
    }
  }, []);

  // Load Google Identity Services and initialize the Google Sign-In button
  useEffect(() => {
    const GOOGLE_CLIENT_ID = '197629052788-8nsm6ofc02g9dafijkumce6p1j25vsc5.apps.googleusercontent.com';
    const loadGoogleScript = () => {
      if (document.getElementById('google-gsi-script')) return;
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.id = 'google-gsi-script';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredential,
            auto_select: false,
          });
        }
      };
      document.body.appendChild(script);
    };
    loadGoogleScript();
  }, []);

  // Toggle dark/light theme on body
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [darkMode]);

  // Fetch logs and summary when active user changes, and save selected user to localStorage
  useEffect(() => {
    setAiAnalysis(null);
    if (activeUser) {
      localStorage.setItem('activeUserId', activeUser.id.toString());
      fetchLogs(activeUser.id);
      fetchMlData(activeUser.id);
      setChatMessages([
        { 
          sender: 'ai', 
          text: `Hello ${activeUser.username}! I am your personal AI Nutrition Coach. Based on your profile metrics, your daily requirement is **${activeUser.target_calories} kcal** to **${activeUser.goal.replace('_', ' ')}**.\n\nAsk me anything! For example: "What should I eat for breakfast to meet my protein goals?" or "What are some high-iron foods?"`,
          isWelcome: true
        }
      ]);
    } else {
      setFoodLogs([]);
      setDailySummary([]);
      setMlRecommendations([]);
    }
  }, [activeUser]);

  // Fetch summary reactively based on date range selection
  useEffect(() => {
    let start = null;
    let end = null;
    const today = new Date();
    
    if (trendRange === 'day') {
      const todayStr = today.toISOString().split('T')[0];
      start = todayStr;
      end = todayStr;
    } else if (trendRange === 'week') {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 6);
      start = pastDate.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (trendRange === 'month') {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 29);
      start = pastDate.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (trendRange === 'custom') {
      start = customStartDate;
      end = customEndDate;
    }
    
    setCurrentSummaryRange({ start, end });
    if (activeUser) {
      fetchSummary(activeUser.id, start, end);
    }
  }, [activeUser?.id, trendRange, customStartDate, customEndDate]);

  const restoreSession = async () => {
    try {
      const savedUserId = localStorage.getItem('activeUserId');
      if (savedUserId) {
        const parsedId = parseInt(savedUserId);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/users/${parsedId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          setActiveUser(user);
        }
      }
    } catch (err) {
      console.error("Error restoring session:", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!loginEmail || !loginPassword) return;
    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveUser(data.user);
        localStorage.setItem('activeUserId', data.user.id.toString());
        localStorage.setItem('token', data.access_token);
        setLoginEmail('');
        setLoginPassword('');
      } else {
        const errData = await res.json();
        setAuthError(errData.detail || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      console.error("Login failed:", err);
      setAuthError("Failed to connect to backend server.");
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!newUser.email || !newUser.password) {
      setAuthError('Email and password are required');
      return;
    }
    if (!newUser.email.includes('@')) {
      setAuthError('Please enter a valid email address');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setAuthView('check-email');
        setAuthSuccess(`Verification email sent to ${newUser.email}. Please check your inbox and click the link to activate your account.`);
        setNewUser({ email: '', password: '', age: 28, gender: 'male', weight_kg: 70, height_cm: 175, activity_level: 'moderately_active', goal: 'maintain' });
      } else {
        const errData = await res.json();
        setAuthError(errData.detail || 'Sign up failed.');
      }
    } catch (err) {
      console.error("Sign up failed:", err);
      setAuthError("Failed to connect to backend server.");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      const res = await fetch(`${API_BASE}/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail })
      });
      const data = await res.json();
      setAuthSuccess(data.message);
    } catch (err) {
      setAuthError('Failed to connect to server.');
    }
  };

  const verifyEmailToken = async (token) => {
    setAuthError('');
    setAuthSuccess('');
    try {
      const res = await fetch(`${API_BASE}/users/verify-email?token=${token}`);
      const data = await res.json();
      if (res.ok) {
        setAuthSuccess(data.message || 'Email verified successfully! You can now log in.');
      } else {
        setAuthError(data.detail || 'Email verification failed.');
      }
    } catch (err) {
      console.error("Email verification error:", err);
      setAuthError('Failed to connect to backend server for email verification.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!newPassword) {
      setAuthError('Please enter a new password');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSuccess(data.message || 'Password reset successfully! You can now log in.');
        setNewPassword('');
        setResetToken('');
        setAuthView('login');
      } else {
        setAuthError(data.detail || 'Password reset failed.');
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setAuthError('Failed to connect to backend server for password reset.');
    }
  };

  const handleSignOut = () => {
    setActiveUser(null);
    localStorage.removeItem('activeUserId');
    localStorage.removeItem('token');
    setActiveTab('dashboard'); // Reset tab
    setShowDangerZone(false);
  };

  const handleGoogleCredential = async (response) => {
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/users/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveUser(data.user);
        localStorage.setItem('activeUserId', data.user.id.toString());
        localStorage.setItem('token', data.access_token);
      } else {
        const errData = await res.json();
        setAuthError(errData.detail || 'Google sign-in failed.');
      }
    } catch (err) {
      console.error('Google login error:', err);
      setAuthError('Failed to connect to backend server.');
    }
  };

  const triggerGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      setAuthError('Google Sign-In is not available. Please try again.');
    }
  };

  const fetchLogs = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/food-logs/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFoodLogs(data);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const fetchSummary = async (userId, startDate = null, endDate = null) => {
    try {
      let url = `${API_BASE}/food-logs/user/${userId}/summary`;
      const params = [];
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const token = localStorage.getItem('token');
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDailySummary(data);
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
    }
  };

  const fetchMlData = async (userId) => {
    try {
      // 1. Fetch recommendations
      const token = localStorage.getItem('token');
      const recRes = await fetch(`${API_BASE}/ml/recommend-foods/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (recRes.ok) {
        const recData = await recRes.json();
        setMlRecommendations(recData);
      }
    } catch (err) {
      console.error("Error fetching ML analytics:", err);
    }
  };

  // handleCreateUser removed in favor of handleSignUp

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        username: activeUser.username,
        age: parseInt(activeUser.age),
        gender: activeUser.gender,
        weight_kg: parseFloat(activeUser.weight_kg),
        height_cm: parseFloat(activeUser.height_cm),
        activity_level: activeUser.activity_level,
        goal: activeUser.goal
      };
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/users/${activeUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setActiveUser(data);
        fetchMlData(data.id);
        alert("Profile updated and target nutrition recalculated!");
      } else {
        const errData = await res.json();
        alert(`Error updating profile: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Error updating user:", err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!activeUser) return;
    const confirmDelete = window.confirm(
      "Are you sure you want to permanently delete your account and all meal logs? This action is irreversible."
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/users/${activeUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Account deleted successfully.");
        handleSignOut();
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting account:", err);
      alert("An error occurred while connecting to the server.");
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!activeUser) {
      alert("Please select or create a user profile first!");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/food-logs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...newLog,
          quantity: newLog.quantity === '' ? 0.0 : parseFloat(newLog.quantity),
          calories: newLog.calories === '' ? 0.0 : parseFloat(newLog.calories),
          protein: newLog.protein === '' ? 0.0 : parseFloat(newLog.protein),
          carbs: newLog.carbs === '' ? 0.0 : parseFloat(newLog.carbs),
          fat: newLog.fat === '' ? 0.0 : parseFloat(newLog.fat),
          fiber: newLog.fiber === '' ? 0.0 : parseFloat(newLog.fiber),
          iron: newLog.iron === '' ? 0.0 : parseFloat(newLog.iron),
          calcium: newLog.calcium === '' ? 0.0 : parseFloat(newLog.calcium),
          sodium: newLog.sodium === '' ? 0.0 : parseFloat(newLog.sodium),
          user_id: activeUser.id
        })
      });
      if (res.ok) {
        fetchLogs(activeUser.id);
        fetchSummary(activeUser.id, currentSummaryRange.start, currentSummaryRange.end);
        fetchMlData(activeUser.id); // recalculate recommendations
        
        // Reset form
        setNewLog({
          food_name: '',
          quantity: '',
          unit: 'grams',
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
          fiber: '',
          iron: '',
          calcium: '',
          sodium: ''
        });
        setAiAnalysis(null);
      }
    } catch (err) {
      console.error("Error logging food:", err);
    }
  };

  const handleDeleteLog = async (logId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/food-logs/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchLogs(activeUser.id);
        fetchSummary(activeUser.id, currentSummaryRange.start, currentSummaryRange.end);
        fetchMlData(activeUser.id); // recalculate recommendations
      }
    } catch (err) {
      console.error("Error deleting log:", err);
    }
  };

  // AI Text Analysis Call
  const handleAiTextAnalyze = async (e) => {
    e.preventDefault();
    if (!aiTextInput.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiTextInput })
      });
      if (res.ok) {
        const data = await res.json();

        setAiAnalysis(data);
        setAiTextInput('');
      } else {
        const err = await res.json();
        alert(`AI parsing error: ${err.detail}`);
      }
    } catch (err) {
      console.error("AI analysis failed:", err);
      alert("Failed to connect to AI text analysis backend.");
    } finally {
      setAiLoading(false);
    }
  };

  // AI Image Analysis Call
  const handleAiImageAnalyze = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setAiLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`${API_BASE}/ai/analyze-image`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();

        setAiAnalysis(data);
      } else {
        const err = await res.json();
        alert(`AI image analysis error: ${err.detail}`);
      }
    } catch (err) {
      console.error("AI Image analysis failed:", err);
      alert("Failed to connect to AI image analysis backend.");
    } finally {
      setAiLoading(false);
      e.target.value = '';
    }
  };

  // AI Chat Call
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeUser) return;

    const userMsgText = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsgText }]);
    setChatInput('');
    setChatLoading(true);

    const historyPayload = [];
    let index = 0;
    while (index < chatMessages.length) {
      const current = chatMessages[index];
      if (current.sender === 'user') {
        const next = chatMessages[index + 1];
        historyPayload.push({
          role: 'user',
          content: current.text
        });
        if (next && next.sender === 'ai') {
          historyPayload.push({
            role: 'model',
            content: next.text
          });
        }
      }
      index++;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          user_id: activeUser.id,
          message: userMsgText,
          history: historyPayload
        })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { sender: 'ai', text: data.response }]);
      } else {
        const err = await res.json();
        setChatMessages(prev => [...prev, { sender: 'ai', text: `Sorry, I failed to generate a response. Details: ${err.detail}` }]);
      }
    } catch (err) {
      console.error("AI Coach connection failed:", err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I had trouble communicating with the server." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper to load recommendation into form
  const applyRecommendation = (rec) => {
    setNewLog({
      food_name: rec.food_name,
      quantity: 100,
      unit: 'grams',
      calories: Math.round((rec.protein * 4) + (rec.carbs * 4) + (rec.fat * 9)),
      protein: Math.round(rec.protein),
      carbs: Math.round(rec.carbs),
      fat: Math.round(rec.fat),
      fiber: 2.0,
      iron: 0.0,
      calcium: 0.0,
      sodium: 0.0
    });
  };

  // Calculations for Today's Progress
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySummary = dailySummary.find(s => s.date === todayStr) || {
    total_calories: 0.0,
    total_protein: 0.0,
    total_carbs: 0.0,
    total_fat: 0.0,
    total_fiber: 0.0,
  };

  const calorieProgress = activeUser ? (todaySummary.total_calories / activeUser.target_calories) * 100 : 0;
  const calPercent = Math.round(calorieProgress);
  const clampedPercent = Math.min(Math.max(calPercent, 0), 100);

  // SVG circular properties
  const radius = 70;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;
  const waterTranslateY = 120 - (clampedPercent / 100) * 130;

  const parseMarkdownText = (text) => {
    if (!text) return '';
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} style={{ fontWeight: 600, color: 'var(--primary)' }}>{part}</strong>;
      }
      return part;
    });
  };

  if (!activeUser) {
    const switchView = (view) => { setAuthView(view); setAuthError(''); setAuthSuccess(''); };

    return (
      <div className="auth-container">
        <div className="auth-overlay"></div>
        <div className="glass-card auth-card animated-fade-in">
          <div className="auth-header">
            <Activity size={40} className="auth-logo-icon" />
            <h1 className="auth-title">SNIS AI</h1>
            <p className="auth-subtitle">Smart Nutrition Intelligence System</p>
          </div>

          {authError && <div className="auth-error animated-fade-in">{authError}</div>}
          {authSuccess && <div className="auth-success animated-fade-in">{authSuccess}</div>}

          {/* LOGIN */}
          {authView === 'login' && (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="Enter your email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              </div>
              <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '8px' }}>
                <span onClick={() => switchView('forgot')} style={{ fontSize: '12px', color: 'hsl(var(--primary))', cursor: 'pointer', fontWeight: 500 }}>Forgot password?</span>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Sign In</button>
              <div className="auth-divider"><span>or</span></div>
              <button type="button" className="btn-google" onClick={triggerGoogleSignIn}>
                <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                Sign in with Google
              </button>
              <p className="auth-toggle-text">Don't have an account? <span onClick={() => switchView('signup')}>Create Account</span></p>
            </form>
          )}

          {/* SIGNUP */}
          {authView === 'signup' && (
            <form onSubmit={handleSignUp} className="auth-form onboarding-form">
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '6px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginBottom: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>Account Settings</h3>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" placeholder="you@gmail.com" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" placeholder="Create a strong password" value={newUser.password || ''} onChange={(e) => setNewUser({...newUser, password: e.target.value})} required />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginTop: '20px', marginBottom: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>Biometric Profile</h3>
                <div className="form-row">
                  <div className="form-group"><label>Age (years)</label><input type="number" value={newUser.age} onChange={(e) => setNewUser({...newUser, age: parseInt(e.target.value)})} required /></div>
                  <div className="form-group"><label>Gender</label><select value={newUser.gender} onChange={(e) => setNewUser({...newUser, gender: e.target.value})}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Weight (kg)</label><input type="number" step="0.1" value={newUser.weight_kg} onChange={(e) => setNewUser({...newUser, weight_kg: parseFloat(e.target.value)})} required /></div>
                  <div className="form-group"><label>Height (cm)</label><input type="number" value={newUser.height_cm} onChange={(e) => setNewUser({...newUser, height_cm: parseInt(e.target.value)})} required /></div>
                </div>
                <div className="form-group"><label>Activity Level</label><select value={newUser.activity_level} onChange={(e) => setNewUser({...newUser, activity_level: e.target.value})}><option value="sedentary">Sedentary</option><option value="lightly_active">Lightly Active</option><option value="moderately_active">Moderately Active</option><option value="active">Active</option><option value="very_active">Very Active</option></select></div>
                <div className="form-group"><label>Nutrition Goal</label><select value={newUser.goal} onChange={(e) => setNewUser({...newUser, goal: e.target.value})}><option value="lose_weight">Lose Weight (–500 kcal)</option><option value="maintain">Maintain Weight</option><option value="gain_weight">Gain Weight (+400 kcal)</option></select></div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Create Account & Send Verification</button>
              <div className="auth-divider"><span>or</span></div>
              <button type="button" className="btn-google" onClick={triggerGoogleSignIn}>
                <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                Sign up with Google
              </button>
              <p className="auth-toggle-text">Already have an account? <span onClick={() => switchView('login')}>Sign In</span></p>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {authView === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="auth-form">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>Enter your registered email and we'll send a reset link.</p>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="Enter your email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>Send Reset Link</button>
              <p className="auth-toggle-text"><span onClick={() => switchView('login')}>← Back to Sign In</span></p>
            </form>
          )}

          {/* CHECK EMAIL */}
          {authView === 'check-email' && (
            <div className="auth-form" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>📧</div>
              <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '12px' }}>Check your inbox!</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '24px' }}>
                {authSuccess || 'A verification email has been sent. Click the link in the email to activate your account.'}
              </p>
              <p className="auth-toggle-text">Already verified? <span onClick={() => switchView('login')}>Sign In</span></p>
            </div>
          )}

          {/* VERIFY EMAIL */}
          {authView === 'verify-email' && (
            <div className="auth-form" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>
                {authError ? '❌' : authSuccess ? '✅' : '⏳'}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '12px' }}>
                {authError ? 'Verification Failed' : authSuccess ? 'Verification Success' : 'Verifying email...'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '24px' }}>
                {authError || authSuccess || 'Please wait while we verify your email address...'}
              </p>
              <p className="auth-toggle-text"><span onClick={() => { switchView('login'); window.history.replaceState({}, '', '/'); }}>← Back to Sign In</span></p>
            </div>
          )}

          {/* RESET PASSWORD */}
          {authView === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="auth-form">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>Enter your new password below.</p>
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  placeholder="Enter new password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>Reset Password</button>
              <p className="auth-toggle-text"><span onClick={() => { switchView('login'); window.history.replaceState({}, '', '/'); }}>← Back to Sign In</span></p>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <div className="header-content">
          <a href="#" className="logo" onClick={() => setActiveTab('dashboard')}>
            <Activity size={26} />
            <span>SNIS AI</span>
          </a>
          
          <div className="user-selector">
            {activeUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                  <User size={14} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{activeUser.username}</span>
                </div>
                
                <button 
                  className="btn btn-secondary" 
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              </div>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '6px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={14} style={{ color: 'hsl(var(--warning))' }} /> : <Moon size={14} style={{ color: 'hsl(var(--primary))' }} />}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
            {/* Navigation Tabs */}
            <div className="tabs-navigation animated-fade-in">
              <button 
                className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <Apple size={18} />
                <span>Dashboard</span>
              </button>
              
              <button 
                className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <BarChart2 size={18} />
                <span>Analytics Trends</span>
              </button>
              
              <button 
                className={`tab-btn ${activeTab === 'coach' ? 'active' : ''}`}
                onClick={() => setActiveTab('coach')}
              >
                <Brain size={18} />
                <span>AI Coach</span>
              </button>
              
              <button 
                className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>
            </div>

            <div className="animated-fade-in">
                {/* 1. DASHBOARD VIEW */}
                {activeTab === 'dashboard' && (
                  <div className="dashboard-grid">
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                      {/* Calorie & Macro Target Progress Card */}
                      <div className="glass-card">
                        <h2 className="widget-title">
                          <Flame size={20} style={{ color: 'var(--danger)' }} />
                          <span>Today's Energy Balance</span>
                        </h2>
                        
                        <div className="ring-summary-container">
                          <div className="calorie-ring-box">
                            <svg width="160" height="160" style={{ zIndex: 1, position: 'relative' }}>
                              <circle
                                stroke="rgba(255,255,255,0.04)"
                                fill="transparent"
                                strokeWidth={stroke}
                                r={normalizedRadius}
                                cx="80"
                                cy="80"
                              />
                              <circle
                                fill="transparent"
                                strokeWidth={stroke}
                                strokeDasharray={circumference + ' ' + circumference}
                                strokeDashoffset={strokeDashoffset}
                                stroke="var(--primary)"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' }}
                                r={normalizedRadius}
                                cx="80"
                                cy="80"
                              />
                            </svg>
                            <div className="water-fill-circle">
                              <div className="water-waves-wrapper" style={{ transform: `translateY(${waterTranslateY}px)`, transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                                <div className="water-wave primary"></div>
                                <div className="water-wave secondary"></div>
                              </div>
                            </div>
                            <div className="calorie-label-center">
                              <span className="calorie-pct">{clampedPercent}%</span>
                              <span className="calorie-val-sub">{Math.round(todaySummary.total_calories)} / {activeUser.target_calories} kcal</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                              <span style={{ fontSize: '14px' }}>Logged: <strong>{Math.round(todaySummary.total_calories)} kcal</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Remaining: <strong>{Math.max(0, activeUser.target_calories - Math.round(todaySummary.total_calories))} kcal</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="macro-bars-grid">
                          <div className="macro-bar-card">
                            <div className="macro-meta">
                              <span className="macro-name protein">Protein</span>
                              <span className="macro-target">{activeUser.target_protein}g target</span>
                            </div>
                            <div className="macro-values">
                              {Math.round(todaySummary.total_protein)}g
                            </div>
                            <div className="progress-track-bg">
                              <div 
                                className="progress-fill protein" 
                                style={{ width: `${Math.min((todaySummary.total_protein / activeUser.target_protein) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="macro-bar-card">
                            <div className="macro-meta">
                              <span className="macro-name carbs">Carbs</span>
                              <span className="macro-target">{activeUser.target_carbs}g target</span>
                            </div>
                            <div className="macro-values">
                              {Math.round(todaySummary.total_carbs)}g
                            </div>
                            <div className="progress-track-bg">
                              <div 
                                className="progress-fill carbs" 
                                style={{ width: `${Math.min((todaySummary.total_carbs / activeUser.target_carbs) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="macro-bar-card">
                            <div className="macro-meta">
                              <span className="macro-name fat">Fat</span>
                              <span className="macro-target">{activeUser.target_fat}g target</span>
                            </div>
                            <div className="macro-values">
                              {Math.round(todaySummary.total_fat)}g
                            </div>
                            <div className="progress-track-bg">
                              <div 
                                className="progress-fill fat" 
                                style={{ width: `${Math.min((todaySummary.total_fat / activeUser.target_fat) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="macro-bar-card">
                            <div className="macro-meta">
                              <span className="macro-name fiber">Fiber</span>
                              <span className="macro-target">30g target</span>
                            </div>
                            <div className="macro-values">
                              {Math.round(todaySummary.total_fiber)}g
                            </div>
                            <div className="progress-track-bg">
                              <div 
                                className="progress-fill fiber" 
                                style={{ width: `${Math.min((todaySummary.total_fiber / 30) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Food Analysis & Explanation Box */}
                      {aiAnalysis && (
                        <div className="glass-card animated-fade-in" style={{ border: '1px solid rgba(6, 182, 212, 0.35)', boxShadow: '0 0 25px rgba(6, 182, 212, 0.15)' }}>
                          <h2 className="widget-title" style={{ color: 'var(--accent)' }}>
                            <Sparkles size={20} />
                            <span>AI Food Analysis & Explanation</span>
                          </h2>
                          
                          <div style={{ marginBottom: '16px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Identified Food</span>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginTop: '2px' }}>{aiAnalysis.food_name}</h3>
                          </div>
                          
                          {aiAnalysis.explanation && (
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-light)', marginBottom: '16px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Nutritional Explanation</span>
                              <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'hsl(var(--text-secondary))', margin: 0 }}>
                                {aiAnalysis.explanation}
                              </p>
                            </div>
                          )}

                          <div className="macro-bars-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-light)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Calories</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{Math.round(aiAnalysis.calories)} kcal</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-light)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Protein</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>{Math.round(aiAnalysis.protein)}g</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-light)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Carbs</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>{Math.round(aiAnalysis.carbs)}g</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-light)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Fat</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--warning)' }}>{Math.round(aiAnalysis.fat)}g</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              type="button"
                              className="btn btn-primary" 
                              style={{ flex: 2, padding: '10px 16px' }}
                              onClick={async () => {
                                if (!activeUser) {
                                  alert("Please select or create a user profile first!");
                                  return;
                                }
                                const token = localStorage.getItem('token');
                                const logData = {
                                  food_name: aiAnalysis.food_name || "",
                                  quantity: aiAnalysis.quantity === '' ? 0.0 : parseFloat(aiAnalysis.quantity || 1),
                                  unit: aiAnalysis.unit || "serving",
                                  calories: aiAnalysis.calories === '' ? 0.0 : parseFloat(Math.round(aiAnalysis.calories || 0)),
                                  protein: aiAnalysis.protein === '' ? 0.0 : parseFloat(Math.round(aiAnalysis.protein || 0)),
                                  carbs: aiAnalysis.carbs === '' ? 0.0 : parseFloat(Math.round(aiAnalysis.carbs || 0)),
                                  fat: aiAnalysis.fat === '' ? 0.0 : parseFloat(Math.round(aiAnalysis.fat || 0)),
                                  fiber: aiAnalysis.fiber === '' ? 0.0 : parseFloat(Math.round(aiAnalysis.fiber || 0)),
                                  iron: aiAnalysis.iron === '' ? 0.0 : parseFloat(aiAnalysis.iron || 0),
                                  calcium: aiAnalysis.calcium === '' ? 0.0 : parseFloat(aiAnalysis.calcium || 0),
                                  sodium: aiAnalysis.sodium === '' ? 0.0 : parseFloat(aiAnalysis.sodium || 0),
                                  user_id: activeUser.id
                                };
                                try {
                                  const res = await fetch(`${API_BASE}/food-logs/`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify(logData)
                                  });
                                  if (res.ok) {
                                    fetchLogs(activeUser.id);
                                    fetchSummary(activeUser.id, currentSummaryRange.start, currentSummaryRange.end);
                                    fetchMlData(activeUser.id);
                                    setAiAnalysis(null);
                                  } else {
                                    alert("Failed to add food.");
                                  }
                                } catch(e) {
                                  console.error("Error adding AI food:", e);
                                  alert("Error connecting to server.");
                                }
                              }}
                            >
                              <ListPlus size={16} />
                              <span>Add to Energy Balance</span>
                            </button>
                            <button 
                              type="button"
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: '10px 16px' }}
                              onClick={() => setAiAnalysis(null)}
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Logged foods table */}
                      <div className="glass-card">
                        <h2 className="widget-title">
                          <Apple size={20} style={{ color: 'var(--accent)' }} />
                          <span>Logged Foods History</span>
                        </h2>
                        
                        {foodLogs.length === 0 ? (
                          <p style={{ color: 'hsl(var(--text-muted))', textAlign: 'center', padding: '24px' }}>
                            No meals logged yet. Use the logger on the right to log your first meal!
                          </p>
                        ) : (
                          <div className="logs-list">
                            {foodLogs.map(log => (
                              <div key={log.id} className="log-item">
                                <div className="log-food-info">
                                  <div className="log-food-avatar">
                                    <Apple size={20} />
                                  </div>
                                  <div className="log-food-text">
                                    <span className="log-food-name">{log.food_name}</span>
                                    <span className="log-food-qty">{log.quantity} {log.unit} • {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                  <div className="log-macros-summary">
                                    <div className="log-macro-val">
                                      <span style={{ fontWeight: 600 }}>{Math.round(log.calories)}</span>
                                      <span className="log-macro-lbl">Kcal</span>
                                    </div>
                                    <div className="log-macro-val">
                                      <span style={{ fontWeight: 600 }}>{Math.round(log.protein)}g</span>
                                      <span className="log-macro-lbl">Prot</span>
                                    </div>
                                    <div className="log-macro-val">
                                      <span style={{ fontWeight: 600 }}>{Math.round(log.carbs)}g</span>
                                      <span className="log-macro-lbl">Carb</span>
                                    </div>
                                    <div className="log-macro-val">
                                      <span style={{ fontWeight: 600 }}>{Math.round(log.fat)}g</span>
                                      <span className="log-macro-lbl">Fat</span>
                                    </div>
                                  </div>
                                  <button 
                                    className="log-delete-btn"
                                    onClick={() => handleDeleteLog(log.id)}
                                    title="Delete Entry"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right column - AI Estimations and K-Means Suggestions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                      
                      {/* AI parser card */}
                      <div className="glass-card">
                        <h2 className="widget-title">
                          <Sparkles size={20} style={{ color: 'var(--accent)' }} />
                          <span>AI Smart Estimator</span>
                        </h2>

                        <form onSubmit={handleAiTextAnalyze} style={{ marginBottom: '18px' }}>
                          <div className="form-group">
                            <label>Describe your meal in plain English</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 2 fried eggs, 1 glass of orange juice"
                              value={aiTextInput}
                              onChange={(e) => setAiTextInput(e.target.value)}
                              disabled={aiLoading}
                              required
                            />
                          </div>
                          <button type="submit" className={`btn btn-primary ${aiLoading ? 'btn-loading' : ''}`} disabled={aiLoading}>
                            {aiLoading ? (
                              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <Sparkles size={16} />
                            )}
                            <span>Analyze Text with AI</span>
                          </button>
                        </form>

                        <div style={{ borderBottom: '1px solid var(--border-light)', margin: '18px 0' }}></div>

                        <div className="form-group">
                          <label>Or, Snap/Upload a photo of your plate</label>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <label className={`btn btn-primary ${aiLoading ? 'btn-loading' : ''}`} style={{ flex: 1, margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Camera size={16} style={{ color: '#ffffff' }} />
                              <span style={{ color: '#ffffff' }}>Choose Photo</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleAiImageAnalyze} 
                                style={{ display: 'none' }}
                                disabled={aiLoading}
                              />
                            </label>
                          </div>
                        </div>

                      </div>



                      {/* Log form (fills automatically from AI or user manual input) */}
                      <div id="manual-food-logger-card" className="glass-card" style={{ transition: 'border-color 0.5s ease' }}>
                        <h2 className="widget-title">
                          <Plus size={20} style={{ color: 'var(--primary)' }} />
                          <span>Manual Food Logger</span>
                        </h2>

                        <form onSubmit={handleAddLog}>
                          <div className="form-group">
                            <label>Food Item Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Oats with Almond Milk"
                              value={newLog.food_name}
                              onChange={(e) => setNewLog({...newLog, food_name: e.target.value})}
                              required
                            />
                          </div>

                          <div className="form-row">
                            <div className="form-group">
                              <label>Quantity</label>
                              <input 
                                type="number" 
                                step="0.1"
                                placeholder="e.g. 100"
                                value={newLog.quantity}
                                onChange={(e) => setNewLog({...newLog, quantity: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Unit</label>
                              <select 
                                value={newLog.unit}
                                onChange={(e) => setNewLog({...newLog, unit: e.target.value})}
                              >
                                <option value="grams">Grams (g)</option>
                                <option value="cups">Cups</option>
                                <option value="pieces">Pieces</option>
                                <option value="plates">Plates</option>
                                <option value="unit">Unit</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ margin: '14px 0', borderBottom: '1px solid var(--border-light)' }}></div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                              <label>Calories (kcal)</label>
                              <input 
                                type="number" 
                                placeholder="e.g. 150"
                                value={newLog.calories}
                                onChange={(e) => setNewLog({...newLog, calories: e.target.value === '' ? '' : parseInt(e.target.value)})}
                              />
                            </div>
                            <div className="form-group">
                              <label>Protein (g)</label>
                              <input 
                                type="number" 
                                placeholder="e.g. 10"
                                value={newLog.protein}
                                onChange={(e) => setNewLog({...newLog, protein: e.target.value === '' ? '' : parseInt(e.target.value)})}
                              />
                            </div>
                            <div className="form-group">
                              <label>Carbs (g)</label>
                              <input 
                                type="number" 
                                placeholder="e.g. 20"
                                value={newLog.carbs}
                                onChange={(e) => setNewLog({...newLog, carbs: e.target.value === '' ? '' : parseInt(e.target.value)})}
                              />
                            </div>
                            <div className="form-group">
                              <label>Fat (g)</label>
                              <input 
                                type="number" 
                                placeholder="e.g. 3"
                                value={newLog.fat}
                                onChange={(e) => setNewLog({...newLog, fat: e.target.value === '' ? '' : parseInt(e.target.value)})}
                              />
                            </div>
                          </div>

                          <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
                            <Plus size={16} />
                            <span>Add Food to Daily Log</span>
                          </button>
                        </form>
                      </div>



                    </div>

                  </div>
                )}

                {/* 2. ANALYTICS VIEW (Contains 30-Day ML Weight Predictions) */}
                {activeTab === 'analytics' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    
                    {/* Calorie trend chart */}
                    <div className="glass-card animated-fade-in" style={{ minHeight: '420px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                        <h2 className="widget-title" style={{ margin: 0 }}>
                          <BarChart2 size={20} style={{ color: 'var(--accent)' }} />
                          <span>Caloric Intake Trends</span>
                        </h2>
                        
                        <div className="trend-range-selector" style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-light)', padding: '4px', borderRadius: '8px' }}>
                          <button 
                            type="button"
                            className={`range-btn ${trendRange === 'day' ? 'active' : ''}`}
                            onClick={() => setTrendRange('day')}
                            style={{ 
                              background: trendRange === 'day' ? 'var(--primary)' : 'transparent',
                              color: trendRange === 'day' ? '#fff' : 'var(--text-secondary)',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Day
                          </button>
                          <button 
                            type="button"
                            className={`range-btn ${trendRange === 'week' ? 'active' : ''}`}
                            onClick={() => setTrendRange('week')}
                            style={{ 
                              background: trendRange === 'week' ? 'var(--primary)' : 'transparent',
                              color: trendRange === 'week' ? '#fff' : 'var(--text-secondary)',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Week
                          </button>
                          <button 
                            type="button"
                            className={`range-btn ${trendRange === 'month' ? 'active' : ''}`}
                            onClick={() => setTrendRange('month')}
                            style={{ 
                              background: trendRange === 'month' ? 'var(--primary)' : 'transparent',
                              color: trendRange === 'month' ? '#fff' : 'var(--text-secondary)',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Month
                          </button>
                          <button 
                            type="button"
                            className={`range-btn ${trendRange === 'custom' ? 'active' : ''}`}
                            onClick={() => setTrendRange('custom')}
                            style={{ 
                              background: trendRange === 'custom' ? 'var(--primary)' : 'transparent',
                              color: trendRange === 'custom' ? '#fff' : 'var(--text-secondary)',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Custom
                          </button>
                        </div>
                      </div>

                      {trendRange === 'custom' && (
                        <div className="custom-date-inputs animated-fade-in" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>From:</span>
                            <input 
                              type="date" 
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              style={{ padding: '6px 10px', fontSize: '13px', width: '140px' }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>To:</span>
                            <input 
                              type="date" 
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              style={{ padding: '6px 10px', fontSize: '13px', width: '140px' }}
                            />
                          </div>
                        </div>
                      )}


                      {dailySummary.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'var(--text-muted)' }}>
                          <Calendar size={48} style={{ marginBottom: '16px' }} />
                          <p>No logged data available to display trends. Go log a meal in the dashboard!</p>
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '300px' }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart
                              data={dailySummary}
                              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis 
                                dataKey="date" 
                                stroke="var(--text-muted)" 
                                tickFormatter={(str) => {
                                  const d = new Date(str);
                                  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                }}
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis stroke="var(--text-muted)" style={{ fontSize: '12px' }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'var(--bg-card)', 
                                  borderColor: 'var(--border-light)',
                                  color: 'white',
                                  borderRadius: '8px'
                                }}
                              />
                              <Area 
                                name="Calories Logged"
                                type="monotone" 
                                dataKey="total_calories" 
                                stroke="var(--primary)" 
                                fillOpacity={1} 
                                fill="url(#colorCalories)" 
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>



                  </div>
                )}

                {/* 3. AI COACH CHAT VIEW */}
                {activeTab === 'coach' && (
                  <div className="glass-card chat-container animated-fade-in">
                    <h2 className="widget-title">
                      <Brain size={20} style={{ color: 'var(--primary)' }} />
                      <span>Context-Aware AI Diet Coach</span>
                    </h2>
                    
                    <div className="chat-history">
                      {chatMessages.map((msg, i) => (
                        msg.isWelcome ? (
                          <div key={i} className="chat-welcome-message">
                            {msg.text.split('\n').map((para, idx) => (
                              <p key={idx} style={{ marginBottom: '8px' }}>
                                {parseMarkdownText(para)}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <div key={i} className={`chat-message ${msg.sender}`}>
                            {msg.text.split('\n').map((para, idx) => (
                              <p key={idx} style={{ marginBottom: para.startsWith('*') ? '4px' : '10px' }}>
                                {parseMarkdownText(para)}
                              </p>
                            ))}
                          </div>
                        )
                      ))}
                      {chatLoading && (
                        <div className="chat-message ai" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Coach is formulating a nutritional plan...</span>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} className="chat-input-box">
                      <input 
                        type="text" 
                        placeholder="Ask your coach (e.g. 'Can you suggest a diet plan for weight loss?' or 'Is white rice healthy?')"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={chatLoading}
                        required
                      />
                      <button type="submit" className="btn btn-primary" disabled={chatLoading}>
                        <Send size={16} />
                        <span>Send</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* 4. GOAL SETTINGS VIEW */}
                {activeTab === 'settings' && (
                  <div className="glass-card animated-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
                    <h2 className="widget-title">
                      <Settings size={20} style={{ color: 'var(--primary)' }} />
                      <span>Edit Profile & Goal Settings</span>
                    </h2>
                    
                    <form onSubmit={handleUpdateUser}>
                      <div className="form-group">
                        <label>Profile Name / Username</label>
                        <input 
                          type="text" 
                          value={activeUser.username}
                          onChange={(e) => setActiveUser({...activeUser, username: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Age (years)</label>
                          <input 
                            type="number" 
                            value={activeUser.age}
                            onChange={(e) => setActiveUser({...activeUser, age: parseInt(e.target.value)})}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Gender</label>
                          <select 
                            value={activeUser.gender}
                            onChange={(e) => setActiveUser({...activeUser, gender: e.target.value})}
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other / Average</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Weight (kg)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={activeUser.weight_kg}
                            onChange={(e) => setActiveUser({...activeUser, weight_kg: parseFloat(e.target.value)})}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Height (cm)</label>
                          <input 
                            type="number" 
                            value={activeUser.height_cm}
                            onChange={(e) => setActiveUser({...activeUser, height_cm: parseInt(e.target.value)})}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Activity Level</label>
                          <select 
                            value={activeUser.activity_level}
                            onChange={(e) => setActiveUser({...activeUser, activity_level: e.target.value})}
                          >
                            <option value="sedentary">Sedentary (desk job, no exercise)</option>
                            <option value="lightly_active">Lightly Active (exercise 1-3 days/wk)</option>
                            <option value="moderately_active">Moderately Active (exercise 3-5 days/wk)</option>
                            <option value="active">Active (intense sports 6-7 days/wk)</option>
                            <option value="very_active">Very Active (physical job or double training)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Nutrition Goal</label>
                          <select 
                            value={activeUser.goal}
                            onChange={(e) => setActiveUser({...activeUser, goal: e.target.value})}
                          >
                            <option value="lose_weight">Lose Weight (Caloric Deficit -500 kcal)</option>
                            <option value="maintain">Maintain Weight (TDEE balance)</option>
                            <option value="gain_weight">Gain Weight (Caloric Surplus +400 kcal)</option>
                          </select>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--primary))', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Scale size={16} />
                          <span>Calculated Energy Targets</span>
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '8px', fontSize: '13px' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Calories</span>
                            <p style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{activeUser.target_calories} kcal</p>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Protein</span>
                            <p style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{activeUser.target_protein}g</p>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Carbs</span>
                            <p style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{activeUser.target_carbs}g</p>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Fat</span>
                            <p style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{activeUser.target_fat}g</p>
                          </div>
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }}>
                        Save Changes & Recalculate
                      </button>
                    </form>

                    {/* Danger Zone Dropdown Accordion */}
                    <div style={{ marginTop: '28px', borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: '20px' }}>
                      <div 
                        onClick={() => setShowDangerZone(!showDangerZone)} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          cursor: 'pointer', 
                          padding: '12px 16px', 
                          background: 'rgba(239, 68, 68, 0.04)', 
                          borderRadius: '10px', 
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        className="danger-zone-header"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                          <Trash2 size={16} />
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>Danger Zone</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {showDangerZone ? 'Hide Actions ▲' : 'Show Actions ▼'}
                        </span>
                      </div>

                      {showDangerZone && (
                        <div className="animated-fade-in" style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.015)', border: '1px solid rgba(239, 68, 68, 0.12)', borderTop: 'none', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', marginTop: '-2px' }}>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                            Permanently delete your profile, calculations, and all logged meals. This action is irreversible.
                          </p>
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ 
                              width: 'auto', 
                              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                              color: '#ef4444', 
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              padding: '8px 16px',
                              fontSize: '13px',
                              fontWeight: 600,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#ef4444';
                              e.target.style.color = 'white';
                              e.target.style.borderColor = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                              e.target.style.color = '#ef4444';
                              e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                            }}
                            onClick={handleDeleteAccount}
                          >
                            Delete Account
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
      </main>
    </div>
  );
}

export default App;
