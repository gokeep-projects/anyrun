import React, { useState } from 'react';

export default function DeleteAppModal({ visible, appName, onClose, onConfirm, theme, language }) {
  const [shouldStop, setShouldStop] = useState(true);

  const handleConfirm = () => {
    onConfirm(shouldStop);
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{language === 'zh' ? '删除应用' : 'Delete App'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <p>
            {language === 'zh' 
              ? `确定要删除应用 "${appName}" 吗？` 
              : `Are you sure you want to delete app "${appName}"?`}
          </p>
          
          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="shouldStop"
                checked={shouldStop}
                onChange={(e) => setShouldStop(e.target.checked)}
              />
              <label htmlFor="shouldStop">
                {language === 'zh' 
                  ? '如果应用正在运行，先停止它' 
                  : 'Stop the app first if it is running'}
              </label>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            {language === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button className="btn btn-danger" onClick={handleConfirm}>
            {language === 'zh' ? '删除' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
