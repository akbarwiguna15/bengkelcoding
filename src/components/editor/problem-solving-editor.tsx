"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { CodeMirrorEditor } from "./codemirror-editor";
import { PreviewPanel } from "./preview-panel";
import { useEventRecorder } from "@/hooks/use-event-recorder";
import { flushBuffer } from "@/lib/event-buffer";

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
  const attemptId = useRef(
    `${soalId}_${studentId}_${Date.now().toString(36)}`
  ).current;

  const [code, setCode] = useState(starterCode);
  const [lintErrors, setLintErrors] = useState<
    { line: number; message: string }[]
  >([]);
  const [handRaised, setHandRaised] = useState(false);

  const { record } = useEventRecorder({
    studentId,
    classId,
    taskId: soalId,
    attemptId,
  });

  useEffect(() => {
    record("attempt_open", {
      regime,
      difficulty: "unknown",
      model: "PROBLEM_SOLVING",
    });
    return () => {
      record("attempt_close", { reason: "back" });
      flushBuffer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);

      if (language === "css") {
        const errors: { line: number; message: string }[] = [];
        const lines = newCode.split("\n");
        lines.forEach((line, i) => {
          const trimmed = line.trim();
          if (
            trimmed &&
            !trimmed.startsWith("/*") &&
            !trimmed.startsWith("*") &&
            !trimmed.startsWith("//") &&
            !trimmed.endsWith("{") &&
            !trimmed.endsWith("}") &&
            !trimmed.endsWith(";") &&
            trimmed.includes(":")
          ) {
            errors.push({
              line: i + 1,
              message: `Baris ${i + 1}: missing semicolon`,
            });
          }
          const propMatch = trimmed.match(/^\s*([\w-]+)\s*:/);
          if (propMatch) {
            const prop = propMatch[1];
            const knownProps = [
              "display","flex-direction","justify-content","align-items",
              "gap","margin","padding","width","height","color",
              "background","background-color","border","font-size",
              "font-family","font-weight","text-align","position",
              "top","right","bottom","left","grid-template-columns",
              "grid-template-rows","flex-wrap","flex","order",
              "align-self","min-width","max-width","min-height",
              "max-height","overflow","opacity","z-index",
              "border-radius","box-shadow","transition","transform",
              "line-height","letter-spacing","text-decoration",
              "list-style","cursor","visibility",
            ];
            if (!knownProps.includes(prop)) {
              errors.push({
                line: i + 1,
                message: `Baris ${i + 1}: properti "${prop}" tidak dikenali`,
              });
            }
          }
        });
        setLintErrors(errors);
        if (errors.length > 0) {
          record("lint_result", {
            errors: errors.map((e) => ({
              line: e.line,
              code: "unknown-prop",
              message: e.message,
            })),
          });
        }
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
      seen: boolean;
    }) => {
      record("console_error", data);
    },
    [record]
  );

  const handleSubmit = useCallback(() => {
    record("submit", {});
  }, [record]);

  const handleRaiseHand = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    if (next) {
      record("hand_raise", {});
    } else {
      record("hand_lower", { by: "student" });
    }
  }, [handRaised, record]);

  const handleClose = useCallback(() => {
    record("attempt_close", { reason: "back" });
    flushBuffer();
    onClose();
  }, [record, onClose]);

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
                className="bg-copper text-white border-none px-3 py-1 text-[12px] font-sans cursor-pointer hover:opacity-85"
              >
                Kirim jawaban
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
              relevantProps={relevantProps}
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
