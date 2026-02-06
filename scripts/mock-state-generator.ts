/**
 * 🧪 模拟测试脚本 - Mock State Generator
 * 
 * 此脚本用于在没有 OpenCode 的情况下模拟 BridgeState 的生成，
 * 以便测试 Electron 应用的文件监听和 UI 更新功能。
 * 
 * 使用方法：
 *   cd d:\UnityWorks\Plugins\OpenCodeMonsterArena
 *   npx tsx scripts/mock-state-generator.ts
 * 
 * 脚本会每 2 秒更新一次 .opencode/gamify/state.json，模拟：
 * - todo 进度变化
 * - 会话状态切换（busy/idle）
 * - 累计计数器增长
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface BridgeState {
  v: 1;
  updatedAt: string;
  project: { worktree: string };
  session: {
    id: string;
    busy: boolean;
    idle: boolean;
    openTodos: number;
    doneTodos: number;
    totalTodos: number;
    conversationStartedAt: string;
    lastAssistantMessageAt?: string;
  } | null;
  counters: {
    todosCompletedTotal: number;
    conversationsCompletedTotal: number;
  };
}

// 配置
const WORKTREE = process.cwd();
const GAMIFY_DIR = join(WORKTREE, '.opencode/gamify');
const STATE_FILE = join(GAMIFY_DIR, 'state.json');
const UPDATE_INTERVAL_MS = 2000;

// 模拟状态
let totalTodos = 5;
let doneTodos = 0;
let todosCompletedTotal = 0;
let conversationsCompletedTotal = 0;
let sessionId = `mock-session-${Date.now()}`;
let isBusy = false;
let tick = 0;

function ensureDir(): void {
  if (!existsSync(GAMIFY_DIR)) {
    mkdirSync(GAMIFY_DIR, { recursive: true });
    console.log(`📁 Created directory: ${GAMIFY_DIR}`);
  }
}

function writeState(): void {
  const state: BridgeState = {
    v: 1,
    updatedAt: new Date().toISOString(),
    project: { worktree: WORKTREE },
    session: {
      id: sessionId,
      busy: isBusy,
      idle: !isBusy,
      openTodos: totalTodos - doneTodos,
      doneTodos: doneTodos,
      totalTodos: totalTodos,
      conversationStartedAt: new Date(Date.now() - tick * UPDATE_INTERVAL_MS).toISOString(),
      lastAssistantMessageAt: isBusy ? undefined : new Date().toISOString(),
    },
    counters: {
      todosCompletedTotal,
      conversationsCompletedTotal,
    },
  };

  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');

  // 状态显示
  const statusIcon = isBusy ? '🔄' : '✅';
  const progressBar = Array(totalTodos).fill('□').map((_, i) => i < doneTodos ? '■' : '□').join('');
  console.log(`${statusIcon} [${progressBar}] ${doneTodos}/${totalTodos} todos | Total: ${todosCompletedTotal} | Convs: ${conversationsCompletedTotal}`);
}

function simulate(): void {
  tick++;

  // 每 3 次切换一次 busy 状态
  if (tick % 3 === 0) {
    isBusy = !isBusy;
  }

  // 每 4 次完成一个 todo
  if (tick % 4 === 0 && doneTodos < totalTodos) {
    doneTodos++;
    todosCompletedTotal++;
  }

  // 当所有 todo 完成时，重置会话
  if (doneTodos >= totalTodos) {
    conversationsCompletedTotal++;
    sessionId = `mock-session-${Date.now()}`;
    doneTodos = 0;
    totalTodos = Math.floor(Math.random() * 5) + 3; // 3-7 个 todo
    console.log(`\n🆕 New session started! Total todos: ${totalTodos}`);
  }

  writeState();
}

// 启动
console.log('🎮 OpenCode Buddy - Mock State Generator');
console.log('==========================================');
console.log(`📂 Worktree: ${WORKTREE}`);
console.log(`📄 State file: ${STATE_FILE}`);
console.log(`⏱️  Update interval: ${UPDATE_INTERVAL_MS}ms`);
console.log('==========================================');
console.log('Press Ctrl+C to stop\n');

ensureDir();
writeState(); // 初始写入

setInterval(simulate, UPDATE_INTERVAL_MS);
