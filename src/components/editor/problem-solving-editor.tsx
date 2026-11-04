"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { CodeMirrorEditor } from "./codemirror-editor";
import { PreviewPanel } from "./preview-panel";
import { useEventRecorder } from "@/hooks/use-event-recorder";
import { flushBuffer } from "@/lib/event-buffer";

import { cssLanguage } from "@codemirror/lang-css";
import { Text } from "@codemirror/state";

const cssParser = cssLanguage.parser;

interface ProblemSolvingEditorProps {
  soalId: string;
  title: string;
  instructions: string;
  criteria: string[];
  starterCode: string;
  starterHtml: string;
  language: "css" | "html" | "javascript";
  fileName: string;
  regime: "silent" | "verbose";
  relevantProps?: string[];
  studentId: string;
  classId: string;
  onClose: () => void;
}

interface CssTestResult {
  testCaseId: string;
  label: string;
  passed: boolean;
  actual: string;
  expected: string;
}

function evaluateCssInIframe(
  html: string,
  css: string,
  testCases: { id: string; label: string; input: string; expected: string }[]
): Promise<CssTestResult[]> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;width:1024px;height:768px;border:none;";
    iframe.sandbox.add("allow-same-origin");
    document.body.appendChild(iframe);

    const timeout = setTimeout(() => {
      document.body.removeChild(iframe);
      resolve(testCases.map((tc) => ({
        testCaseId: tc.id, label: tc.label, passed: false, actual: "", expected: tc.expected,
      })));
    }, 3000);

    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) throw new Error("no document");
        const results: CssTestResult[] = [];
        for (const tc of testCases) {
          const match = tc.input.match(/^([^{]+)\{\s*([^}\s]+)\s*\}$/);
          if (!match) {
            results.push({ testCaseId: tc.id, label: tc.label, passed: false, actual: "parse error", expected: tc.expected });
            continue;
          }
          const selector = match[1].trim();
          const property = match[2].trim();
          const el = doc.querySelector(selector);
          if (!el) {
            results.push({ testCaseId: tc.id, label: tc.label, passed: false, actual: "element not found", expected: tc.expected });
            continue;
          }
          const computed = iframe.contentWindow!.getComputedStyle(el);
          const actual = computed.getPropertyValue(property).trim();
          results.push({
            testCaseId: tc.id, label: tc.label,
            passed: actual === tc.expected,
            actual, expected: tc.expected,
          });
        }
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        resolve(results);
      } catch {
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        resolve(testCases.map((tc) => ({
          testCaseId: tc.id, label: tc.label, passed: false, actual: "error", expected: tc.expected,
        })));
      }
    };

    const srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
    iframe.srcdoc = srcdoc;
  });
}

