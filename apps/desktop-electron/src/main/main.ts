/**
 * Electron 主进程入口
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTray, destroyTray } from './tray.js';
import { startFileWatcher, stopFileWatcher } from './fileWatcher.js';
import { initDataManager, getSettings, saveSettings } from './dataManager.js';
import type { BridgeState } from '@opencode-buddy/shared';

// ESM 兼容的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

async function createWindow(): Promise<void> {
  const settings = getSettings();

  mainWindow = new BrowserWindow({
    width: settings.window.width,
    height: settings.window.height,
    x: settings.window.x,
    y: settings.window.y,
    frame: false,
    transparent: true,
    alwaysOnTop: settings.window.alwaysOnTop,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
  });

  // 开发模式加载 Vite dev server
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  // 窗口拖拽支持
  mainWindow.on('move', () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      const currentSettings = getSettings();
      currentSettings.window.x = x;
      currentSettings.window.y = y;
      saveSettings(currentSettings);
    }
  });

  mainWindow.on('resize', () => {
    if (mainWindow) {
      const [width, height] = mainWindow.getSize();
      const currentSettings = getSettings();
      currentSettings.window.width = width;
      currentSettings.window.height = height;
      saveSettings(currentSettings);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIPC(): void {
  // 接收来自 renderer 的请求
  ipcMain.handle('get-settings', () => {
    return getSettings();
  });

  ipcMain.handle('save-settings', (_, settings) => {
    saveSettings(settings);
    return true;
  });

  // 窗口控制
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window-close', () => {
    mainWindow?.hide();
  });

  ipcMain.on('window-toggle-always-on-top', () => {
    if (mainWindow) {
      const current = mainWindow.isAlwaysOnTop();
      mainWindow.setAlwaysOnTop(!current);
      const settings = getSettings();
      settings.window.alwaysOnTop = !current;
      saveSettings(settings);
    }
  });
}

function onBridgeStateUpdate(state: BridgeState): void {
  mainWindow?.webContents.send('bridge-state-update', state);
}

app.whenReady().then(async () => {
  // 初始化数据管理器
  initDataManager();

  // 创建窗口
  await createWindow();

  // 设置托盘
  createTray(mainWindow);

  // 设置 IPC
  setupIPC();

  // 启动文件监听
  const settings = getSettings();
  if (settings.currentWorktree) {
    startFileWatcher(settings.currentWorktree, onBridgeStateUpdate);
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // macOS 上保持应用运行
  if (process.platform !== 'darwin') {
    stopFileWatcher();
    destroyTray();
    app.quit();
  }
});

app.on('before-quit', () => {
  stopFileWatcher();
  destroyTray();
});
