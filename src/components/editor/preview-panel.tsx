"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const RENDER_DEBOUNCE_MS = 400;

interface SelectorProbe {
  sel: string;
  matchCount: number;
}

interface PreviewPanelProps {
  htmlCode: string;
  cssCode: string;
  relevantProps?: string[];
  trigger?: "auto" | "manual";
  onRender?: (data: {
    trigger: "auto" | "manual";
    domHash: string;
    styleHash: string;
    changedFromPrev: boolean;
  }) => void;
  onSelectorProbe?: (data: { selectors: SelectorProbe[] }) => void;
  onVisualDiff?: (data: {
    changedNodeCount: number;
    changedPropCount: number;
  }) => void;
  onConsoleError?: (data: {
    message: string;
    signature: string;
    line: number | null;
    seen: boolean;
  }) => void;
}

function hashString(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function errorSignature(msg: string): string {
  const normalized = msg.replace(/\d+/g, "N");
  return hashString(normalized);
}

export function PreviewPanel({
  htmlCode,
  cssCode,
  relevantProps = [],
  trigger = "auto",
  onRender,
  onSelectorProbe,
  onVisualDiff,
  onConsoleError,
}: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStyleHashRef = useRef<string>("");
  const prevComputedRef = useRef<Map<string, string>>(new Map());
  const [hasError, setHasError] = useState(false);

  const renderPreview = useCallback(
    (trig: "auto" | "manual") => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const doc = iframe.contentDocument;
      if (!doc) return;

      const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${cssCode}</style></head>
<body>${htmlCode}</body>
</html>`;

      doc.open();
      doc.write(fullHtml);
      doc.close();

      setHasError(false);

      setTimeout(() => {
        try {
          const body = doc.body;
          if (!body) return;

          const domHash = hashString(body.innerHTML);

          const computedMap = new Map<string, string>();
          const allElements = body.querySelectorAll("*");
          for (const el of allElements) {
            const computed = doc.defaultView?.getComputedStyle(el);
            if (!computed) continue;
            for (const prop of relevantProps) {
              const key = `${el.tagName}.${prop}`;
              computedMap.set(key, computed.getPropertyValue(prop));
            }
          }

          const styleEntries = Array.from(computedMap.entries())
            .sort()
            .map(([k, v]) => `${k}:${v}`)
            .join("|");
          const styleHash = hashString(styleEntries);

          const changedFromPrev = styleHash !== prevStyleHashRef.current;

          onRender?.({
            trigger: trig,
            domHash,
            styleHash,
            changedFromPrev,
          });

          let changedNodeCount = 0;
          let changedPropCount = 0;
          if (prevComputedRef.current.size > 0) {
            for (const [key, val] of computedMap) {
              const prev = prevComputedRef.current.get(key);
              if (prev !== val) {
                changedPropCount++;
                const node = key.split(".")[0];
                if (!computedMap.has(`_counted_${node}`)) {
                  changedNodeCount++;
                  computedMap.set(`_counted_${node}`, "1");
                }
              }
            }
            onVisualDiff?.({ changedNodeCount, changedPropCount });
          }

          prevStyleHashRef.current = styleHash;
          prevComputedRef.current = computedMap;

          const selectors = extractSelectors(cssCode);
          const probes: SelectorProbe[] = selectors.map((sel) => {
            try {
              const matchCount = body.querySelectorAll(sel).length;
              return { sel, matchCount };
            } catch {
              return { sel, matchCount: 0 };
            }
          });
          if (probes.length > 0) {
            onSelectorProbe?.({ selectors: probes });
          }
        } catch {
          // render inspection failed silently
        }
      }, 50);
    },
    [cssCode, htmlCode, relevantProps, onRender, onSelectorProbe, onVisualDiff]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      renderPreview(trigger);
    }, RENDER_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [htmlCode, cssCode, trigger, renderPreview]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const win = iframe.contentWindow as (Window & typeof globalThis) | null;
      if (!win) return;
      const origError = win.console.error;
      win.console.error = (...args: unknown[]) => {
        const msg = args.map(String).join(" ");
        setHasError(true);
        onConsoleError?.({
          message: msg,
          signature: errorSignature(msg),
          line: null,
          seen: false,
        });
        origError.apply(win.console, args);
      };
    };

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [onConsoleError]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-paper-dim border-b border-line">
        <span className="text-[12px] font-mono text-text-dim">Preview</span>
        <div className="flex items-center gap-2">
          {hasError && (
            <span className="text-[11px] text-rust font-mono">error</span>
          )}
          <button
            onClick={() => renderPreview("manual")}
            className="text-[11px] px-2 py-0.5 border border-line bg-white text-text-dim font-sans cursor-pointer hover:border-pcb hover:text-pcb"
          >
            Refresh
          </button>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        className="flex-1 w-full bg-white border-none"
        title="Preview"
      />
    </div>
  );
}

function extractSelectors(css: string): string[] {
  const sels: string[] = [];
  const re = /([^{}@]+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const raw = m[1].trim();
    if (raw.startsWith("@") || raw.includes("keyframes")) continue;
    for (const s of raw.split(",")) {
      const trimmed = s.trim();
      if (trimmed && !trimmed.startsWith(":root")) {
        sels.push(trimmed);
      }
    }
  }
  return sels;
}
