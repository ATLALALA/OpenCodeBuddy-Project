/**
 * Game Manager - 集成 game-core 和 renderer-pixi
 * 
 * 连接 BridgeState 更新与战斗逻辑
 */

import { Application, Graphics } from 'pixi.js';
import type { BridgeState } from '@opencode-buddy/shared';
import {
  BattlePhase,
  BattleState,
  WorkState,
  BattleLoop,
  createBattleLoop,
  DefaultSpawnRule,
  createDefaultActionPolicy,
  createHeroState,
  EnemyConfigSimple,
} from '@opencode-buddy/game-core';
import {
  AssetLoader,
  createAssetLoader,
  BattleScene,
  createBattleScene,
} from '@opencode-buddy/renderer-pixi';

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
export class GameManager {
  private app: Application;
  private config: GameManagerConfig;
  private assetLoader: AssetLoader;
  private battleScene: BattleScene | null = null;
  private battleLoop: BattleLoop | null = null;
  private battleState: BattleState | null = null;

  private lastBridgeState: BridgeState | null = null;
  private running: boolean = false;
  private lastTime: number = 0;

  // 默认敌人配置（与 Config/EnemyConfig 保持一致）
  private enemyConfigs: Map<string, EnemyConfigSimple> = new Map([
    ['orc', { id: 'orc', stats: { hp: 50, atk: 10, def: 3, spd: 0.9 } }],
  ]);

  constructor(config: GameManagerConfig) {
    this.config = config;
    this.app = new Application();
    this.assetLoader = createAssetLoader(config.assetsPath);
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    // 初始化 PixiJS
    await this.app.init({
      canvas: this.config.canvas,
      width: this.config.width,
      height: this.config.height,
      backgroundColor: 0x1a1a2e,
      antialias: true,
    });

    // 创建战斗场景
    this.battleScene = createBattleScene(this.app, this.assetLoader, {
      width: this.config.width,
      height: this.config.height,
      heroPositionY: this.config.height * 0.7,
      enemyPositionY: this.config.height * 0.4,
      unitScale: 1.5,
    });

    await this.battleScene.init();

    // 预加载素材
    await this.preloadAssets();

    // 创建初始战斗状态
    this.initBattleState();

    // 添加简单背景
    this.createBackground();

    console.log('[GameManager] Initialized');
  }

  /**
   * 预加载素材
   */
  private async preloadAssets(): Promise<void> {
    console.log('[GameManager] Preloading assets...');

    // 预加载 Soldier（英雄）
    await this.assetLoader.loadUnit('ArtAssets/Character/Soldier', {
      idle: { variants: ['Idle'], fps: 8, loop: true },
      walk: { variants: ['Walk'], fps: 10, loop: true },
      attack: { variants: ['Attack01', 'Attack02'], fps: 12, loop: false },
      skill: { variants: ['Skill'], fps: 12, loop: false },
      hit: { variants: ['Hit'], fps: 10, loop: false },
      die: { variants: ['Die'], fps: 8, loop: false },
      defend: { variants: ['Defend'], fps: 10, loop: false },
    });

    // 预加载 Orc（敌人）
    await this.assetLoader.loadUnit('ArtAssets/Enemy/Orc', {
      idle: { variants: ['Idle'], fps: 6, loop: true },
      walk: { variants: ['Walk'], fps: 8, loop: true },
      attack: { variants: ['Attack01', 'Attack02'], fps: 10, loop: false },
      hit: { variants: ['Hit'], fps: 10, loop: false },
      die: { variants: ['Die'], fps: 8, loop: false },
    });

    console.log('[GameManager] Assets preloaded');
  }

  /**
   * 初始化战斗状态
   */
  private initBattleState(): void {
    // 创建初始英雄（使用 soldier 配置）
    const hero = createHeroState('hero1', 'soldier', 100);

    this.battleState = {
      phase: BattlePhase.Dormant,
      heroes: [hero],
      enemies: [],
      lastDoneTodos: 0,
      spawnTimer: 0,
      resolveTimer: 0,
      victoryTimer: 0,
      enemyIdCounter: 0,
    };

    // 创建刷怪规则
    const spawnRule = new DefaultSpawnRule(
      {
        baseAliveCount: 1,
        alivePerTodo: 1,
        respawnDelayMin: 1,
        respawnDelayMax: 3,
      },
      [
        { id: 'orc', weight: 1 },
      ]
    );

    // 创建动作策略
    const actionPolicy = createDefaultActionPolicy(0.1);

    // 创建战斗循环
    this.battleLoop = createBattleLoop(
      this.battleState,
      spawnRule,
      actionPolicy,
      {
        recoveryDuration: 10,
        healInterval: 1,
        hpRegenPercent: 0.2,
        resolveDuration: 1,
        victoryDuration: 3,
        critMultiplier: 2,
        defendDamageReduction: 0.5,
      },
      this.enemyConfigs
    );
  }

  /**
   * 创建背景
   */
  private createBackground(): void {
    const bg = new Graphics();

    // 渐变天空
    bg.rect(0, 0, this.config.width, this.config.height * 0.3);
    bg.fill({ color: 0x16213e });

    // 地面
    bg.rect(0, this.config.height * 0.6, this.config.width, this.config.height * 0.4);
    bg.fill({ color: 0x2d3a2c });

    this.app.stage.addChildAt(bg, 0);
  }

  /**
   * 处理 BridgeState 更新
   */
  onBridgeStateUpdate(state: BridgeState): void {
    this.lastBridgeState = state;
  }

  /**
   * 开始游戏循环
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.lastTime = performance.now();

    this.app.ticker.add(this.gameLoop.bind(this));

    console.log('[GameManager] Game loop started');
  }

  /**
   * 停止游戏循环
   */
  stop(): void {
    this.running = false;
    this.app.ticker.remove(this.gameLoop.bind(this));
  }

  /**
   * 游戏主循环
   */
  private gameLoop(): void {
    if (!this.running || !this.battleLoop || !this.battleScene || !this.battleState) {
      return;
    }

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000; // 转换为秒
    this.lastTime = now;

    // 构建 WorkState
    const workState = this.buildWorkState();

    // 执行战斗循环
    const events = this.battleLoop.tick(dt, workState);

    // 同步状态到渲染
    this.battleScene.syncState(this.battleState);

    // 处理事件
    this.battleScene.handleEvents(events);

    // 更新渲染
    this.battleScene.update(dt);
  }

  /**
   * 从 BridgeState 构建 WorkState
   */
  private buildWorkState(): WorkState {
    if (!this.lastBridgeState?.session) {
      return {
        totalTodos: 0,
        doneTodos: 0,
        openTodos: 0,
        busy: false,
        idle: true,
      };
    }

    const session = this.lastBridgeState.session;

    return {
      totalTodos: session.totalTodos,
      doneTodos: session.doneTodos,
      openTodos: session.totalTodos - session.doneTodos,
      busy: session.busy,
      idle: !session.busy,
    };
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.stop();
    this.battleScene?.destroy();
    this.app.destroy();
  }
}

/**
 * 创建游戏管理器
 */
export async function createGameManager(config: GameManagerConfig): Promise<GameManager> {
  const manager = new GameManager(config);
  await manager.init();
  return manager;
}
