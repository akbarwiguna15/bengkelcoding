"use client";

import { useCallback, useEffect, useRef } from "react";
import { bufferEvent, startAutoFlush, stopAutoFlush } from "@/lib/event-buffer";
import type { EventType, StudentEventRecord } from "@/types/events";

interface RecorderContext {
  studentId: string;
  classId: string;
  taskId: string;
  attemptId: string;
}

export function useEventRecorder(ctx: RecorderContext | null) {
  const seqRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleStartRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTimeRef = useRef(0);
  const lastActivityRef = useRef(Date.now());

  const IDLE_THRESHOLD_MS = 45_000;
  const HEARTBEAT_INTERVAL_MS = 30_000;

  const record = useCallback(
    (type: EventType, payload: Record<string, unknown> = {}) => {
      if (!ctx) return;
      const event: StudentEventRecord = {
        studentId: ctx.studentId,
        classId: ctx.classId,
        taskId: ctx.taskId,
        attemptId: ctx.attemptId,
        type,
        payload,
        clientTs: new Date().toISOString(),
        seq: seqRef.current++,
      };
      bufferEvent(event);
    },
    [ctx]
  );

  const resetIdleTimer = useCallback(() => {
    if (!ctx) return;

    if (idleStartRef.current !== null) {
      const duration = Date.now() - idleStartRef.current;
      record("idle_end", { durationMs: duration });
      idleStartRef.current = null;
    }

    lastActivityRef.current = Date.now();

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      idleStartRef.current = Date.now();
      record("idle_start", { durationMs: 0 });
    }, IDLE_THRESHOLD_MS);
  }, [ctx, record]);

  useEffect(() => {
    if (!ctx) return;

    startAutoFlush();

    heartbeatRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      activeTimeRef.current += Math.min(elapsed, HEARTBEAT_INTERVAL_MS);
      record("session_heartbeat", { activeMs: activeTimeRef.current });
    }, HEARTBEAT_INTERVAL_MS);

    const onActivity = () => resetIdleTimer();
    window.addEventListener("keydown", onActivity);
    window.addEventListener("mousedown", onActivity);
    window.addEventListener("click", onActivity);

    resetIdleTimer();

    return () => {
      stopAutoFlush();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("mousedown", onActivity);
      window.removeEventListener("click", onActivity);
    };
  }, [ctx, record, resetIdleTimer]);

  return { record, resetIdleTimer };
}
