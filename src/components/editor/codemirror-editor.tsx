"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { autocompletion } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";

const EDIT_AGGREGATE_MS = 5_000;
const PASTE_LARGE_THRESHOLD = 120;
const SNAPSHOT_INTERVAL_MS = 60_000;

interface EditAggregation {
  charsAdded: number;
  charsRemoved: number;
  linesTouched: Set<number>;
  propsTouched: Set<string>;
}

function extractCSSProps(text: string): string[] {
  const propRe = /^\s*([\w-]+)\s*:/gm;
  const props: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = propRe.exec(text)) !== null) {
    props.push(m[1]);
  }
  return props;
}

const bengkelTheme = EditorView.theme({
  "&": {
    backgroundColor: "#16241f",
    color: "#d7e6dd",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "13px",
    height: "100%",
  },
  ".cm-content": {
    caretColor: "#d7e6dd",
    lineHeight: "1.9",
    padding: "8px 0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#d7e6dd",
    borderLeftWidth: "2px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(46,107,78,0.35)",
  },
  ".cm-gutters": {
    backgroundColor: "#0f1a15",
    color: "#5c7768",
    border: "none",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    minWidth: "36px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(46,107,78,0.4)",
    outline: "none",
  },
});

interface CodeMirrorEditorProps {
  initialCode: string;
  language: "css" | "html" | "javascript";
  fileName: string;
  onChange?: (code: string) => void;
  onEdit?: (agg: {
    charsAdded: number;
    charsRemoved: number;
    linesTouched: number[];
    propsTouched: string[];
    file: string;
  }) => void;
  onSnapshot?: (data: { file: string; content: string; hash: string }) => void;
  onPasteLarge?: (data: { chars: number; file: string }) => void;
}

export function CodeMirrorEditor({
  initialCode,
  language,
  fileName,
  onChange,
  onEdit,
  onSnapshot,
  onPasteLarge,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const aggRef = useRef<EditAggregation>({
    charsAdded: 0,
    charsRemoved: 0,
    linesTouched: new Set(),
    propsTouched: new Set(),
  });
  const aggTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flushAgg = useCallback(() => {
    const agg = aggRef.current;
    if (agg.charsAdded === 0 && agg.charsRemoved === 0) return;

    onEdit?.({
      charsAdded: agg.charsAdded,
      charsRemoved: agg.charsRemoved,
      linesTouched: Array.from(agg.linesTouched),
      propsTouched: Array.from(agg.propsTouched),
      file: fileName,
    });

    aggRef.current = {
      charsAdded: 0,
      charsRemoved: 0,
      linesTouched: new Set(),
      propsTouched: new Set(),
    };
  }, [onEdit, fileName]);

  const takeSnapshot = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const content = view.state.doc.toString();
    const hash = simpleHash(content);
    onSnapshot?.({ file: fileName, content, hash });
  }, [onSnapshot, fileName]);

  useEffect(() => {
    if (!containerRef.current) return;

    const langExtension =
      language === "css"
        ? css()
        : language === "html"
          ? html()
          : javascript();

    const state = EditorState.create({
      doc: initialCode,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        langExtension,
        autocompletion(),
        highlightSelectionMatches(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        bengkelTheme,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;

          const doc = update.state.doc.toString();
          onChange?.(doc);

          update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
            const removed = toA - fromA;
            const added = inserted.length;

            aggRef.current.charsAdded += added;
            aggRef.current.charsRemoved += removed;

            const line = update.state.doc.lineAt(fromA).number;
            aggRef.current.linesTouched.add(line);

            if (language === "css") {
              const newText = inserted.toString();
              for (const p of extractCSSProps(newText)) {
                aggRef.current.propsTouched.add(p);
              }
            }

            if (added > PASTE_LARGE_THRESHOLD && removed === 0) {
              onPasteLarge?.({ chars: added, file: fileName });
            }
          });
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    aggTimerRef.current = setInterval(flushAgg, EDIT_AGGREGATE_MS);
    snapTimerRef.current = setInterval(takeSnapshot, SNAPSHOT_INTERVAL_MS);

    return () => {
      flushAgg();
      takeSnapshot();
      view.destroy();
      viewRef.current = null;
      if (aggTimerRef.current) clearInterval(aggTimerRef.current);
      if (snapTimerRef.current) clearInterval(snapTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-hidden"
      style={{ minHeight: 200 }}
    />
  );
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash + c) | 0;
  }
  return hash.toString(36);
}
