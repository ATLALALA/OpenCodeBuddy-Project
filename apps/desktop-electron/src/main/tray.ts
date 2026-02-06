/**
 * 系统托盘管理
 */

import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import { join } from 'node:path';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow | null): void {
  // 创建托盘图标（使用空白图标作为占位）
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: '隐藏窗口',
      click: () => {
        mainWindow?.hide();
      },
    },
    { type: 'separator' },
    {
      label: '置顶切换',
      type: 'checkbox',
      checked: mainWindow?.isAlwaysOnTop() ?? true,
      click: (menuItem) => {
        mainWindow?.setAlwaysOnTop(menuItem.checked);
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('OpenCode Buddy');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
