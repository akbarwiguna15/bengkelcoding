export type EventType =
  // Lifecycle
  | "attempt_open"
  | "attempt_close"
  | "session_heartbeat"
  // Code editing
  | "code_edit"
  | "code_snapshot"
  | "paste_large"
  | "idle_start"
  | "idle_end"
  // Render & effect (silent regime)
  | "preview_render"
  | "selector_probe"
  | "visual_diff"
  // Error & result
  | "lint_result"
  | "console_error"
  | "server_response"
  | "submit"
  | "submit_result"
  // Interaction (ground truth)
  | "hand_raise"
  | "hand_lower"
  | "hint_sent"
  | "hint_open"
  | "hint_response"
  | "spotlight"
  | "teacher_flag";

export interface StudentEventRecord {
  studentId: string;
  classId: string;
  taskId: string;
  attemptId: string;
  type: EventType;
  payload: Record<string, unknown>;
  clientTs: string; // ISO 8601
  seq: number;
}

export interface BufferedEvent extends StudentEventRecord {
  bufferId?: number; // IndexedDB auto-increment key
  sent?: number; // 0 = unsent, 1 = sent (number for IDB index compatibility)
}
