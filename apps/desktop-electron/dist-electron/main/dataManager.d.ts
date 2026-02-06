/**
 * 玩家数据管理器 - 读写 PlayerData/Settings.json 和 SaveData.json
 */
import type { Settings, SaveData } from '@opencode-buddy/shared';
/**
 * 初始化数据管理器
 * - 确保 PlayerData 目录存在
 * - 如果文件不存在，从 defaults 复制或创建默认值
 */
export declare function initDataManager(): void;
export declare function getSettings(): Settings;
export declare function getSaveData(): SaveData;
export declare function saveSettings(settings: Settings): void;
export declare function saveSaveData(saveData: SaveData): void;
//# sourceMappingURL=dataManager.d.ts.map