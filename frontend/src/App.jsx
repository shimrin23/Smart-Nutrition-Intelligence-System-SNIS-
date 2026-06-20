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
  TrendingDown,
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
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const API_BASE = "http://localhost:8000";

function App() {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'analytics', 'coach', 'settings'
  
  // App states
  const [foodLogs, setFoodLogs] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  
  // ML States
  const [mlRecommendations, setMlRecommendations] = useState([]);
  const [mlWeightPredictions, setMlWeightPredictions] = useState([]);
  const [mlLoading, setMlLoading] = useState(false);

  // Onboarding form state
  const [newUser, setNewUser] = useState({
    username: '',
    age: 28,
    gender: 'male',
    weight_kg: 70,
    height_cm: 175,
    activity_level: 'moderately_active',
    goal: 'maintain'
  });

  // Food log form state
  const [newLog, setNewLog] = useState({
    food_name: '',
    quantity: 100,
    unit: 'grams',
    calories: 150,
    protein: 10,
    carbs: 20,
    fat: 3,
    fiber: 2,
    iron: 0.5,
    calcium: 15,
    sodium: 120
  });

  // AI parsing loading/input states
  const [aiTextInput, setAiTextInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  
  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Coach Chat state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: "Hello! I am your AI Nutrition Coach. Register or select a user profile to get customized dietary advice!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Fetch all users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Toggle dark/light theme on body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [darkMode]);

  // Fetch logs and summary when active user changes
  useEffect(() => {
    setAiAnalysis(null);
    if (activeUser) {
      fetchLogs(activeUser.id);
      fetchSummary(activeUser.id);
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
      setMlWeightPredictions([]);
    }
  }, [activeUser]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0 && !activeUser) {
          setActiveUser(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchLogs = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/food-logs/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setFoodLogs(data);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const fetchSummary = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/food-logs/user/${userId}/summary`);
      if (res.ok) {
        const data = await res.json();
        setDailySummary(data);
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
    }
  };

  const fetchMlData = async (userId) => {
    setMlLoading(true);
    try {
      // 1. Fetch recommendations
      const recRes = await fetch(`${API_BASE}/ml/recommend-foods/${userId}`);
      if (recRes.ok) {
        const recData = await recRes.json();
        setMlRecommendations(recData);
      }
      
      // 2. Fetch weight predictions
      const predRes = await fetch(`${API_BASE}/ml/predict-weight/${userId}`);
      if (predRes.ok) {
        const predData = await predRes.json();
        setMlWeightPredictions(predData);
      }
    } catch (err) {
      console.error("Error fetching ML analytics:", err);
    } finally {
      setMlLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.username) return;
    try {
      const res = await fetch(`${API_BASE}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        const data = await res.json();
        setUsers([...users, data]);
        setActiveUser(data);
        setShowCreateUserForm(false);
        setNewUser({
          username: '',
          age: 28,
          gender: 'male',
          weight_kg: 70,
          height_cm: 175,
          activity_level: 'moderately_active',
          goal: 'maintain'
        });
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.detail}`);
      }
    } catch (err) {
      console.error("Error creating user:", err);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/users/${activeUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeUser)
      });
      if (res.ok) {
        const data = await res.json();
        setActiveUser(data);
        fetchUsers();
        fetchMlData(data.id);
        alert("Profile updated and target nutrition recalculated!");
      }
    } catch (err) {
      console.error("Error updating user:", err);
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!activeUser) {
      alert("Please select or create a user profile first!");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/food-logs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLog,
          user_id: activeUser.id
        })
      });
      if (res.ok) {
        fetchLogs(activeUser.id);
        fetchSummary(activeUser.id);
        fetchMlData(activeUser.id); // recalculate recommendations
        
        // Reset form
        setNewLog({
          food_name: '',
          quantity: 100,
          unit: 'grams',
          calories: 150,
          protein: 10,
          carbs: 20,
          fat: 3,
          fiber: 2,
          iron: 0.5,
          calcium: 15,
          sodium: 120
        });
        setAiAnalysis(null);
      }
    } catch (err) {
      console.error("Error logging food:", err);
    }
  };

  const handleDeleteLog = async (logId) => {
    try {
      const res = await fetch(`${API_BASE}/food-logs/${logId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchLogs(activeUser.id);
        fetchSummary(activeUser.id);
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
        setNewLog({
          food_name: data.food_name || aiTextInput,
          quantity: data.quantity || 100,
          unit: data.unit || 'grams',
          calories: Math.round(data.calories || 0),
          protein: Math.round(data.protein || 0),
          carbs: Math.round(data.carbs || 0),
          fat: Math.round(data.fat || 0),
          fiber: Math.round(data.fiber || 0),
          iron: data.iron || 0,
          calcium: data.calcium || 0,
          sodium: data.sodium || 0
        });
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
        setNewLog({
          food_name: data.food_name || "Meal Image",
          quantity: data.quantity || 100,
          unit: data.unit || 'grams',
          calories: Math.round(data.calories || 0),
          protein: Math.round(data.protein || 0),
          carbs: Math.round(data.carbs || 0),
          fat: Math.round(data.fat || 0),
          fiber: Math.round(data.fiber || 0),
          iron: data.iron || 0,
          calcium: data.calcium || 0,
          sodium: data.sodium || 0
        });
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
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  const calPercent = Math.min(Math.round(calorieProgress), 100);

  // SVG circular properties
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const parseMarkdownText = (text) => {
    if (!text) return '';
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} style={{ fontWeight: 600, color: 'hsl(var(--primary))' }}>{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="app-container">
      <header>
        <div className="header-content">
          <a href="#" className="logo" onClick={() => setActiveTab('dashboard')}>
            <Activity size={26} />
            <span>SNIS AI</span>
          </a>
          
          <div className="user-selector">
            {activeUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} style={{ color: 'hsl(var(--primary))' }} />
                
                <select 
                  value={activeUser.id} 
                  onChange={(e) => {
                    const u = users.find(x => x.id === parseInt(e.target.value));
                    if (u) setActiveUser(u);
                  }}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: 'hsl(var(--text-muted))' }}>No profile selected</span>
            )}
            
            <button 
              className="btn btn-secondary" 
              style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setShowCreateUserForm(!showCreateUserForm)}
            >
              <UserPlus size={14} />
              <span>New Profile</span>
            </button>

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
        {showCreateUserForm || users.length === 0 ? (
          <div className="glass-card animated-fade-in" style={{ maxWidth: '600px', margin: '0 auto 32px auto' }}>
            <h2 className="widget-title">
              <UserPlus size={20} style={{ color: 'hsl(var(--primary))' }} />
              {users.length === 0 ? "Create your Nutrition Profile" : "Create New User Profile"}
            </h2>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
              Enter your metrics below. We will use the <strong>Mifflin-St Jeor</strong> formula to calculate your Basal Metabolic Rate (BMR) and determine your daily caloric targets dynamically.
            </p>
            
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Profile Name / Username</label>
                <input 
                  type="text" 
                  placeholder="e.g. JohnDoe"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Age (years)</label>
                  <input 
                    type="number" 
                    value={newUser.age}
                    onChange={(e) => setNewUser({...newUser, age: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select 
                    value={newUser.gender}
                    onChange={(e) => setNewUser({...newUser, gender: e.target.value})}
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
                    value={newUser.weight_kg}
                    onChange={(e) => setNewUser({...newUser, weight_kg: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input 
                    type="number" 
                    value={newUser.height_cm}
                    onChange={(e) => setNewUser({...newUser, height_cm: parseInt(e.target.value)})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Activity Level</label>
                  <select 
                    value={newUser.activity_level}
                    onChange={(e) => setNewUser({...newUser, activity_level: e.target.value})}
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
                    value={newUser.goal}
                    onChange={(e) => setNewUser({...newUser, goal: e.target.value})}
                  >
                    <option value="lose_weight">Lose Weight (Caloric Deficit -500 kcal)</option>
                    <option value="maintain">Maintain Weight (TDEE balance)</option>
                    <option value="gain_weight">Gain Weight (Caloric Surplus +400 kcal)</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary">Create Profile</button>
                {users.length > 0 && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowCreateUserForm(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <>
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
                <span>Goal Settings</span>
              </button>
            </div>

            {activeUser && (
              <div className="animated-fade-in">
                {/* 1. DASHBOARD VIEW */}
                {activeTab === 'dashboard' && (
                  <div className="dashboard-grid">
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                      {/* Calorie & Macro Target Progress Card */}
                      <div className="glass-card">
                        <h2 className="widget-title">
                          <Flame size={20} style={{ color: 'hsl(var(--danger))' }} />
                          <span>Today's Energy Balance</span>
                        </h2>
                        
                        <div className="ring-summary-container">
                          <div className="calorie-ring-box">
                            <svg width="160" height="160">
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
                                style={{ stroke: 'hsl(var(--primary))', strokeDashoffset, transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' }}
                                r={normalizedRadius}
                                cx="80"
                                cy="80"
                              />
                            </svg>
                            <div className="calorie-label-center">
                              <span className="calorie-val">{Math.round(todaySummary.total_calories)}</span>
                              <span className="calorie-sub">of {activeUser.target_calories} kcal</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'hsl(var(--primary))' }}></div>
                              <span style={{ fontSize: '14px' }}>Logged: <strong>{Math.round(todaySummary.total_calories)} kcal</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}></div>
                              <span style={{ fontSize: '14px', color: 'hsl(var(--text-secondary))' }}>
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
                          <h2 className="widget-title" style={{ color: 'hsl(var(--accent))' }}>
                            <Sparkles size={20} />
                            <span>AI Food Analysis & Explanation</span>
                          </h2>
                          
                          <div style={{ marginBottom: '16px' }}>
                            <span style={{ fontSize: '11px', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Estimated Food</span>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginTop: '2px' }}>{aiAnalysis.food_name}</h3>
                          </div>
                          
                          {aiAnalysis.explanation && (
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-light)', marginBottom: '16px' }}>
                              <span style={{ fontSize: '11px', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Nutritional Explanation</span>
                              <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'hsl(var(--text-secondary))', margin: 0 }}>
                                {aiAnalysis.explanation}
                              </p>
                            </div>
                          )}

                          <div className="macro-bars-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-light)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '2px' }}>Calories</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{Math.round(aiAnalysis.calories)} kcal</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-light)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '2px' }}>Protein</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(var(--primary))' }}>{Math.round(aiAnalysis.protein)}g</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-light)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '2px' }}>Carbs</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(var(--accent))' }}>{Math.round(aiAnalysis.carbs)}g</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-light)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '2px' }}>Fat</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(var(--warning))' }}>{Math.round(aiAnalysis.fat)}g</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              type="button"
                              className="btn btn-primary" 
                              style={{ flex: 2, padding: '10px 16px' }}
                              onClick={() => {
                                setNewLog({
                                  food_name: aiAnalysis.food_name || '',
                                  quantity: aiAnalysis.quantity || 100,
                                  unit: aiAnalysis.unit || 'grams',
                                  calories: Math.round(aiAnalysis.calories || 0),
                                  protein: Math.round(aiAnalysis.protein || 0),
                                  carbs: Math.round(aiAnalysis.carbs || 0),
                                  fat: Math.round(aiAnalysis.fat || 0),
                                  fiber: Math.round(aiAnalysis.fiber || 0),
                                  iron: aiAnalysis.iron || 0,
                                  calcium: aiAnalysis.calcium || 0,
                                  sodium: aiAnalysis.sodium || 0
                                });
                                // Visual anchor feedback
                                const element = document.getElementById("manual-food-logger-card");
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth' });
                                  element.style.borderColor = 'hsl(var(--primary))';
                                  setTimeout(() => {
                                    element.style.borderColor = 'var(--border-light)';
                                  }, 2000);
                                }
                              }}
                            >
                              <ListPlus size={16} />
                              <span>Add to Manual Logger</span>
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
                          <Apple size={20} style={{ color: 'hsl(var(--accent))' }} />
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
                          <Sparkles size={20} style={{ color: 'hsl(var(--accent))' }} />
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
                          <button type="submit" className="btn btn-primary" disabled={aiLoading}>
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
                            <label className="btn btn-primary" style={{ flex: 1, margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                          <Plus size={20} style={{ color: 'hsl(var(--primary))' }} />
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
                                value={newLog.quantity}
                                onChange={(e) => setNewLog({...newLog, quantity: parseFloat(e.target.value)})}
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
                                value={newLog.calories}
                                onChange={(e) => setNewLog({...newLog, calories: parseInt(e.target.value)})}
                              />
                            </div>
                            <div className="form-group">
                              <label>Protein (g)</label>
                              <input 
                                type="number" 
                                value={newLog.protein}
                                onChange={(e) => setNewLog({...newLog, protein: parseInt(e.target.value)})}
                              />
                            </div>
                            <div className="form-group">
                              <label>Carbs (g)</label>
                              <input 
                                type="number" 
                                value={newLog.carbs}
                                onChange={(e) => setNewLog({...newLog, carbs: parseInt(e.target.value)})}
                              />
                            </div>
                            <div className="form-group">
                              <label>Fat (g)</label>
                              <input 
                                type="number" 
                                value={newLog.fat}
                                onChange={(e) => setNewLog({...newLog, fat: parseInt(e.target.value)})}
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
                      <h2 className="widget-title">
                        <BarChart2 size={20} style={{ color: 'hsl(var(--accent))' }} />
                        <span>Caloric Intake Trends (Weekly)</span>
                      </h2>


                      {dailySummary.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'hsl(var(--text-muted))' }}>
                          <Calendar size={48} style={{ marginBottom: '16px' }} />
                          <p>No logged data available to display trends. Go log a meal in the dashboard!</p>
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '300px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={dailySummary}
                              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis 
                                dataKey="date" 
                                stroke="hsl(var(--text-muted))" 
                                tickFormatter={(str) => {
                                  const d = new Date(str);
                                  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                }}
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis stroke="hsl(var(--text-muted))" style={{ fontSize: '12px' }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--bg-card))', 
                                  borderColor: 'var(--border-light)',
                                  color: 'white',
                                  borderRadius: '8px'
                                }}
                              />
                              <Area 
                                name="Calories Logged"
                                type="monotone" 
                                dataKey="total_calories" 
                                stroke="hsl(var(--primary))" 
                                fillOpacity={1} 
                                fill="url(#colorCalories)" 
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* 30-Day weight prediction chart */}
                    {mlWeightPredictions.length > 0 && (
                      <div className="glass-card animated-fade-in" style={{ minHeight: '420px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                        <h2 className="widget-title">
                          <TrendingDown size={20} style={{ color: 'hsl(var(--accent))' }} />
                          <span>30-Day ML Weight Trajectory Forecast</span>
                        </h2>


                        <div style={{ width: '100%', height: '300px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={mlWeightPredictions}
                              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis 
                                dataKey="day" 
                                stroke="hsl(var(--text-muted))" 
                                tickFormatter={(day) => `Day ${day}`}
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis 
                                stroke="hsl(var(--text-muted))" 
                                domain={['dataMin - 1', 'dataMax + 1']}
                                tickFormatter={(w) => `${w} kg`}
                                style={{ fontSize: '12px' }} 
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--bg-card))', 
                                  borderColor: 'var(--border-light)',
                                  color: 'white',
                                  borderRadius: '8px'
                                }}
                                formatter={(value) => [`${value} kg`, 'Predicted Weight']}
                              />
                              <Line 
                                name="Weight Trajectory"
                                type="monotone" 
                                dataKey="weight" 
                                stroke="hsl(var(--accent))" 
                                strokeWidth={3}
                                dot={{ fill: 'hsl(var(--accent))', strokeWidth: 1, r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* 3. AI COACH CHAT VIEW */}
                {activeTab === 'coach' && (
                  <div className="glass-card chat-container animated-fade-in">
                    <h2 className="widget-title">
                      <Brain size={20} style={{ color: 'hsl(var(--primary))' }} />
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
                      <Settings size={20} style={{ color: 'hsl(var(--primary))' }} />
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
                            <span style={{ color: 'hsl(var(--text-muted))' }}>Calories</span>
                            <p style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{activeUser.target_calories} kcal</p>
                          </div>
                          <div>
                            <span style={{ color: 'hsl(var(--text-muted))' }}>Protein</span>
                            <p style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{activeUser.target_protein}g</p>
                          </div>
                          <div>
                            <span style={{ color: 'hsl(var(--text-muted))' }}>Carbs</span>
                            <p style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{activeUser.target_carbs}g</p>
                          </div>
                          <div>
                            <span style={{ color: 'hsl(var(--text-muted))' }}>Fat</span>
                            <p style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{activeUser.target_fat}g</p>
                          </div>
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }}>
                        Save Changes & Recalculate
                      </button>
                    </form>
                  </div>
                )}

              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
