/**
 * OpenCode Buddy Bridge Plugin
 * 
 * 使用 @opencode-ai/plugin SDK，将 session/todo 状态写入 .opencode/gamify/state.json
 * 
 * 安装方式：
 * 1. 构建：pnpm --filter bridge-plugin build
 * 2. 在目标项目的 .opencode/opencode.json 中添加：
 *    "plugin": ["./path/to/bridge-plugin/dist/index.js"]
 * 
 * 或者将整个 bridge-plugin dist 目录复制到 .opencode/plugin/ 文件夹中
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tool } from '@opencode-ai/plugin';
import type { Plugin, ToolContext } from '@opencode-ai/plugin';
import type { BridgeState, SessionInfo, Counters } from '@opencode-buddy/shared';

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

  writeFileSync(path, JSON.stringify(bridgeState, null, 2), 'utf-8');

  state.lastWriteTime = Date.now();
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
// 事件处理
// ============================================================

function handleEvent(eventType: string, eventData: unknown): void {
  // 根据事件类型更新状态
  switch (eventType) {
    case 'session.started':
      state.session = {
        id: `session-${Date.now()}`,
        busy: false,
        idle: true,
        openTodos: 0,
        doneTodos: 0,
        totalTodos: 0,
        conversationStartedAt: new Date().toISOString(),
      };
      break;

    case 'session.ended':
      if (state.session) {
        state.counters.conversationsCompletedTotal += 1;
        state.session = null;
      }
      break;

    case 'message.user':
      if (!state.session) {
        state.session = {
          id: `session-${Date.now()}`,
          busy: true,
          idle: false,
          openTodos: 0,
          doneTodos: 0,
          totalTodos: 0,
          conversationStartedAt: new Date().toISOString(),
        };
      } else {
        state.session.busy = true;
        state.session.idle = false;
      }
      break;

    case 'message.assistant':
      if (state.session) {
        state.session.busy = false;
        state.session.idle = true;
        state.session.lastAssistantMessageAt = new Date().toISOString();
      }
      break;
  }

  debouncedWrite();
}

// ============================================================
// 插件入口
// ============================================================

const OpenCodeBuddyPlugin: Plugin = async ({ directory }) => {
  // 初始化 worktree
  state.worktree = directory;

  // 尝试加载现有状态
  const existing = loadExistingState(directory);
  if (existing?.counters) {
    state.counters = existing.counters;
  }

  console.log(`[OpenCode Buddy] Plugin initialized for: ${directory}`);

  return {
    // 监听所有事件
    event: async ({ event }) => {
      handleEvent(event.type, event);
    },

    // 提供自定义工具
    tool: {
      // 手动完成 todo 的工具
      gamify_complete_todo: tool({
        description: '标记一个 todo 为完成，触发游戏奖励',
        args: {
          todoId: tool.schema.string().describe('Todo 的 ID'),
          reward: tool.schema.number().optional().describe('可选的额外奖励倍数'),
        },
        async execute(args: { todoId: string; reward?: number }, _ctx: ToolContext) {
          if (state.session) {
            state.session.doneTodos += 1;
            state.counters.todosCompletedTotal += 1;
          }

          debouncedWrite();

          return `✅ Todo ${args.todoId} 已完成！累计完成: ${state.counters.todosCompletedTotal}`;
        },
      }),

      // 获取当前游戏状态
      gamify_get_status: tool({
        description: '获取当前游戏化状态',
        args: {},
        async execute() {
          const status = state.session
            ? `会话中 | Todo: ${state.session.doneTodos}/${state.session.totalTodos} | ${state.session.busy ? '工作中' : '空闲'}`
            : '无会话';

          return `🎮 状态: ${status}\n📊 累计: ${state.counters.todosCompletedTotal} todos | ${state.counters.conversationsCompletedTotal} 对话`;
        },
      }),
    },
  };
};

export default OpenCodeBuddyPlugin;
