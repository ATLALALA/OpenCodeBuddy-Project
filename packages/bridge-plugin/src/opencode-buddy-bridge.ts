/**
 * OpenCode Buddy Bridge Plugin
 * 
 * 将 OpenCode 的 session/todo 状态写入 .opencode/gamify/state.json，
 * 供 Electron 应用监听并驱动游戏逻辑。
 * 
 * 插件入口：实现 OpenCode 的 event hook
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import type { BridgeState, SessionInfo, Counters } from '@opencode-buddy/shared';

// ============================================================
// OpenCode 事件类型定义
// ============================================================

interface OpenCodeContext {
  cwd: string;
}

interface SessionCreatedPayload {
  sessionId: string;
}

interface SessionStatusPayload {
  sessionId: string;
  busy: boolean;
  idle: boolean;
}

interface SessionIdlePayload {
  sessionId: string;
}

interface TodoUpdatedPayload {
  sessionId: string;
  todos: Array<{
    id: string;
    status: 'open' | 'done';
    title: string;
  }>;
}

type EventName = 'session.created' | 'session.status' | 'session.idle' | 'todo.updated';

interface EventPayload {
  'session.created': SessionCreatedPayload;
  'session.status': SessionStatusPayload;
  'session.idle': SessionIdlePayload;
  'todo.updated': TodoUpdatedPayload;
}

// ============================================================
// 内部状态管理
// ============================================================

interface InternalState {
  worktree: string;
  session: SessionInfo | null;
  counters: Counters;
  lastWriteTime: number;
}

const DEBOUNCE_MS = 100;
const GAMIFY_DIR = '.opencode/gamify';
const STATE_FILE = 'state.json';

let state: InternalState = {
  worktree: '',
  session: null,
  counters: {
    todosCompletedTotal: 0,
    conversationsCompletedTotal: 0,
  },
  lastWriteTime: 0,
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Electron 进程追踪
let electronProcess: ChildProcess | null = null;
let lastElectronStartAttempt = 0;
const ELECTRON_START_COOLDOWN_MS = 5000; // 启动冷却时间，避免频繁重启

/**
 * 获取 Electron 应用路径（相对于 bridge-plugin 的位置）
 */
function getElectronAppPath(): string {
  // bridge-plugin 在 packages/bridge-plugin/src/
  // desktop-electron 在 apps/desktop-electron/
  const pluginDir = dirname(dirname(__dirname)); // packages/bridge-plugin
  const rootDir = dirname(dirname(pluginDir)); // 项目根目录
  return join(rootDir, 'apps', 'desktop-electron');
}

/**
 * 检查 Electron 是否正在运行
 */
function isElectronRunning(): boolean {
  if (!electronProcess) return false;

  // 检查进程是否还在运行
  return electronProcess.exitCode === null && !electronProcess.killed;
}

/**
 * 自动启动 Electron 应用
 */
function autoStartElectron(): void {
  // 如果已经在运行，跳过
  if (isElectronRunning()) return;

  // 冷却检查
  const now = Date.now();
  if (now - lastElectronStartAttempt < ELECTRON_START_COOLDOWN_MS) {
    return;
  }
  lastElectronStartAttempt = now;

  // 获取 Electron 应用路径
  const electronAppPath = getElectronAppPath();

  // 检查路径是否存在
  if (!existsSync(electronAppPath)) {
    console.log('[Bridge] Electron app not found at:', electronAppPath);
    return;
  }

  try {
    console.log('[Bridge] Starting Electron app from:', electronAppPath);

    // 使用 pnpm electron:dev 启动（开发模式）
    // 或者直接用 electron . 启动（生产模式）
    electronProcess = spawn('pnpm', ['electron:dev'], {
      cwd: electronAppPath,
      detached: true,
      stdio: 'ignore',
      shell: true,
    });

    // 允许父进程独立退出
    electronProcess.unref();

    // 监听退出
    electronProcess.on('exit', (code) => {
      console.log('[Bridge] Electron exited with code:', code);
      electronProcess = null;
    });

    console.log('[Bridge] Electron started, PID:', electronProcess.pid);
  } catch (error) {
    console.error('[Bridge] Failed to start Electron:', error);
    electronProcess = null;
  }
}

// ============================================================
// 状态持久化
// ============================================================

function getStatePath(worktree: string): string {
  return join(worktree, GAMIFY_DIR, STATE_FILE);
}

