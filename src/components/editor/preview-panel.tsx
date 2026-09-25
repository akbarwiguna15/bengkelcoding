"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const RENDER_DEBOUNCE_MS = 400;

interface SelectorProbe {
  sel: string;
  matchCount: number;
}

interface ProbeResult {
  kind: "probe";
  domHash: string;
  styleHash: string;
  computed: Record<string, string>;
  selectors: SelectorProbe[];
}

interface ProbeError {
  kind: "error";
  message: string;
  line: number | null;
}

type ProbeMessage = ProbeResult | ProbeError;

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

function buildProbeScript(
  relevantProps: string[],
  selectors: string[]
): string {
  return `
<script>
(function(){
  var H=function(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}return h.toString(36);};

  // error capture
  var origErr=console.error;
  console.error=function(){
    var m=[].slice.call(arguments).map(String).join(" ");
    window.parent.postMessage({kind:"error",message:m,line:null},"*");
    origErr.apply(console,arguments);
  };
  window.addEventListener("error",function(e){
    window.parent.postMessage({kind:"error",message:e.message||String(e),line:e.lineno||null},"*");
  });

  // wait for layout
  setTimeout(function(){
    try{
      var body=document.body;
      if(!body)return;
      var domHash=H(body.innerHTML);

      // computed styles keyed by position index
      var props=${JSON.stringify(relevantProps)};
      var computed={};
      var els=body.querySelectorAll("*");
      for(var i=0;i<els.length;i++){
        var cs=window.getComputedStyle(els[i]);
        for(var j=0;j<props.length;j++){
          var key=i+"."+els[i].tagName+"."+props[j];
          computed[key]=cs.getPropertyValue(props[j]);
        }
      }

      var entries=[];
      var keys=Object.keys(computed).sort();
      for(var k=0;k<keys.length;k++){entries.push(keys[k]+":"+computed[keys[k]]);}
      var styleHash=H(entries.join("|"));

      // selector probes
      var sels=${JSON.stringify(selectors)};
      var probes=[];
      for(var s=0;s<sels.length;s++){
        try{probes.push({sel:sels[s],matchCount:body.querySelectorAll(sels[s]).length});}
        catch(e){probes.push({sel:sels[s],matchCount:0});}
      }

      window.parent.postMessage({
        kind:"probe",
        domHash:domHash,
        styleHash:styleHash,
        computed:computed,
        selectors:probes
      },"*");
    }catch(ex){
      window.parent.postMessage({kind:"error",message:String(ex),line:null},"*");
    }
  },60);
})();
<\/script>`;
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
  const prevComputedRef = useRef<Record<string, string>>({});
  const triggerRef = useRef<"auto" | "manual">(trigger);
  const [hasError, setHasError] = useState(false);
  const seenErrorsRef = useRef<Set<string>>(new Set());

  triggerRef.current = trigger;

  const onRenderRef = useRef(onRender);
  const onSelectorProbeRef = useRef(onSelectorProbe);
  const onVisualDiffRef = useRef(onVisualDiff);
  const onConsoleErrorRef = useRef(onConsoleError);
  onRenderRef.current = onRender;
  onSelectorProbeRef.current = onSelectorProbe;
  onVisualDiffRef.current = onVisualDiff;
  onConsoleErrorRef.current = onConsoleError;

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const data = e.data as ProbeMessage;
      if (!data || typeof data !== "object" || !("kind" in data)) return;

      if (data.kind === "error") {
        setHasError(true);
        const sig = errorSignature(data.message);
        const seen = seenErrorsRef.current.has(sig);
        seenErrorsRef.current.add(sig);
        onConsoleErrorRef.current?.({
          message: data.message,
          signature: sig,
          line: data.line,
          seen,
        });
        return;
      }

      if (data.kind === "probe") {
        const changedFromPrev = data.styleHash !== prevStyleHashRef.current;

        onRenderRef.current?.({
          trigger: triggerRef.current,
          domHash: data.domHash,
          styleHash: data.styleHash,
          changedFromPrev,
        });

        const prevKeys = Object.keys(prevComputedRef.current);
        if (prevKeys.length > 0) {
          const changedNodes = new Set<string>();
          let changedPropCount = 0;
          const allKeys = new Set([
            ...prevKeys,
            ...Object.keys(data.computed),
          ]);
          for (const key of allKeys) {
            if (prevComputedRef.current[key] !== data.computed[key]) {
              changedPropCount++;
              const nodeId = key.split(".").slice(0, 2).join(".");
              changedNodes.add(nodeId);
            }
          }
          onVisualDiffRef.current?.({
            changedNodeCount: changedNodes.size,
            changedPropCount,
          });
        }

        prevStyleHashRef.current = data.styleHash;
        prevComputedRef.current = data.computed;

        if (data.selectors.length > 0) {
          onSelectorProbeRef.current?.({ selectors: data.selectors });
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const buildSrcdoc = useCallback(() => {
    const selectors = extractSelectors(cssCode);
    const probe = buildProbeScript(relevantProps, selectors);
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${cssCode}</style></head>
<body>${htmlCode}${probe}</body>
</html>`;
  }, [htmlCode, cssCode, relevantProps]);

  const updatePreview = useCallback(
    (trig: "auto" | "manual") => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      triggerRef.current = trig;
      setHasError(false);
      iframe.srcdoc = buildSrcdoc();
    },
    [buildSrcdoc]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updatePreview(trigger);
    }, RENDER_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [htmlCode, cssCode, trigger, updatePreview]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-paper-dim border-b border-line">
        <span className="text-[12px] font-mono text-text-dim">Preview</span>
        <div className="flex items-center gap-2">
          {hasError && (
            <span className="text-[11px] text-rust font-mono">error</span>
          )}
          <button
            onClick={() => updatePreview("manual")}
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
