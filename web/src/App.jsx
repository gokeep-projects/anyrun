import React, { useEffect, useState } from 'react';
import ConfigModal from './ConfigModal';
import AddAppModal from './AddAppModal';
import EditAppModal from './EditAppModal';
import DeleteAppModal from './DeleteAppModal';
import { useSettings } from './SettingsContext';

function statusColor(status, theme) {
  if (status === 'running') return 'linear-gradient(90deg,#52c41a,#a0e267)';
  if (status === 'stopped') return theme === 'dark' ? 'linear-gradient(90deg,#ff4d4f,#b32426)' : 'linear-gradient(90deg,#ff4d4f,#ffb3b3)';
  return theme === 'dark' ? 'linear-gradient(90deg,#555,#777)' : 'linear-gradient(90deg,#d9d9d9,#f0f0f0)';
}

export default function App() {
  const { language, theme, updateLanguage, updateTheme } = useSettings();
  const [apps, setApps] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showAddApp, setShowAddApp] = useState(false);
  const [showEditApp, setShowEditApp] = useState(false);
  const [showDeleteApp, setShowDeleteApp] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [deletingApp, setDeletingApp] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState('');

  const fetchApps = async () => {
    try {
      // 获取配置中的所有应用
      const configRes = await fetch('/config');
      const configData = await configRes.json();
      
      // 获取当前运行状态
      const statusRes = await fetch('/apps');
      const statusData = await statusRes.json();
      
      // 合并配置和状态信息
      const mergedApps = configData.Apps.map(configApp => {
        const statusApp = statusData.find(app => app.Name === configApp.Name);
        return {
          ...configApp,
          PID: statusApp ? statusApp.PID : null,
          Status: statusApp ? statusApp.Status : 'stopped',
          Path: configApp.AppPath || '',
          Port: statusApp ? statusApp.Port : null
        };
      });
      
      setApps(mergedApps);
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    }
  };

  useEffect(() => {
    fetchApps();
    const timer = setInterval(fetchApps, 2000);
    return () => clearInterval(timer);
  }, []);

  // 处理搜索和分页
  useEffect(() => {
    let result = apps;
    
    // 应用搜索过滤
    if (searchTerm) {
      result = apps.filter(app => 
        app.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.AppType && app.AppType.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredApps(result);
    // 如果当前页没有数据，回到第一页
    if (page > Math.ceil(result.length / pageSize) && result.length > 0) {
      setPage(1);
    }
  }, [apps, searchTerm, page]);

  const handleAction = async (name, action) => {
    try {
      const res = await fetch(`/${action}?name=${encodeURIComponent(name)}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }
      // 立即刷新应用状态
      setTimeout(() => {
        fetchApps();
      }, 500); // 稍微延迟以确保操作完成
    } catch (error) {
      console.error(`Failed to ${action} app ${name}:`, error);
      alert(`${language === 'zh' ? '操作失败' : 'Operation failed'}: ${error.message}`);
      // 即使出错也刷新状态
      fetchApps();
    }
  };

  const startAll = async () => { 
    try {
      const res = await fetch('/apps/startall');
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }
      // 立即刷新应用状态
      setTimeout(() => {
        fetchApps();
      }, 500);
    } catch (error) {
      console.error('Failed to start all apps:', error);
      alert(`${language === 'zh' ? '启动全部应用失败' : 'Failed to start all apps'}: ${error.message}`);
      fetchApps();
    }
  };
  
  const stopAll = async () => { 
    try {
      const res = await fetch('/apps/stopall');
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }
      // 立即刷新应用状态
      setTimeout(() => {
        fetchApps();
      }, 500);
    } catch (error) {
      console.error('Failed to stop all apps:', error);
      alert(`${language === 'zh' ? '停止全部应用失败' : 'Failed to stop all apps'}: ${error.message}`);
      fetchApps();
    }
  };
  
  const restartAll = async () => { 
    try {
      const res = await fetch('/apps/restartall');
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }
      // 立即刷新应用状态
      setTimeout(() => {
        fetchApps();
      }, 500);
    } catch (error) {
      console.error('Failed to restart all apps:', error);
      alert(`${language === 'zh' ? '重启全部应用失败' : 'Failed to restart all apps'}: ${error.message}`);
      fetchApps();
    }
  };
  
  const openConfig = () => setShowConfig(true);
  const openAddApp = () => setShowAddApp(true);
  const onConfigSaved = () => { fetchApps(); };
  const onAppAdded = () => { fetchApps(); };
  
  const editApp = (app) => {
    setEditingApp(app);
    setShowEditApp(true);
  };
  
  const saveApp = async (app, shouldRestart = false) => {
    try {
      // 获取当前配置
      const res = await fetch('/config');
      const configData = await res.json();
      
      // 更新应用配置
      let updatedApps;
      if (editingApp) {
        // 编辑现有应用
        updatedApps = configData.Apps.map(a => a.Name === app.Name ? app : a);
      } else {
        // 添加新应用时的逻辑在AddAppModal中处理
        updatedApps = [...configData.Apps, app];
      }
      
      const updatedConfig = {
        ...configData,
        Apps: updatedApps
      };
      
      // 保存配置
      await fetch('/config/save', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(updatedConfig) 
      });
      
      // 如果需要重启应用
      if (shouldRestart && app.Name) {
        try {
          await fetch(`/restart?name=${encodeURIComponent(app.Name)}`);
        } catch (error) {
          console.error('Failed to restart app:', error);
        }
      }
      
      setShowEditApp(false);
      setEditingApp(null);
      fetchApps();
    } catch (error) {
      console.error('Failed to save app:', error);
      alert(`${language === 'zh' ? '保存应用失败' : 'Failed to save app'}: ${error.message}`);
    }
  };
  
  // 删除应用功能
  const requestDeleteApp = (app) => {
    setDeletingApp(app);
    setShowDeleteApp(true);
  };
  
  const deleteApp = async (shouldStop) => {
    if (!deletingApp) return;
    
    try {
      // 如果需要先停止应用
      if (shouldStop && deletingApp.Status === 'running') {
        try {
          await fetch(`/stop?name=${encodeURIComponent(deletingApp.Name)}`);
        } catch (error) {
          console.error('Failed to stop app:', error);
        }
      }
      
      // 获取当前配置
      const res = await fetch('/config');
      const configData = await res.json();
      
      // 过滤掉要删除的应用
      const updatedApps = configData.Apps.filter(app => app.Name !== deletingApp.Name);
      
      const updatedConfig = {
        ...configData,
        Apps: updatedApps
      };
      
      // 保存配置
      await fetch('/config/save', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(updatedConfig) 
      });
      
      setShowDeleteApp(false);
      setDeletingApp(null);
      fetchApps();
    } catch (error) {
      console.error('Failed to delete app:', error);
      alert(`${language === 'zh' ? '删除应用失败' : 'Failed to delete app'}: ${error.message}`);
    }
  };

  // 切换语言
  const toggleLanguage = () => {
    updateLanguage(language === 'zh' ? 'en' : 'zh');
  };

  // 切换主题
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    updateTheme(newTheme);
  };

  // 根据语言设置获取文本
  const getText = (zhText, enText) => {
    return language === 'zh' ? zhText : enText;
  };

  // 设置页面背景色
  useEffect(() => {
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#1f1f1f';
      document.body.style.color = '#ffffff';
    } else {
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#000000';
    }
    
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, [theme]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: theme === 'dark' ? 'linear-gradient(120deg,#1a1a1a 0%,#2d2d2d 100%)' : 'linear-gradient(120deg,#f8fafc 0%,#e3e8ee 100%)', 
      padding: '0 0 40px 0', 
      fontFamily: 'Inter,Roboto,sans-serif',
      color: theme === 'dark' ? '#ffffff' : '#000000'
    }}>
      <div style={{ maxWidth: 1200, margin: '48px auto', background: theme === 'dark' ? '#2d2d2d' : '#fff', borderRadius: 18, boxShadow: theme === 'dark' ? '0 4px 32px #000' : '0 4px 32px #e3e8ee', padding: '32px 36px 24px 36px' }}>
        <h1 style={{ textAlign: 'center', fontWeight: 700, fontSize: 32, marginBottom: 8, letterSpacing: 1, color: theme === 'dark' ? '#ffffff' : '#222' }}>
          {getText('AnyRun 应用管理', 'AnyRun App Manager')}
        </h1>
        <div style={{ textAlign: 'center', color: theme === 'dark' ? '#bbb' : '#888', fontSize: 16, marginBottom: 32 }}>
          {getText('进程状态实时监控，现代化极简体验', 'Real-time process monitoring, modern minimalist experience')}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={startAll} style={{ padding: '8px 16px', borderRadius:8, background:'#52c41a', color:'#fff', border:'none', cursor: 'pointer', fontSize: 14 }}>
              {getText('启动全部', 'Start All')}
            </button>
            <button onClick={stopAll} style={{ padding: '8px 16px', borderRadius:8, background:'#ff4d4f', color:'#fff', border:'none', cursor: 'pointer', fontSize: 14 }}>
              {getText('停止全部', 'Stop All')}
            </button>
            <button onClick={restartAll} style={{ padding: '8px 16px', borderRadius:8, background:'#1890ff', color:'#fff', border:'none', cursor: 'pointer', fontSize: 14 }}>
              {getText('重启全部', 'Restart All')}
            </button>
            <button onClick={openAddApp} style={{ padding: '8px 16px', borderRadius:8, background:'#722ed1', color:'#fff', border:'none', cursor: 'pointer', fontSize: 14 }}>
              {getText('新增应用', 'Add App')}
            </button>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={toggleLanguage} style={{ padding:'8px 16px', borderRadius:8, background: theme === 'dark' ? '#444' : '#f0f2f5', border: theme === 'dark' ? '1px solid #555' : '1px solid #ddd', cursor: 'pointer', fontSize: 14, color: theme === 'dark' ? '#fff' : '#000' }}>
              {language === 'zh' ? 'English' : '中文'} {/* 修改按钮显示文本 */}
            </button>
            <button onClick={toggleTheme} style={{ padding:'8px 16px', borderRadius:8, background: theme === 'dark' ? '#444' : '#f0f2f5', border: theme === 'dark' ? '1px solid #555' : '1px solid #ddd', cursor: 'pointer', fontSize: 14, color: theme === 'dark' ? '#fff' : '#000' }}>
              {theme === 'dark' ? getText('明亮', 'Light') : getText('暗黑', 'Dark')}
            </button>
            <button onClick={openConfig} style={{ padding:'8px 16px', borderRadius:8, background: theme === 'dark' ? '#444' : '#f0f2f5', border: theme === 'dark' ? '1px solid #555' : '1px solid #ddd', cursor: 'pointer', fontSize: 14, color: theme === 'dark' ? '#fff' : '#000' }}>
              {getText('全局配置', 'Global Config')}
            </button>
            <input 
              type="text" 
              placeholder={getText('搜索应用...', 'Search apps...')} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px', border: theme === 'dark' ? '1px solid #555' : '1px solid #ddd', borderRadius: 4, fontSize: 14, width: 180, background: theme === 'dark' ? '#333' : '#fff', color: theme === 'dark' ? '#fff' : '#000' }}
            />
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <thead>
            <tr style={{ background: theme === 'dark' ? '#333' : '#f5f7fa', color: theme === 'dark' ? '#ddd' : '#555' }}>
              <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'left' }}>{getText('应用名', 'App Name')}</th>
              <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'left' }}>{getText('PID', 'PID')}</th>
              <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'left' }}>{getText('端口', 'Port')}</th>
              <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'left' }}>{getText('类型', 'Type')}</th>
              <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'left' }}>{getText('路径', 'Path')}</th>
              <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'left' }}>{getText('状态', 'Status')}</th>
              <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'left' }}>{getText('操作', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.slice((page-1)*pageSize, page*pageSize).map(app => (
              <tr key={app.Name} style={{ transition: 'background 0.2s', background: theme === 'dark' ? '#333' : '#fff', boxShadow: theme === 'dark' ? '0 1px 0 #444' : '0 1px 0 #f0f0f0' }}>
                <td style={{ padding: '12px 8px', color: theme === 'dark' ? '#fff' : '#000' }}>{app.Name}</td>
                <td style={{ padding: '12px 8px', color: theme === 'dark' ? '#fff' : '#000' }}>{app.PID || '-'}</td>
                <td style={{ padding: '12px 8px', color: theme === 'dark' ? '#fff' : '#000' }}>{app.Port || '-'}</td>
                <td style={{ padding: '12px 8px', color: theme === 'dark' ? '#fff' : '#000' }}>{app.AppType || '-'}</td>
                <td style={{ padding: '12px 8px', wordBreak: 'break-all', color: theme === 'dark' ? '#bbb' : '#888', maxWidth: 200 }}>{app.Path}</td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{
                    display: 'inline-block',
                    minWidth: 80,
                    padding: '4px 8px',
                    borderRadius: 8,
                    fontWeight: 700,
                    background: statusColor(app.Status, theme),
                    color: app.Status === 'running' ? '#fff' : '#fff',
                    boxShadow: theme === 'dark' ? '0 2px 8px #000' : '0 2px 8px #eee',
                    textAlign: 'center',
                    fontSize: 13,
                  }}>{app.Status}</span>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  {app.Status !== 'running' && (
                    <button
                      style={{
                        marginRight: 8,
                        padding: '6px 12px',
                        background: 'linear-gradient(90deg,#52c41a,#a0e267)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        boxShadow: theme === 'dark' ? '0 2px 8px #000' : '0 2px 8px #e3e8ee',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => handleAction(app.Name, 'start')}
                    >
                      {getText('启动', 'Start')}
                    </button>
                  )}
                  {app.Status !== 'stopped' && (
                    <button
                      style={{
                        marginRight: 8,
                        padding: '6px 12px',
                        background: 'linear-gradient(90deg,#ff4d4f,#ffb3b3)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        boxShadow: theme === 'dark' ? '0 2px 8px #000' : '0 2px 8px #e3e8ee',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => handleAction(app.Name, 'stop')}
                    >
                      {getText('停止', 'Stop')}
                    </button>
                  )}
                  <button
                    style={{
                      marginRight: 8,
                      padding: '6px 12px',
                      background: 'linear-gradient(90deg,#1890ff,#69c0ff)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      boxShadow: theme === 'dark' ? '0 2px 8px #000' : '0 2px 8px #e3e8ee',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => editApp(app)}
                  >
                    {getText('编辑', 'Edit')}
                  </button>
                  <button
                    style={{
                      padding: '6px 12px',
                      background: 'linear-gradient(90deg,#ff4d4f,#ffb3b3)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      boxShadow: theme === 'dark' ? '0 2px 8px #000' : '0 2px 8px #e3e8ee',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => requestDeleteApp(app)}
                  >
                    {getText('删除', 'Delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20 }}>
            <div style={{ color: theme === 'dark' ? '#bbb' : '#888' }}>
              {getText(`共有 ${filteredApps.length} 个应用`, `Total ${filteredApps.length} apps`)}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ padding: '6px 12px', cursor: 'pointer', border: theme === 'dark' ? '1px solid #555' : '1px solid #ddd', background: theme === 'dark' ? '#333' : '#fff', borderRadius: 4, color: theme === 'dark' ? '#fff' : '#000' }}>
                {getText('上一页', 'Previous')}
              </button>
              <div style={{ color: theme === 'dark' ? '#ddd' : '#666' }}>
                {getText(`第 ${page} / ${Math.max(1, Math.ceil(filteredApps.length / pageSize))} 页`, `Page ${page} / ${Math.max(1, Math.ceil(filteredApps.length / pageSize))}`)}
              </div>
              <button onClick={() => setPage(p => Math.min(Math.ceil(filteredApps.length / pageSize), p+1))} disabled={page>=Math.ceil(filteredApps.length / pageSize)} style={{ padding: '6px 12px', cursor: 'pointer', border: theme === 'dark' ? '1px solid #555' : '1px solid #ddd', background: theme === 'dark' ? '#333' : '#fff', borderRadius: 4, color: theme === 'dark' ? '#fff' : '#000' }}>
                {getText('下一页', 'Next')}
              </button>
            </div>
          </div>
          <ConfigModal visible={showConfig} onClose={() => setShowConfig(false)} onSaved={onConfigSaved} theme={theme} language={language} />
          <AddAppModal visible={showAddApp} onClose={() => setShowAddApp(false)} onAdded={onAppAdded} theme={theme} language={language} />
          <EditAppModal 
            visible={showEditApp} 
            app={editingApp}
            onClose={() => {
              setShowEditApp(false);
              setEditingApp(null);
            }} 
            onSave={saveApp} 
            theme={theme}
            language={language}
          />
          <DeleteAppModal
            visible={showDeleteApp}
            appName={deletingApp?.Name}
            onClose={() => setShowDeleteApp(false)}
            onConfirm={deleteApp}
            theme={theme}
            language={language}
          />
      </div>
      <div style={{ textAlign: 'center', color: theme === 'dark' ? '#777' : '#bbb', fontSize: 14, marginTop: 32 }}>
        &copy; {new Date().getFullYear()} AnyRun · {getText('进程管理工具', 'Process Management Tool')}
      </div>
    </div>
  );
}