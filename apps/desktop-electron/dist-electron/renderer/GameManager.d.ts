/**
 * Game Manager - 集成 game-core 和 renderer-pixi
 *
 * 连接 BridgeState 更新与战斗逻辑
 */
import type { BridgeState } from '@opencode-buddy/shared';
/**
 * 游戏管理器配置
 */
export interface GameManagerConfig {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    assetsPath: string;
}
/**
 * 游戏管理器
 */
export declare class GameManager {
    private app;
    private config;
    private assetLoader;
    private battleScene;
    private battleLoop;
    private battleState;
    private lastBridgeState;
    private running;
    private lastTime;
    private enemyConfigs;
    constructor(config: GameManagerConfig);
    /**
     * 初始化
     */
    init(): Promise<void>;
    /**
     * 预加载素材
     */
    private preloadAssets;
    /**
     * 初始化战斗状态
     */
    private initBattleState;
    /**
     * 创建背景
     */
    private createBackground;
    /**
     * 处理 BridgeState 更新
     */
    onBridgeStateUpdate(state: BridgeState): void;
    /**
     * 开始游戏循环
     */
    start(): void;
    /**
     * 停止游戏循环
     */
    stop(): void;
    /**
     * 游戏主循环
     */
    private gameLoop;
    /**
     * 从 BridgeState 构建 WorkState
     */
    private buildWorkState;
    /**
     * 销毁
     */
    destroy(): void;
}
/**
 * 创建游戏管理器
 */
export declare function createGameManager(config: GameManagerConfig): Promise<GameManager>;
//# sourceMappingURL=GameManager.d.ts.map