export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "GURU" | "SISWA";
}

export interface TestResult {
  testCaseId: string;
  label: string | null;
  passed: boolean;
  actual: string;
  expected: string;
  error?: string;
}

export interface RunResult {
  testResults: TestResult[];
  score: number;
  testsPassed: number;
  testsTotal: number;
}

export interface LintError {
  line: number;
  message: string;
  severity: "error" | "warning";
  conceptTag?: string;
}

export interface HintPayload {
  id: string;
  senderId: string;
  senderName: string;
  soalId: string;
  message: string;
  createdAt: string;
}

export type StudentActivityStatusType =
  | "IDLE"
  | "TYPING"
  | "RUNNING"
  | "STUCK"
  | "SUBMITTED";

export interface StudentStatusData {
  userId: string;
  userName: string;
  soalId: string | null;
  status: StudentActivityStatusType;
  lastEventAt: string;
  stuckMinutes?: number;
}

export interface ErrorPatternData {
  conceptTagId: string;
  conceptTagName: string;
  count: number;
  total: number;
  percentage: number;
}

export interface SyncMutation {
  id: string;
  method: "POST" | "PATCH" | "DELETE";
  url: string;
  body: unknown;
  clientTs: string;
}

export interface SyncResult {
  mutationId: string;
  success: boolean;
  conflictResolution?: "client_wins" | "server_wins" | "merged";
  error?: string;
}
