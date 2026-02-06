/**
 * Preload 脚本 - 在 renderer 进程中暴露安全的 API
 * 注意：此文件必须编译为 CommonJS 格式
 */

const { contextBridge, ipcRenderer } = require('electron');

// 定义暴露给 renderer 的 API
const electronAPI = {
  // 设置
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  toggleAlwaysOnTop: () => ipcRenderer.send('window-toggle-always-on-top'),

  // BridgeState 更新监听
  onBridgeStateUpdate: (callback: any) => {
    ipcRenderer.on('bridge-state-update', (_: any, state: any) => callback(state));
  },

  // 移除监听
  removeBridgeStateListener: () => {
    ipcRenderer.removeAllListeners('bridge-state-update');
  },
};

// 暴露到 window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronAPI);