export function ProblemSolvingEditor({
  soalId,
  title,
  instructions,
  criteria,
  starterCode,
  starterHtml,
  language,
  fileName,
  regime,
  relevantProps = [],
  studentId,
  classId,
  onClose,
}: ProblemSolvingEditorProps) {
  const [attemptId] = useState(
    () => `${soalId}_${studentId}_${Date.now().toString(36)}`
  );

  const [code, setCode] = useState(starterCode);
  const [lintErrors, setLintErrors] = useState<
    { line: number; message: string }[]
  >([]);
  const [handRaised, setHandRaised] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    passed: number;
    total: number;
    score: number;
    failedCriteria: string[];
    details: { label: string; passed: boolean }[];
  } | null>(null);

  const { record } = useEventRecorder(studentId, classId, soalId, attemptId);

  const lintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLintSigRef = useRef("");
  const closeSentRef = useRef(false);

  useEffect(() => {
    record("attempt_open", {
      regime,
      difficulty: "unknown",
      model: "PROBLEM_SOLVING",
    });

    const onPageHide = () => {
      if (closeSentRef.current) return;
      closeSentRef.current = true;
      const payload = {
        events: [{
          studentId,
          classId,
          taskId: soalId,
          attemptId,
          type: "attempt_close",
          payload: { reason: "pagehide" },
          clientTs: new Date().toISOString(),
          seq: -1,
        }],
      };
      navigator.sendBeacon?.(
        "/api/events",
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (!closeSentRef.current) {
        closeSentRef.current = true;
        record("attempt_close", { reason: "unmount" });
      }
      if (lintTimerRef.current) clearTimeout(lintTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);

      if (language === "css") {
        if (lintTimerRef.current) clearTimeout(lintTimerRef.current);
        lintTimerRef.current = setTimeout(() => {
          const errors: { line: number; message: string }[] = [];
          const tree = cssParser.parse(newCode);
          const doc = Text.of(newCode.split("\n"));
          const errorLines = new Set<number>();

          tree.iterate({
            enter(node) {
              if (
                node.name === "PropertyName" &&
                node.node.parent?.name === "Declaration"
              ) {
                const prop = newCode.slice(node.from, node.to);
                if (!CSS.supports(prop, "initial")) {
                  const line = doc.lineAt(node.from).number;
                  errors.push({
                    line,
                    message: `Baris ${line}: properti "${prop}" tidak dikenali`,
                  });
                }
              }
              if (node.name === "⚠") {
                const pos = Math.min(node.from, doc.length - 1);
                const line = doc.lineAt(pos).number;
                if (errorLines.has(line)) return;
                const trimmed = doc.line(line).text.trim();
                if (!trimmed || trimmed === "{" || trimmed === "}") return;
                errorLines.add(line);
                const parent = node.node.parent;
                if (parent?.name === "ImportStatement") {
                  errors.push({
                    line,
                    message: `Baris ${line}: blok CSS tidak lengkap`,
                  });
                } else {
                  errors.push({
                    line,
                    message: `Baris ${line}: missing semicolon`,
                  });
                }
              }
            },
          });
          setLintErrors(errors);
          if (errors.length > 0) {
            const sig = errors.map((e) => `${e.line}:${e.message}`).join("|");
            if (sig !== lastLintSigRef.current) {
              lastLintSigRef.current = sig;
              record("lint_result", {
                errors: errors.map((e) => ({
                  line: e.line,
                  code: "unknown-prop",
                  message: e.message,
                })),
              });
            }
          } else {
            lastLintSigRef.current = "";
          }
        }, 700);
      }
    },
    [language, record]
  );

  const handleEdit = useCallback(
    (agg: {
      charsAdded: number;
      charsRemoved: number;
      linesTouched: number[];
      propsTouched: string[];
      file: string;
    }) => {
      record("code_edit", agg);
    },
    [record]
  );

  const handleSnapshot = useCallback(
    (data: { file: string; content: string; hash: string }) => {
      record("code_snapshot", data);
    },
    [record]
  );

  const handlePasteLarge = useCallback(
    (data: { chars: number; file: string }) => {
      record("paste_large", data);
    },
    [record]
  );

  const handlePreviewRender = useCallback(
    (data: {
      trigger: "auto" | "manual";
      domHash: string;
      styleHash: string;
      changedFromPrev: boolean;
    }) => {
      if (!data.changedFromPrev && data.trigger === "auto") return;
      record("preview_render", data);
    },
    [record]
  );

  const handleSelectorProbe = useCallback(
    (data: { selectors: { sel: string; matchCount: number }[] }) => {
      record("selector_probe", data);
    },
    [record]
  );

  const handleVisualDiff = useCallback(
    (data: { changedNodeCount: number; changedPropCount: number }) => {
      record("visual_diff", data);
    },
    [record]
  );

  const handleConsoleError = useCallback(
    (data: {
      message: string;
      signature: string;
      line: number | null;
      repeated: boolean;
      seen: boolean;
    }) => {
      record("console_error", data);
    },
    [record]
  );

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitResult(null);
    record("submit", {});

    try {
      const subRes = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soalId }),
      });
      if (!subRes.ok) throw new Error("Gagal membuat submission");
      const submission = await subRes.json();

      let result: { testResults: { passed: boolean; label: string }[]; score: number; testsPassed: number; testsTotal: number };

      if (language === "css" || language === "html") {
        const tcRes = await fetch(`/api/soal/${soalId}`);
        if (!tcRes.ok) throw new Error("Gagal memuat test case");
        const soalData = await tcRes.json();
        const testCases: { id: string; label: string; input: string; expected: string }[] =
          (soalData.testCases ?? []).map((tc: { id: string; label?: string; input: string; expected: string }) => ({
            id: tc.id, label: tc.label ?? "", input: tc.input, expected: tc.expected,
          }));

        const cssResults = await evaluateCssInIframe(starterHtml, code, testCases);

        const runRes = await fetch(`/api/submissions/${submission.id}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, cssResults }),
        });
        if (!runRes.ok) throw new Error("Gagal menyimpan hasil");
        result = await runRes.json();
      } else {
        const runRes = await fetch(`/api/submissions/${submission.id}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!runRes.ok) throw new Error("Gagal menjalankan test");
        result = await runRes.json();
      }

      const passed: number = result.testsPassed ?? 0;
      const total: number = result.testsTotal ?? 0;
      const allTests: { passed: boolean; label: string }[] = result.testResults ?? [];
      const failedCriteria: string[] = allTests
        .filter((t) => !t.passed)
        .map((t) => t.label);
      const details = allTests.map((t) => ({ label: t.label, passed: t.passed }));

      setSubmitResult({ passed, total, score: result.score ?? 0, failedCriteria, details });
      record("submit_result", { passed, total, failedCriteria });
    } catch {
      setSubmitResult({ passed: 0, total: 0, score: 0, failedCriteria: ["Gagal mengirim"], details: [] });
    } finally {
      setSubmitting(false);
    }
  }, [submitting, code, soalId, language, starterHtml, record]);

  const handleRaiseHand = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    if (next) {
      record("hand_raise", {});
    } else {
      record("hand_lower", { by: "student" });
    }
  }, [handRaised, record]);

  const handleClose = useCallback(async () => {
    if (!closeSentRef.current) {
      closeSentRef.current = true;
      await record("attempt_close", { reason: "back" });
      await flushBuffer();
    }
    onClose();
  }, [onClose, record]);

  const stableRelevantProps = useMemo(
    () => relevantProps,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [relevantProps.join(",")]
  );

  const isSilent = regime === "silent";

  return (
    <div className="mt-4 border border-line overflow-hidden">
      {handRaised && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-soft border-b border-amber">
          <span className="text-[16px] animate-pulse-slow">✋</span>
          <span className="text-[12.5px] text-amber font-medium">
            Tangan diangkat — guru akan melihat permintaan bantuanmu.
          </span>
          <button
            onClick={handleRaiseHand}
            className="ml-auto text-[11px] px-2.5 py-1 border border-amber text-amber bg-transparent font-sans cursor-pointer hover:bg-amber hover:text-white"
          >
            Turunkan
          </button>
        </div>
      )}

      <div
        className="grid h-[480px]"
        style={{
          gridTemplateColumns: isSilent
            ? "280px 1fr 1fr"
            : "280px 1fr",
        }}
      >
        {/* Instructions panel */}
        <div className="bg-white p-5 overflow-y-auto border-r border-line">
          <h2 className="text-[15px] font-semibold mb-2.5">{title}</h2>
          <p className="text-[13px] text-text-dim leading-relaxed">
            {instructions}
          </p>
          <ul className="mt-4 list-none p-0 space-y-1.5">
            {criteria.map((c, i) => (
              <li key={i} className="text-[12.5px] text-text-dim">
                ✓ {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Code editor */}
        <div className="flex flex-col bg-ink min-w-0">
          <div className="flex justify-between items-center px-3 py-2 bg-ink-soft border-b border-[#2a3b32]">
            <span className="font-mono text-[12px] text-[#9fb3a8]">
              {fileName}
            </span>
            <div className="flex gap-2 items-center">
              <button
                onClick={handleRaiseHand}
                className={`flex items-center gap-1.5 text-[12px] font-sans px-3 py-1 border cursor-pointer transition-colors ${
                  handRaised
                    ? "border-amber bg-amber text-white animate-pulse-slow"
                    : "border-[#3a4d43] text-[#9fb3a8] bg-transparent hover:border-amber hover:text-amber"
                }`}
              >
                ✋ {handRaised ? "Tangan diangkat" : "Angkat tangan"}
              </button>
              <button
                onClick={handleClose}
                className="bg-transparent border border-[#3a4d43] text-[#cfe0d6] px-3 py-1 text-[12px] font-sans cursor-pointer hover:border-pcb"
              >
                ← Daftar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`bg-copper text-white border-none px-3 py-1 text-[12px] font-sans cursor-pointer hover:opacity-85 ${submitting ? "opacity-50" : ""}`}
              >
                {submitting ? "Mengirim..." : "Kirim jawaban"}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <CodeMirrorEditor
              initialCode={starterCode}
              language={language}
              fileName={fileName}
              onChange={handleCodeChange}
              onEdit={handleEdit}
              onSnapshot={handleSnapshot}
              onPasteLarge={handlePasteLarge}
            />
          </div>

          {lintErrors.length > 0 && (
            <div className="bg-[#0f1a15] font-mono text-[12px] px-4 py-2 border-t border-[#2a3b32]">
              {lintErrors.slice(0, 3).map((err, i) => (
                <div key={i} className="text-[#e0967a]">
                  ⚠ {err.message}
                </div>
              ))}
            </div>
          )}

          {submitResult && (
            <div
              className={`font-mono text-[12px] px-4 py-2.5 border-t border-[#2a3b32] ${
                submitResult.passed === submitResult.total && submitResult.total > 0
                  ? "bg-[#0f2a1a] text-[#4aba80]"
                  : "bg-[#2a0f0f] text-[#e0967a]"
              }`}
            >
              <div className="font-semibold mb-1">
                Hasil: {submitResult.passed}/{submitResult.total} kriteria terpenuhi
                {submitResult.total > 0 && ` (${submitResult.score}%)`}
              </div>
              {submitResult.details.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {submitResult.details.map((d, i) => (
                    <div key={i} className={`text-[11px] ${d.passed ? "text-[#4aba80]" : "text-[#e0967a]"}`}>
                      {d.passed ? "✓" : "✗"} {d.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] px-4 py-1.5 bg-[#0a120e] border-t border-[#2a3b32]">
            <span className="w-1.5 h-1.5 rounded-full bg-pcb" />
            <span className="text-[#9fb3a8]">
              Tersimpan &amp; tersinkron
            </span>
          </div>
        </div>

        {/* Preview panel — only for silent regime (HTML/CSS) */}
        {isSilent && (
          <div className="border-l border-line min-w-0">
            <PreviewPanel
              htmlCode={starterHtml}
              cssCode={code}
              relevantProps={stableRelevantProps}
              onRender={handlePreviewRender}
              onSelectorProbe={handleSelectorProbe}
              onVisualDiff={handleVisualDiff}
              onConsoleError={handleConsoleError}
            />
          </div>
        )}
      </div>
    </div>
  );
}
