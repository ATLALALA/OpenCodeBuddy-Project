/**
 * BridgeState - OpenCode 桥接状态协议
 * 
 * 由 OpenCode 插件写入 .opencode/gamify/state.json，
 * Electron 应用监听该文件并解析状态。
 */

/** 会话信息 */
export interface SessionInfo {
  /** 会话 ID */
  id: string;
  /** 是否正忙（AI 正在生成） */
  busy: boolean;
  /** 是否空闲 */
  idle: boolean;
  /** 未完成的 todo 数量 */
  openTodos: number;
  /** 已完成的 todo 数量 */
  doneTodos: number;
  /** todo 总数 */
  totalTodos: number;
  /** 对话开始时间 (ISO 时间戳) */
  conversationStartedAt: string;
  /** 最后用户消息时间 (ISO 时间戳) */
  lastUserMessageAt?: string;
  /** 最后助手消息时间 (ISO 时间戳) */
  lastAssistantMessageAt?: string;
}

/** 累计计数器 */
export interface Counters {
  /** 累计完成的 todo 总数 */
  todosCompletedTotal: number;
  /** 累计完成的对话总数 */
  conversationsCompletedTotal: number;
}

/** 项目信息 */
export interface ProjectInfo {
  /** 工作区路径 */
  worktree: string;
}

/** 桥接状态（OpenCode -> Electron） */
export interface BridgeState {
  /** 协议版本 */
  v: 1;
  /** 更新时间 (ISO 时间戳) */
  updatedAt: string;
  /** 项目信息 */
  project: ProjectInfo;
  /** 当前会话（无会话时为 null） */
  session: SessionInfo | null;
  /** 累计计数器 */
  counters: Counters;
}

/** 工作状态枚举 */
export type WorkState = 'idle' | 'busy' | 'no_session';

/**
 * 从 BridgeState 派生工作状态
 */
export function deriveWorkState(state: BridgeState): WorkState {
  if (!state.session) return 'no_session';
  if (state.session.busy) return 'busy';
  return 'idle';
}
