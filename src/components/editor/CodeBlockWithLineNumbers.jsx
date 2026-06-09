import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { useState, useRef } from "react";
import { Copy, Check, ChevronDown } from "lucide-react";

const LANGUAGES = [
  // Web
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "html",
  "css",
  "scss",
  "sass",
  // Backend
  "python",
  "java",
  "c",
  "cpp",
  "c#",
  "go",
  "rust",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "scala",
  "perl",
  "lua",
  // Data / Config
  "sql",
  "json",
  "yaml",
  "xml",
  "toml",
  "ini",
  "env",
  // Shell
  "bash",
  "shell",
  "powershell",
  "batch",
  // Other
  "markdown",
  "latex",
  "r",
  "matlab",
  "dart",
  "elixir",
  "haskell",
  "clojure",
  "plaintext",
  "other",
];

export default function CodeBlockWithLineNumbers({
  node,
  updateAttributes,
  extension,
  editor,
}) {
  const [copied, setCopied] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const contentRef = useRef(null);

  const language = node.attrs.language || "javascript";
  const isEditable = editor?.isEditable;

  const handleCopy = async () => {
    const text = node.textContent;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Count lines from node content
  const lineCount = (node.textContent || "").split("\n").length;

  return (
    <NodeViewWrapper>
      <div
        style={{
          borderRadius: 10,
          overflow: "hidden",
          margin: "1em 0",
          backgroundColor: "#0D1117",
          fontFamily:
            "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
        }}
      >
        {/* Header bar */}
        <div
          contentEditable={false}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 14px",
            backgroundColor: "#161B22",
          }}
        >
          {/* Language selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => isEditable && setShowLangMenu((p) => !p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 10px",
                  borderRadius: 6,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "#8B949E",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: isEditable ? "pointer" : "default",
                  border: "none",
                  outline: "none",
                }}
              >
                {language}
                {isEditable && (
                  <ChevronDown style={{ width: 12, height: 12 }} />
                )}
              </button>

              {isEditable && showLangMenu && (
                <>
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 9998,
                    }}
                    onClick={() => setShowLangMenu(false)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      marginTop: 4,
                      backgroundColor: "#1C2128",
                      borderRadius: 8,
                      padding: "4px",
                      zIndex: 9999,
                      maxHeight: 240,
                      overflowY: "auto",
                      minWidth: 140,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}
                  >
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          updateAttributes({ language: lang });
                          setShowLangMenu(false);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "5px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontFamily: "'JetBrains Mono', monospace",
                          cursor: "pointer",
                          border: "none",
                          outline: "none",
                          backgroundColor:
                            language === lang
                              ? "rgba(255,255,255,0.1)"
                              : "transparent",
                          color: language === lang ? "#E6EDF3" : "#8B949E",
                        }}
                        onMouseEnter={(e) => {
                          if (language !== lang) {
                            e.currentTarget.style.backgroundColor =
                              "rgba(255,255,255,0.06)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (language !== lang) {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }
                        }}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {isEditable &&
              (!LANGUAGES.includes(language) || language === "other") && (
                <input
                  type="text"
                  placeholder="language name..."
                  value={language === "other" ? "" : language}
                  onMouseDown={(e) => e.preventDefault()}
                  onChange={(e) =>
                    updateAttributes({
                      language: e.target.value || "other",
                    })
                  }
                  style={{
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#8B949E",
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: "2px 8px",
                    borderRadius: 6,
                    outline: "none",
                    border: "none",
                    width: 100,
                  }}
                />
              )}
          </div>

          {/* Copy button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCopy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 10px",
              borderRadius: 6,
              backgroundColor: copied
                ? "rgba(34,197,94,0.15)"
                : "rgba(255,255,255,0.06)",
              color: copied ? "#22C55E" : "#8B949E",
              fontSize: 11,
              cursor: "pointer",
              border: "none",
              outline: "none",
              transition: "all 150ms",
            }}
          >
            {copied ? (
              <Check style={{ width: 12, height: 12 }} />
            ) : (
              <Copy style={{ width: 12, height: 12 }} />
            )}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Code area with line numbers */}
        <div
          style={{
            display: "flex",
            overflow: "auto",
            position: "relative",
          }}
        >
          {/* Line numbers */}
          <div
            contentEditable={false}
            style={{
              flexShrink: 0,
              padding: "16px 0",
              backgroundColor: "#0D1117",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              userSelect: "none",
              minWidth: 48,
              textAlign: "right",
            }}
          >
            {Array.from(
              { length: Math.max(1, lineCount) },
              (_, i) => i + 1,
            ).map((n) => (
              <div
                key={n}
                style={{
                  paddingRight: 12,
                  paddingLeft: 8,
                  fontSize: 13,
                  lineHeight: "1.6em",
                  color: "#3D444D",
                  fontFamily: "'JetBrains Mono', monospace",
                  height: "1.6em",
                }}
              >
                {n}
              </div>
            ))}
          </div>

          {/* Actual code content */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              minWidth: 0,
              overflowX: "auto",
            }}
          >
            <NodeViewContent
              as="pre"
              className="code-block-content"
              style={{
                fontSize: 13,
                lineHeight: "1.6em",
                color: "#E6EDF3",
                fontFamily:
                  "'JetBrains Mono', 'Fira Code', " +
                  "'Courier New', monospace",
                display: "block",
                whiteSpace: "pre",
                outline: "none",
                margin: 0,
                padding: 0,
                minHeight: "1.6em",
                caretColor: "#E6EDF3",
                wordBreak: "keep-all",
                overflowWrap: "normal",
              }}
            />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
