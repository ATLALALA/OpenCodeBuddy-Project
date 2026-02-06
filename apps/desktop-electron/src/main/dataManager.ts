/**
 * 玩家数据管理器 - 读写 PlayerData/Settings.json 和 SaveData.json
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { app } from 'electron';
import type { Settings, SaveData } from '@opencode-buddy/shared';
import { createDefaultSettings, createDefaultSaveData } from '@opencode-buddy/shared';

// 数据目录（开发模式使用项目根目录，生产模式使用 app.getPath）
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function getDataDir(): string {
  if (isDev) {
    // 开发模式：项目根目录/PlayerData
    return join(process.cwd(), 'PlayerData');
  }
  // 生产模式：用户数据目录
  return join(app.getPath('userData'), 'PlayerData');
}

function getSettingsPath(): string {
  return join(getDataDir(), 'Settings.json');
}

function getSaveDataPath(): string {
  return join(getDataDir(), 'SaveData.json');
}

let cachedSettings: Settings | null = null;
let cachedSaveData: SaveData | null = null;

/**
 * 初始化数据管理器
 * - 确保 PlayerData 目录存在
 * - 如果文件不存在，从 defaults 复制或创建默认值
 */
export function initDataManager(): void {
  const dataDir = getDataDir();

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Settings
  const settingsPath = getSettingsPath();
  if (!existsSync(settingsPath)) {
    const defaultSettings = createDefaultSettings();
    writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
  }

  // SaveData
  const saveDataPath = getSaveDataPath();
  if (!existsSync(saveDataPath)) {
    const defaultSaveData = createDefaultSaveData();
    writeFileSync(saveDataPath, JSON.stringify(defaultSaveData, null, 2), 'utf-8');
  }

  // 加载到缓存
  cachedSettings = loadSettings();
  cachedSaveData = loadSaveData();

  console.log('[DataManager] Initialized:', dataDir);
}

function loadSettings(): Settings {
  try {
    const content = readFileSync(getSettingsPath(), 'utf-8');
    return JSON.parse(content) as Settings;
  } catch {
    return createDefaultSettings();
  }
}

function loadSaveData(): SaveData {
  try {
    const content = readFileSync(getSaveDataPath(), 'utf-8');
    return JSON.parse(content) as SaveData;
  } catch {
    return createDefaultSaveData();
  }
}

export function getSettings(): Settings {
  if (!cachedSettings) {
    cachedSettings = loadSettings();
  }
  return cachedSettings;
}

export function getSaveData(): SaveData {
  if (!cachedSaveData) {
    cachedSaveData = loadSaveData();
  }
  return cachedSaveData;
}

export function saveSettings(settings: Settings): void {
  cachedSettings = settings;
  atomicWrite(getSettingsPath(), JSON.stringify(settings, null, 2));
}

export function saveSaveData(saveData: SaveData): void {
  saveData.lastSavedAt = new Date().toISOString();
  cachedSaveData = saveData;
  atomicWrite(getSaveDataPath(), JSON.stringify(saveData, null, 2));
}

/**
 * 原子写入：先写临时文件再覆盖
 */
function atomicWrite(path: string, content: string): void {
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, content, 'utf-8');
  copyFileSync(tempPath, path);
  // 清理临时文件（忽略错误）
  try {
    const { unlinkSync } = require('node:fs');
    unlinkSync(tempPath);
  } catch {
    // ignore
  }
}
