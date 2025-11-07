import React, { useState, useEffect, useCallback, useMemo } from 'react';

// 现代化仪表盘设计的AnyRun应用
const App = () => {
  // 状态管理
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, running, stopped
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedApps, setSelectedApps] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [systemStats, setSystemStats] = useState({ cpu: 0, memory: 0, uptime: 0 });
  const [notification, setNotification] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    command: '',
    type: 'server',
    autostart: false,
    version: '1.0.0',
    monitor: false
  });
  const [theme, setTheme] = useState('dark'); // light, dark, auto
  
  // 认证相关状态
  // 登录状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '', remember: true });
  const [passwordForm, setPasswordForm] = useState({ username: 'admin', oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // 防抖函数
  const debounce = useCallback((func, delay) => {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }, []);
  
  // 性能优化：使用useCallback缓存搜索函数
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
    }, 300),
    [debounce]
  );

  // 类型映射到图标和颜色
  const appTypeConfig = {
    server: { icon: '🖥️', color: '#4F46E5', bgColor: 'rgba(79, 70, 229, 0.1)' },
    frontend: { icon: '🌐', color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.1)' },
    database: { icon: '🗄️', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
    cache: { icon: '⚡', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' },
    terminal: { icon: '💻', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.1)' },
    script: { icon: '📜', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' },
    app: { icon: '📱', color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.1)' }
  };

  // 从本地存储加载数据
  const loadFromLocalStorage = () => {
    try {
      const savedApps = localStorage.getItem('anyrun_apps');
      if (savedApps) {
        const parsedApps = JSON.parse(savedApps);
        // 恢复日期对象
        return parsedApps.map(app => ({
          ...app,
          lastStart: new Date(app.lastStart)
        }));
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return null;
  };

  // 保存数据到本地存储
  const saveToLocalStorage = (apps) => {
    try {
      localStorage.setItem('anyrun_apps', JSON.stringify(apps));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 检查本地存储中的token
        const storedToken = localStorage.getItem('anyrun_token');
        const tokenExpiry = localStorage.getItem('anyrun_token_expiry');
        
        if (storedToken && tokenExpiry) {
          // 检查token是否过期（一天有效期）
          const expiryTime = new Date(tokenExpiry);
          if (expiryTime > new Date()) {
            setIsAuthenticated(true);
            // 恢复用户名
            const storedUsername = localStorage.getItem('anyrun_username');
            if (storedUsername) {
              setLoginForm(prev => ({ ...prev, username: storedUsername, remember: true }));
            }
            // 加载应用数据
            loadApps();
            return;
          } else {
            // Token过期，清除本地存储
            localStorage.removeItem('anyrun_token');
            localStorage.removeItem('anyrun_token_expiry');
            localStorage.removeItem('anyrun_username');
          }
        }
        
        // 初始状态显示登录界面
        setShowLogin(true);
      } catch (error) {
        console.error('Failed to check auth status:', error);
        setShowLogin(true);
      }
    };

    checkAuth();
  }, []);

  // 登录处理
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    
    try {
      // 发送登录请求到后端
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      if (!response.ok) {
        // 如果后端不可用，使用模拟登录
        // 实际环境中应移除这段模拟逻辑
        console.log('后端API不可用，使用模拟登录');
        throw new Error('模拟环境，请设置密码');
      }
      
      const data = await response.json();
      
      if (loginForm.remember) {
        // 设置token有效期为一天
        const expiryTime = new Date();
        expiryTime.setDate(expiryTime.getDate() + 1);
        
        localStorage.setItem('anyrun_token', data.token);
        localStorage.setItem('anyrun_token_expiry', expiryTime.toISOString());
        localStorage.setItem('anyrun_username', loginForm.username);
      }
      
      setIsAuthenticated(true);
      setShowLogin(false);
      
      if (data.firstLogin) {
        setShowChangePassword(true);
        setPasswordForm(prev => ({ ...prev, username: loginForm.username }));
      } else {
        loadApps();
      }
    } catch (error) {
      // 模拟环境下，首次登录直接进入密码设置
      if (!passwordForm.oldPassword) {
        setShowLogin(false);
        setShowChangePassword(true);
      } else {
        setLoginError(error.message || '登录失败，请重试');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // 修改密码处理
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setLoginError('新密码和确认密码不匹配');
      return;
    }
    
    try {
      // 发送修改密码请求
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: passwordForm.username,
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
      });
      
      // 如果后端不可用，使用模拟成功
      console.log('模拟密码修改成功');
      
      setShowChangePassword(false);
      setIsAuthenticated(true);
      showNotification('密码设置成功，欢迎使用');
      loadApps();
    } catch (error) {
      setLoginError('密码修改失败，请重试');
    }
  };

  // 登出处理
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('anyrun_token');
    localStorage.removeItem('anyrun_token_expiry');
    localStorage.removeItem('anyrun_username');
    setShowLogin(true);
    setSelectedApp(null);
    setSelectedApps([]);
  };

  // 加载应用数据 - 性能优化：使用useCallback避免重复创建函数
  const loadApps = useCallback(async () => {
    try {
      setLoading(true);
      // 减少初始加载延迟
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 设置认证头
      const headers = {};
      const token = localStorage.getItem('anyrun_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // 尝试从API加载
      try {
        const response = await fetch('/api/config', { headers });
        if (response.ok) {
          const configData = await response.json();
          // 转换API数据格式为前端所需格式
          const appsData = configData.apps.map((app, index) => ({
            id: String(index + 1),
            name: app.name,
            description: app.name,
            command: `${app.execute} ${app.args}`,
            type: mapAppType(app.appType),
            status: 'stopped', // 默认为停止状态
            uptime: '00:00:00',
            cpuUsage: 0,
            memoryUsage: 0,
            lastStart: new Date(),
            version: '1.0.0',
            autostart: app.autostart,
            logs: []
          }));
          setApps(appsData);
          saveToLocalStorage(appsData);
          return;
        }
      } catch (error) {
        console.log('API加载失败，使用本地数据:', error);
      }
      
      // 先尝试从本地存储加载
      let appsData = loadFromLocalStorage();
      
      // 如果本地存储没有数据，使用默认数据
      if (!appsData || appsData.length === 0) {
        appsData = [
          {
            id: '1',
            name: 'API Gateway',
            description: '主API入口网关服务',
            command: 'node gateway.js',
            type: 'server',
            status: 'running',
            uptime: '03:24:15',
            cpuUsage: 12.5,
            memoryUsage: 245,
            lastStart: new Date(),
            version: '2.3.4',
            autostart: true,
            logs: [
              { time: '14:32', message: 'Server started on port 3000' },
              { time: '14:35', message: 'Connected to database' },
              { time: '14:40', message: 'Received 127 requests' }
            ]
          },
          {
            id: '2',
            name: 'Web Dashboard',
            description: '管理控制台前端应用',
            command: 'npm run serve',
            type: 'frontend',
            status: 'running',
            uptime: '01:12:30',
            cpuUsage: 8.3,
            memoryUsage: 180,
            lastStart: new Date(Date.now() - 43500000),
            version: '1.0.0-beta.2',
            autostart: false,
            logs: [
              { time: '13:20', message: 'Web server started' },
              { time: '13:22', message: 'Assets compiled successfully' }
            ]
          },
          {
            id: '3',
            name: 'PostgreSQL',
            description: '主数据库服务',
            command: 'postgres -D /data/db',
            type: 'database',
            status: 'stopped',
            uptime: '00:00:00',
            cpuUsage: 0,
            memoryUsage: 0,
            lastStart: new Date(Date.now() - 86400000),
            version: '15.2',
            autostart: true,
            logs: [
              { time: '昨天', message: 'Database shutdown completed' }
            ]
          },
          {
            id: '4',
            name: 'Redis Cache',
            description: '分布式缓存服务',
            command: 'redis-server --port 6379',
            type: 'cache',
            status: 'stopped',
            uptime: '00:00:00',
            cpuUsage: 0,
            memoryUsage: 0,
            lastStart: new Date(Date.now() - 172800000),
            version: '7.0.11',
            autostart: false,
            logs: []
          },
          {
            id: '5',
            name: 'Task Scheduler',
            description: '定时任务管理服务',
            command: 'python scheduler.py',
            type: 'script',
            status: 'running',
            uptime: '05:45:20',
            cpuUsage: 4.7,
            memoryUsage: 98,
            lastStart: new Date(Date.now() - 207200000),
            version: '3.1.0',
            autostart: true,
            logs: [
              { time: '10:00', message: 'Scheduler started' },
              { time: '12:00', message: 'Daily backup completed' }
            ]
          }
        ];
      }
      
      setApps(appsData);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 映射应用类型
  const mapAppType = useCallback((type) => {
    switch (type?.toLowerCase()) {
      case 'java':
      case 'node':
        return 'server';
      case 'python':
        return 'script';
      case 'database':
        return 'database';
      default:
        return 'app';
    }
  }, []);
    
    // 模拟系统统计数据更新
    const statsInterval = setInterval(() => {
      // 自定义clamp函数
      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
      
      setSystemStats(prev => ({
        cpu: Math.min(Math.max(prev.cpu + (Math.random() - 0.5) * 2, 0), 100),
        memory: Math.min(Math.max(prev.memory + (Math.random() - 0.5) * 10, 0), 100),
        uptime: prev.uptime + 1
      }));
    }, 5000);

    return () => clearInterval(statsInterval);
  }, []);

  // 使用之前定义的clamp函数

  // 性能优化：将常用格式化函数使用useCallback缓存
  const formatTime = useCallback((seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  // 格式化日期
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  }, []);

  // 格式化内存
  const formatMemory = useCallback((mb) => {
    if (mb === 0) return '0 MB';
    if (mb < 1024) return `${mb.toFixed(0)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  }, []);

  // 性能优化：使用useMemo缓存过滤结果，避免重复计算
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchesSearch = 
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTab = 
        activeTab === 'all' ||
        activeTab === 'running' && app.status === 'running' ||
        activeTab === 'stopped' && app.status === 'stopped';
      
      return matchesSearch && matchesTab;
    });
  }, [apps, searchTerm, activeTab]);
  
  // 性能优化：使用useMemo缓存统计数据
  const stats = useMemo(() => {
    return {
      total: apps.length,
      running: apps.filter(a => a.status === 'running').length,
      stopped: apps.filter(a => a.status === 'stopped').length,
      cpu: systemStats.cpu,
      memory: systemStats.memory,
      uptime: formatTime(systemStats.uptime)
    };
  }, [apps, systemStats, formatTime]);

  // 排序应用
  const sortedApps = [...filteredApps].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'cpu':
        aValue = a.cpuUsage;
        bValue = b.cpuUsage;
        break;
      case 'memory':
        aValue = a.memoryUsage;
        bValue = b.memoryUsage;
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // 处理排序
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // 计算统计数据
  const stats = {
    total: apps.length,
    running: apps.filter(a => a.status === 'running').length,
    stopped: apps.filter(a => a.status === 'stopped').length,
    cpu: systemStats.cpu,
    memory: systemStats.memory,
    uptime: formatTime(systemStats.uptime)
  };

  // 性能优化：使用useCallback缓存应用操作函数，减少不必要的渲染
  const handleStart = useCallback((id) => {
    const updatedApps = apps.map(app => 
      app.id === id 
        ? { 
            ...app, 
            status: 'running',
            uptime: '00:00:00',
            cpuUsage: Math.random() * 15 + 5,
            memoryUsage: Math.random() * 200 + 100,
            lastStart: new Date(),
            logs: [{ time: '刚刚', message: '服务已启动' }, ...app.logs]
          }
        : app
    );
    setApps(updatedApps);
    saveToLocalStorage(updatedApps);
    
    // 发送API请求
    if (localStorage.getItem('anyrun_token')) {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('anyrun_token')}` };
      fetch(`/api/start?name=${encodeURIComponent(apps.find(a => a.id === id)?.name || '')}`, { headers })
        .catch(err => console.error('Start API error:', err));
    }
  }, [apps]);

  // 处理应用停止
  const handleStop = useCallback((id) => {
    const updatedApps = apps.map(app => 
      app.id === id 
        ? { 
            ...app, 
            status: 'stopped',
            cpuUsage: 0,
            memoryUsage: 0,
            logs: [{ time: '刚刚', message: '服务已停止' }, ...app.logs]
          }
        : app
    );
    setApps(updatedApps);
    saveToLocalStorage(updatedApps);
    
    if (selectedApp?.id === id) {
      setSelectedApp(null);
    }
    
    // 发送API请求
    if (localStorage.getItem('anyrun_token')) {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('anyrun_token')}` };
      fetch(`/api/stop?name=${encodeURIComponent(apps.find(a => a.id === id)?.name || '')}`, { headers })
        .catch(err => console.error('Stop API error:', err));
    }
  }, [apps, selectedApp]);

  // 处理应用删除
  const handleDelete = (id) => {
    setApps(prev => {
      const updatedApps = prev.filter(app => app.id !== id);
      saveToLocalStorage(updatedApps);
      return updatedApps;
    });
    setShowDeleteConfirm(null);
    if (selectedApp?.id === id) {
      setSelectedApp(null);
    }
  };

  // 处理应用选择
  const handleAppSelect = (app) => {
    setSelectedApp(app);
    setSelectedApps([]); // 清除批量选择
    console.log('App selected:', app.name);
  };

  // 处理批量选择
  const handleToggleSelect = (id, event) => {
    event.stopPropagation(); // 防止触发应用选择
    setSelectedApps(prev => {
      if (prev.includes(id)) {
        return prev.filter(appId => appId !== id);
      } else {
        return [...prev, id];
      }
    });
    setSelectedApp(null); // 清除单个选中
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedApps.length === filteredApps.length && filteredApps.length > 0) {
      setSelectedApps([]);
    } else {
      setSelectedApps(filteredApps.map(app => app.id));
    }
    setSelectedApp(null);
  };

  // 批量启动应用
  const handleBatchStart = () => {
    setApps(prev => {
      const updatedApps = prev.map(app => 
        selectedApps.includes(app.id) && app.status === 'stopped'
          ? { 
              ...app, 
              status: 'running',
              uptime: '00:00:00',
              cpuUsage: Math.random() * 15 + 5,
              memoryUsage: Math.random() * 200 + 100,
              lastStart: new Date(),
              logs: [{ time: '刚刚', message: '服务已启动' }, ...app.logs]
            }
          : app
      );
      saveToLocalStorage(updatedApps);
      return updatedApps;
    });
    
    showNotification(`已启动 ${selectedApps.length} 个应用`);
    setSelectedApps([]);
  };

  // 批量停止应用
  const handleBatchStop = () => {
    setApps(prev => {
      const updatedApps = prev.map(app => 
        selectedApps.includes(app.id) && app.status === 'running'
          ? { 
              ...app, 
              status: 'stopped',
              cpuUsage: 0,
              memoryUsage: 0,
              logs: [{ time: '刚刚', message: '服务已停止' }, ...app.logs]
            }
          : app
      );
      saveToLocalStorage(updatedApps);
      return updatedApps;
    });
    
    showNotification(`已停止 ${selectedApps.length} 个应用`);
    setSelectedApps([]);
    if (selectedApp && selectedApps.includes(selectedApp.id)) {
      setSelectedApp(null);
    }
  };

  // 批量删除应用
  const handleBatchDelete = () => {
    if (window.confirm(`确定要删除选中的 ${selectedApps.length} 个应用吗？`)) {
      setApps(prev => {
        const updatedApps = prev.filter(app => !selectedApps.includes(app.id));
        saveToLocalStorage(updatedApps);
        return updatedApps;
      });
      
      showNotification(`已删除 ${selectedApps.length} 个应用`);
      setSelectedApps([]);
      if (selectedApp && selectedApps.includes(selectedApp.id)) {
        setSelectedApp(null);
      }
    }
  };

  // 显示通知
  const showNotification = (message) => {
    setNotification({ message, type: 'info' });
    setTimeout(() => setNotification(null), 3000);
  };
  
  // 性能优化：使用useCallback缓存常用函数
  
  // 处理添加应用
  const handleAdd = () => {
    setEditingApp(null);
    setFormData({
      name: '',
      description: '',
      command: '',
      type: 'server',
      autostart: false
    });
    setShowAddModal(true);
  };

  // 处理编辑应用
  const handleEdit = (app) => {
    setEditingApp(app);
    setFormData({
      name: app.name,
      description: app.description,
      command: app.command,
      type: app.type,
      autostart: app.autostart
    });
    setShowAddModal(true);
  };

  // 处理表单提交
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingApp) {
      // 更新应用
      setApps(prev => {
        const updatedApps = prev.map(app => 
          app.id === editingApp.id 
            ? { 
                ...app, 
                ...formData,
                logs: [{ time: '刚刚', message: '配置已更新' }, ...app.logs]
              }
            : app
        );
        saveToLocalStorage(updatedApps);
        return updatedApps;
      });
      showNotification('应用配置已更新');
    } else {
      // 添加新应用
      const newApp = {
        id: Date.now().toString(),
        ...formData,
        status: 'stopped',
        uptime: '00:00:00',
        cpuUsage: 0,
        memoryUsage: 0,
        lastStart: new Date(),
        version: formData.version || '1.0.0',
        logs: [{ time: '刚刚', message: '应用已创建' }]
      };
      setApps(prev => {
        const updatedApps = [...prev, newApp];
        saveToLocalStorage(updatedApps);
        return updatedApps;
      });
      showNotification('新应用已添加');
    }
    
    setShowAddModal(false);
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className="anyrun-dashboard loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>正在加载应用管理器...</h2>
          <p>请稍候，系统正在初始化</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`anyrun-dashboard theme-${theme}`}>
      {/* 侧边栏 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🚀</span>
            <h1>AnyRun</h1>
          </div>
          <button className="sidebar-toggle">
            <span>☰</span>
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <a href="#dashboard" className="nav-item active">
            <span className="nav-icon">📊</span>
            <span>仪表盘</span>
          </a>
          <a href="#applications" className="nav-item">
            <span className="nav-icon">📱</span>
            <span>应用管理</span>
          </a>
          <a href="#monitoring" className="nav-item">
            <span className="nav-icon">📈</span>
            <span>性能监控</span>
          </a>
          <a href="#settings" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>系统设置</span>
          </a>
        </nav>
        
        <div className="sidebar-footer">
          <div className="system-info">
            <div className="info-item">
              <span className="info-label">CPU</span>
              <span className="info-value">{stats.cpu.toFixed(1)}%</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${stats.cpu}%` }}></div>
              </div>
            </div>
            <div className="info-item">
              <span className="info-label">内存</span>
              <span className="info-value">{stats.memory.toFixed(1)}%</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${stats.memory}%` }}></div>
              </div>
            </div>
            <div className="info-item">
              <span className="info-label">运行时间</span>
              <span className="info-value">{stats.uptime}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      {isAuthenticated && (
        <main className="main-content">
        {/* 顶部导航栏 */}
        <header className="main-header">
          <div className="header-left">
            <h2 className="page-title">应用管理控制台</h2>
            <p className="page-subtitle">实时监控和管理您的应用服务</p>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{currentUser || '用户'}</span>
              <div className="user-actions">
                <button 
                  className="user-btn" 
                  onClick={() => setShowChangePassword(true)}
                  title="修改密码"
                >
                  🔑
                </button>
                <button 
                  className="user-btn logout" 
                  onClick={handleLogout}
                  title="退出登录"
                >
                  🚪
                </button>
              </div>
            </div>
            
            <div className="theme-selector">
              <button 
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                title="浅色模式"
              >
                ☀️
              </button>
              <button 
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                title="深色模式"
              >
                🌙
              </button>
            </div>
          </div>
        </header>

        {/* 统计卡片 */}
        <section className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon bg-blue">📦</div>
            <div className="stat-content">
              <h3 className="stat-value">{stats.total}</h3>
              <p className="stat-label">总应用数</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon bg-green">▶️</div>
            <div className="stat-content">
              <h3 className="stat-value">{stats.running}</h3>
              <p className="stat-label">运行中</p>
              <span className="stat-change positive">+2 今日</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon bg-gray">⏹️</div>
            <div className="stat-content">
              <h3 className="stat-value">{stats.stopped}</h3>
              <p className="stat-label">已停止</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon bg-purple">⚡</div>
            <div className="stat-content">
              <h3 className="stat-value">{stats.cpu.toFixed(1)}%</h3>
              <p className="stat-label">CPU使用率</p>
              <div className="mini-progress">
                <div className="progress-fill" style={{ width: `${stats.cpu}%` }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* 工具栏 */}
        <section className="toolbar">
          <div className="toolbar-left">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="搜索应用名称或描述..."
                value={searchTerm}
                onChange={(e) => debouncedSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="toolbar-right">
            <div className="view-tabs">
              <button 
                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                全部
              </button>
              <button 
                className={`tab-btn ${activeTab === 'running' ? 'active' : ''}`}
                onClick={() => setActiveTab('running')}
              >
                运行中
              </button>
              <button 
                className={`tab-btn ${activeTab === 'stopped' ? 'active' : ''}`}
                onClick={() => setActiveTab('stopped')}
              >
                已停止
              </button>
            </div>
            
            <div className="sort-options">
              <select 
                value={sortBy} 
                onChange={(e) => handleSort(e.target.value)}
                className="sort-select"
              >
                <option value="name">名称排序</option>
                <option value="status">状态排序</option>
                <option value="cpu">CPU排序</option>
                <option value="memory">内存排序</option>
              </select>
              <button 
                className={`sort-order-btn ${sortOrder === 'desc' ? 'active' : ''}`}
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            
            <button className="add-app-btn" onClick={handleAdd}>
              <span>+</span>
              添加应用
            </button>
          </div>
        </section>

        {/* 应用列表和详情区域 */}
        <div className="app-layout">
          {/* 应用列表 */}
          <div className="app-list">
            {filteredApps.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>未找到应用</h3>
                <p>{searchTerm ? '没有匹配的搜索结果' : '当前没有任何应用'}</p>
                <button className="empty-action" onClick={handleAdd}>
                  添加新应用
                </button>
              </div>
            ) : (
              <>
                {/* 批量操作栏 */}
                {selectedApps.length > 0 && (
                  <div className="batch-actions-bar">
                    <div className="batch-info">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={selectedApps.length === sortedApps.length} 
                          onChange={handleSelectAll} 
                        />
                        已选择 {selectedApps.length} 项
                      </label>
                    </div>
                    <div className="batch-actions-buttons">
                      <button 
                        className="batch-btn start"
                        onClick={handleBatchStart}
                        disabled={selectedApps.every(id => {
                          const app = apps.find(a => a.id === id);
                          return app && app.status === 'running';
                        })}
                      >
                        批量启动
                      </button>
                      <button 
                        className="batch-btn stop"
                        onClick={handleBatchStop}
                        disabled={selectedApps.every(id => {
                          const app = apps.find(a => a.id === id);
                          return app && app.status === 'stopped';
                        })}
                      >
                        批量停止
                      </button>
                      <button 
                        className="batch-btn delete"
                        onClick={handleBatchDelete}
                      >
                        批量删除
                      </button>
                      <button 
                        className="batch-btn cancel"
                        onClick={() => setSelectedApps([])}
                      >
                        取消选择
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="apps-grid">
                  {sortedApps.map(app => {
                    const typeConfig = appTypeConfig[app.type] || appTypeConfig.app;
                    const isSelected = selectedApps.includes(app.id);
                    
                    return (
                      <div 
                        key={app.id} 
                        className={`app-card ${app.status === 'running' ? 'running' : 'stopped'} ${selectedApp?.id === app.id ? 'selected' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleAppSelect(app)}
                      >
                        <div className="card-header">
                          {/* 复选框 */}
                          <label 
                            className="checkbox-label card-checkbox"
                            onClick={(e) => handleToggleSelect(app.id, e)}
                          >
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={(e) => handleToggleSelect(app.id, e)} 
                            />
                          </label>
                          
                          <div 
                            className="app-icon" 
                            style={{ 
                              backgroundColor: typeConfig.bgColor,
                              color: typeConfig.color
                            }}
                          >
                            {typeConfig.icon}
                          </div>
                          
                          <div className="app-basic-info">
                            <h3 className="app-name">{app.name}</h3>
                            <p className="app-description">{app.description}</p>
                          </div>
                          
                          <div className="app-status-indicator">
                            <div className={`status-dot ${app.status}`}></div>
                          <span className="status-text">
                            {app.status === 'running' ? '运行中' : '已停止'}
                          </span>
                        </div>
                      </div>
                      
                      {app.status === 'running' && (
                        <div className="card-stats">
                          <div className="stat-row">
                            <span className="stat-label">CPU</span>
                            <span className="stat-value">{app.cpuUsage.toFixed(1)}%</span>
                            <div className="progress-bar small">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${app.cpuUsage}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">内存</span>
                            <span className="stat-value">{formatMemory(app.memoryUsage)}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="card-footer">
                        <span className="app-meta">
                          版本: {app.version}
                        </span>
                        <div className="app-quick-actions">
                          {app.status === 'running' ? (
                            <button 
                              className="quick-action stop"
                              onClick={(e) => { e.stopPropagation(); handleStop(app.id); }}
                              title="停止"
                            >
                              ■
                            </button>
                          ) : (
                            <button 
                              className="quick-action start"
                              onClick={(e) => { e.stopPropagation(); handleStart(app.id); }}
                              title="启动"
                            >
                              ▶
                            </button>
                          )}
                          <button 
                            className="quick-action edit"
                            onClick={(e) => { e.stopPropagation(); handleEdit(app); }}
                            title="编辑"
                          >
                            ✎
                          </button>
                          <button 
                            className="quick-action delete"
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(app.id); }}
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 应用详情 */}
          {selectedApp && (
            <div className="app-details-panel">
              <div className="details-header">
                <div className="app-header-info">
                  {(() => {
                    const typeConfig = appTypeConfig[selectedApp.type] || appTypeConfig.app;
                    return (
                      <div 
                        className="app-detail-icon" 
                        style={{ 
                          backgroundColor: typeConfig.bgColor,
                          color: typeConfig.color
                        }}
                      >
                        {typeConfig.icon}
                      </div>
                    );
                  })()}
                  <div className="detail-title-group">
                    <h2>{selectedApp.name}</h2>
                    <p>{selectedApp.description}</p>
                  </div>
                </div>
                <button 
                  className="close-details"
                  onClick={() => setSelectedApp(null)}
                >
                  ×
                </button>
              </div>
              
              <div className="details-content">
                <div className="info-section">
                  <h3>基本信息</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>状态</label>
                      <span className={`status-badge ${selectedApp.status}`}>
                        {selectedApp.status === 'running' ? '运行中' : '已停止'}
                      </span>
                    </div>
                    <div className="info-item">
                      <label>类型</label>
                      <span>{selectedApp.type}</span>
                    </div>
                    <div className="info-item">
                      <label>版本</label>
                      <span>{selectedApp.version}</span>
                    </div>
                    <div className="info-item">
                      <label>自启动</label>
                      <span className={selectedApp.autostart ? 'success' : 'warning'}>
                        {selectedApp.autostart ? '是' : '否'}
                      </span>
                    </div>
                    {selectedApp.status === 'running' && (
                      <>
                        <div className="info-item">
                          <label>运行时间</label>
                          <span>{selectedApp.uptime}</span>
                        </div>
                        <div className="info-item">
                          <label>上次启动</label>
                          <span>{formatDate(selectedApp.lastStart)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {selectedApp.status === 'running' && (
                  <div className="info-section">
                    <h3>资源使用</h3>
                    <div className="resource-metrics">
                      <div className="metric-item">
                        <div className="metric-header">
                          <span className="metric-label">CPU 使用率</span>
                          <span className="metric-value">{selectedApp.cpuUsage.toFixed(1)}%</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill cpu" 
                            style={{ width: `${selectedApp.cpuUsage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="metric-item">
                        <div className="metric-header">
                          <span className="metric-label">内存使用</span>
                          <span className="metric-value">{formatMemory(selectedApp.memoryUsage)}</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill memory" 
                            style={{ width: `${Math.min(selectedApp.memoryUsage / 10, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="info-section">
                  <h3>配置信息</h3>
                  <div className="command-info">
                    <label>启动命令</label>
                    <code className="command-code">{selectedApp.command}</code>
                  </div>
                </div>
                
                <div className="info-section">
                  <h3>最近日志</h3>
                  <div className="logs-container">
                    {selectedApp.logs.length > 0 ? (
                      <div className="logs-list">
                        {selectedApp.logs.slice(0, 5).map((log, index) => (
                          <div key={index} className="log-entry">
                            <span className="log-time">{log.time}</span>
                            <span className="log-message">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-logs">暂无日志记录</div>
                )}
              </div>
              </>
            )}
          </div>
              </div>
              
              <div className="details-footer">
                {selectedApp.status === 'running' ? (
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleStop(selectedApp.id)}
                  >
                    ■ 停止服务
                  </button>
                ) : (
                  <button 
                    className="btn btn-success"
                    onClick={() => handleStart(selectedApp.id)}
                  >
                    ▶ 启动服务
                  </button>
                )}
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleEdit(selectedApp)}
                >
                  ✎ 编辑配置
                </button>
                <button 
                  className="btn btn-outline-danger"
                  onClick={() => setShowDeleteConfirm(selectedApp.id)}
                >
                  🗑️ 删除应用
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      )}

      {/* 添加/编辑应用模态框 */}
      {isAuthenticated && showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingApp ? '编辑应用' : '添加新应用'}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>应用名称 *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="请输入应用名称"
                />
              </div>
              
              <div className="form-group">
                <label>应用描述</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="请输入应用描述"
                  rows={3}
                />
              </div>
              
              <div className="form-group">
                <label>启动命令 *</label>
                <input 
                  type="text" 
                  required
                  value={formData.command}
                  onChange={(e) => setFormData({...formData, command: e.target.value})}
                  placeholder="请输入启动命令"
                />
              </div>
              
              <div className="form-group">
                <label>应用类型</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  {Object.entries(appTypeConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {key === 'server' ? '服务器' :
                                    key === 'frontend' ? '前端应用' :
                                    key === 'database' ? '数据库' :
                                    key === 'cache' ? '缓存服务' :
                                    key === 'terminal' ? '终端工具' :
                                    key === 'script' ? '脚本程序' : '应用程序'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group checkbox-group">
                <input 
                  type="checkbox" 
                  id="autostart"
                  checked={formData.autostart}
                  onChange={(e) => setFormData({...formData, autostart: e.target.checked})}
                />
                <label htmlFor="autostart">开机自启动</label>
              </div>
              
              <div className="form-group">
                <label>版本号</label>
                <input 
                  type="text" 
                  value={formData.version}
                  onChange={(e) => setFormData({...formData, version: e.target.value})}
                  placeholder="请输入版本号，如: 1.0.0"
                />
              </div>
              
              <div className="form-group checkbox-group">
                <input 
                  type="checkbox" 
                  id="monitor"
                  checked={formData.monitor || false}
                  onChange={(e) => setFormData({...formData, monitor: e.target.checked})}
                />
                <label htmlFor="monitor">自动监控和重启</label>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingApp ? '保存更改' : '创建应用'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {isAuthenticated && showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content small">
            <div className="modal-header">
              <h2>确认删除</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDeleteConfirm(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>您确定要删除此应用吗？此操作不可撤销。</p>
              <p className="warning-text">删除后，所有相关的配置和日志将被清除。</p>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                取消
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 通知组件 */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.message}
          </div>
          <button 
            className="notification-close"
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}
      
      {/* 登录模态框 */}
      {showLogin && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal-content login-modal">
            <h2>登录</h2>
            {loginError && <div className="error-message">{loginError}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>用户名</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>密码</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="remember"
                  checked={loginForm.remember}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, remember: e.target.checked }))}
                />
                <label htmlFor="remember">记住密码（一天）</label>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loginLoading}>
                {loginLoading ? '登录中...' : '登录'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* 修改密码模态框 */}
      {showChangePassword && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal-content change-password-modal">
            <h2>设置密码</h2>
            <p className="modal-description">首次登录，请设置您的密码</p>
            {loginError && <div className="error-message">{loginError}</div>}
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>用户名</label>
                <input
                  type="text"
                  value={passwordForm.username}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              {!isAuthenticated && (
                <div className="form-group">
                  <label>当前密码</label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                  />
                  <small>首次登录时无需输入当前密码</small>
                </div>
              )}
              <div className="form-group">
                <label>新密码</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>确认密码</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                设置密码
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;