function ensureGamifyDir(worktree: string): void {
  const dir = join(worktree, GAMIFY_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadExistingState(worktree: string): Partial<InternalState> | null {
  const path = getStatePath(worktree);
  if (!existsSync(path)) return null;

  try {
    const content = readFileSync(path, 'utf-8');
    const data = JSON.parse(content) as BridgeState;
    return {
      counters: data.counters,
    };
  } catch {
    return null;
  }
}

function writeBridgeState(): void {
  if (!state.worktree) return;

  ensureGamifyDir(state.worktree);

  const bridgeState: BridgeState = {
    v: 1,
    updatedAt: new Date().toISOString(),
    project: { worktree: state.worktree },
    session: state.session,
    counters: state.counters,
  };

  const path = getStatePath(state.worktree);
  const tempPath = `${path}.tmp`;

  // 原子写入：先写临时文件再重命名
  writeFileSync(tempPath, JSON.stringify(bridgeState, null, 2), 'utf-8');

  // Windows 上 rename 可能失败，改用覆盖写
  writeFileSync(path, JSON.stringify(bridgeState, null, 2), 'utf-8');

  state.lastWriteTime = Date.now();

  // 尝试自动启动 Electron
  autoStartElectron();
}

function debouncedWrite(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    writeBridgeState();
    debounceTimer = null;
  }, DEBOUNCE_MS);
}

// ============================================================
// 事件处理器
// ============================================================

function handleSessionCreated(payload: SessionCreatedPayload): void {
  const now = new Date().toISOString();

  state.session = {
    id: payload.sessionId,
    busy: false,
    idle: true,
    openTodos: 0,
    doneTodos: 0,
    totalTodos: 0,
    conversationStartedAt: now,
  };

  debouncedWrite();
}

function handleSessionStatus(payload: SessionStatusPayload): void {
  if (!state.session || state.session.id !== payload.sessionId) return;

  state.session.busy = payload.busy;
  state.session.idle = payload.idle;

  if (payload.busy) {
    state.session.lastAssistantMessageAt = new Date().toISOString();
  }

  debouncedWrite();
}

function handleSessionIdle(payload: SessionIdlePayload): void {
  if (!state.session || state.session.id !== payload.sessionId) return;

  // 对话结束，增加计数器
  state.counters.conversationsCompletedTotal += 1;

  // 清空会话
  state.session = null;

  debouncedWrite();
}

function handleTodoUpdated(payload: TodoUpdatedPayload): void {
  if (!state.session || state.session.id !== payload.sessionId) return;

  const todos = payload.todos;
  const openTodos = todos.filter(t => t.status === 'open').length;
  const doneTodos = todos.filter(t => t.status === 'done').length;

  // 计算新增完成的 todo 数量
  const prevDoneTodos = state.session.doneTodos;
  const newlyDone = Math.max(0, doneTodos - prevDoneTodos);

  // 更新 session
  state.session.openTodos = openTodos;
  state.session.doneTodos = doneTodos;
  state.session.totalTodos = todos.length;

  // 更新累计计数器
  state.counters.todosCompletedTotal += newlyDone;

  debouncedWrite();
}

// ============================================================
// 插件入口
// ============================================================

/**
 * OpenCode 插件 event hook
 * 
 * @param name 事件名称
 * @param payload 事件负载
 * @param ctx OpenCode 上下文
 */
export function event<T extends EventName>(
  name: T,
  payload: EventPayload[T],
  ctx: OpenCodeContext
): void {
  // 初始化 worktree
  if (!state.worktree && ctx.cwd) {
    state.worktree = ctx.cwd;

    // 尝试加载现有状态
    const existing = loadExistingState(ctx.cwd);
    if (existing?.counters) {
      state.counters = existing.counters;
    }
  }

  // 分发事件
  switch (name) {
    case 'session.created':
      handleSessionCreated(payload as SessionCreatedPayload);
      break;
    case 'session.status':
      handleSessionStatus(payload as SessionStatusPayload);
      break;
    case 'session.idle':
      handleSessionIdle(payload as SessionIdlePayload);
      break;
    case 'todo.updated':
      handleTodoUpdated(payload as TodoUpdatedPayload);
      break;
  }
}

/**
 * 插件元信息
 */
export const meta = {
  name: 'opencode-buddy-bridge',
  version: '0.1.0',
  description: 'OpenCode Buddy 桥接插件',
};
