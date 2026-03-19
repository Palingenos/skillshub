"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const lines = [
  { text: "> Connecting to SkillsHub registry...", delay: 0 },
  { text: "> Establishing secure connection...", delay: 800 },
  { text: "> ✓ Connected. Redirecting...", delay: 1600 },
];

export default function GoPage() {
  const router = useRouter();
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [typedChars, setTypedChars] = useState<number>(0);
  const [progress, setProgress] = useState(0);

  // Typing animation
  useEffect(() => {
    if (visibleLines >= lines.length) return;

    const currentLine = lines[visibleLines];
    if (!currentLine) return;

    if (typedChars < currentLine.text.length) {
      const speed = 18 + Math.random() * 12;
      const timeout = setTimeout(() => setTypedChars((c) => c + 1), speed);
      return () => clearTimeout(timeout);
    }

    // Line finished typing — move to next after a pause
    if (visibleLines < lines.length - 1) {
      const timeout = setTimeout(() => {
        setVisibleLines((v) => v + 1);
        setTypedChars(0);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [visibleLines, typedChars]);

  // Progress bar
  useEffect(() => {
    const start = Date.now();
    const duration = 2500;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  // Redirect
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push("/");
    }, 2500);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <>
      <head>
        <meta httpEquiv="refresh" content="3;url=https://skillshub.wtf" />
      </head>

      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-xl">
          {/* Terminal window */}
          <div className="rounded-lg border border-neutral-800/60 bg-neutral-950/80 shadow-2xl overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800/40 bg-neutral-900/50">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
              <span className="ml-3 font-mono text-[11px] text-neutral-600">
                skillshub — redirect
              </span>
            </div>

            {/* Terminal body */}
            <div className="p-5 font-mono text-sm space-y-2 min-h-[140px]">
              {lines.map((line, i) => {
                if (i > visibleLines) return null;

                const isCurrentLine = i === visibleLines;
                const displayText = isCurrentLine
                  ? line.text.slice(0, typedChars)
                  : line.text;

                const isSuccess = line.text.includes("✓");
                const isActive = i === visibleLines && typedChars < line.text.length;

                return (
                  <div key={i} className="flex items-start">
                    <span
                      className={`whitespace-pre-wrap ${
                        isSuccess && !isCurrentLine
                          ? "text-neon-cyan glow-text"
                          : isSuccess && isCurrentLine
                            ? "text-neon-cyan"
                            : "text-neutral-400"
                      }`}
                    >
                      {displayText}
                    </span>
                    {isActive && (
                      <span className="inline-block w-2 h-4 bg-neon-cyan/80 ml-0.5 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="px-5 pb-4">
              <div className="h-1 w-full rounded-full bg-neutral-800/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-none"
                  style={{
                    width: `${progress}%`,
                    background:
                      "linear-gradient(90deg, #00ffcc 0%, #00ffcc88 100%)",
                    boxShadow: "0 0 8px #00ffcc60, 0 0 20px #00ffcc30",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-neutral-600 font-mono">
                <span>redirecting</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          {/* Fallback link */}
          <p className="text-center mt-6 font-mono text-xs text-neutral-600">
            <a
              href="https://skillshub.wtf"
              className="hover:text-neon-cyan transition-colors underline underline-offset-2"
            >
              click here if not redirected
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
