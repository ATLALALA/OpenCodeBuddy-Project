/**
 * Renderer 进程入口
 */

import type { BridgeState } from '@opencode-buddy/shared';
import { createGameManager, GameManager } from './GameManager.js';
import { createConfigWizard } from './ConfigWizard.js';

// 声明 window.electronAPI 类型
declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<boolean>;
      minimizeWindow: () => void;
      closeWindow: () => void;
      toggleAlwaysOnTop: () => void;
      onBridgeStateUpdate: (callback: (state: BridgeState) => void) => void;
      removeBridgeStateListener: () => void;
    };
  }
}

// 游戏管理器实例
let gameManager: GameManager | null = null;

// DOM 元素
const statusBadge = document.getElementById('status-badge')!;
const todoCount = document.getElementById('todo-count')!;
const totalDone = document.getElementById('total-done')!;
const convCount = document.getElementById('conv-count')!;
const btnMinimize = document.getElementById('btn-minimize')!;
const btnClose = document.getElementById('btn-close')!;
const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;

// 窗口控制
btnMinimize.addEventListener('click', () => {
  window.electronAPI.minimizeWindow();
});

btnClose.addEventListener('click', () => {
  window.electronAPI.closeWindow();
});

// 更新 UI
function updateUI(state: BridgeState): void {
  // 状态徽章
  let statusClass = 'status-no-session';
  let statusText = '无会话';

  if (state.session) {
    if (state.session.busy) {
      statusClass = 'status-busy';
      statusText = '工作中';
    } else {
      statusClass = 'status-idle';
      statusText = '空闲';
    }
  }

  statusBadge.innerHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;

  // Todo 计数
  if (state.session) {
    todoCount.textContent = `${state.session.doneTodos} / ${state.session.totalTodos}`;
  } else {
    todoCount.textContent = '0 / 0';
  }

  // 累计完成
  totalDone.textContent = String(state.counters.todosCompletedTotal);

  // 对话数
  convCount.textContent = String(state.counters.conversationsCompletedTotal);

  // 传递给游戏管理器
  if (gameManager) {
    gameManager.onBridgeStateUpdate(state);
  }
}

// 初始化游戏
async function initGame() {
  if (!gameCanvas) {
    console.error('[Renderer] Game canvas not found');
    return;
  }

  try {
    gameManager = await createGameManager({
      canvas: gameCanvas,
      width: gameCanvas.width || 400,
      height: gameCanvas.height || 300,
      assetsPath: '', // ArtAssets 路径在 CharacterConfig 中已包含
    });

    gameManager.start();

    console.log('[Renderer] Game initialized');
  } catch (error) {
    console.error('[Renderer] Failed to initialize game:', error);
  }
}

// 监听 BridgeState 更新
window.electronAPI?.onBridgeStateUpdate((state: BridgeState) => {
  console.log('[Renderer] BridgeState update:', state);
  updateUI(state);
});

// 主启动函数
async function main() {
  console.log('[Renderer] OpenCode Buddy starting...');

  // 检查是否需要显示配置向导
  const wizard = createConfigWizard();
  const showedWizard = await wizard.checkAndShow(() => {
    console.log('[Renderer] Config wizard completed');
  });

  if (showedWizard) {
    console.log('[Renderer] Showing config wizard');
  }

  // 初始化游戏
  await initGame();

  console.log('[Renderer] OpenCode Buddy started');
}

// 启动
main();

