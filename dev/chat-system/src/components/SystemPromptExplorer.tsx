import { useState } from "react";
import { promptSections, promptStats } from "../data/systemPrompt";

export default function SystemPromptExplorer() {
  const [openId, setOpenId] = useState<string | null>(promptSections[0]?.id ?? null);

  return (
    <div className="cs-explorer">
      <div className="cs-explorer-meta">
        <span className="cs-pill">model: {promptStats.model}</span>
        <span className="cs-pill">max tokens: {promptStats.maxTokens}</span>
        <span className="cs-pill">~{promptStats.approxTokens} prompt tokens</span>
        <span className="cs-pill">{promptStats.totalSections} sections</span>
        <span className="cs-pill">cached at module load</span>
      </div>

      <div className="cs-explorer-list">
        {promptSections.map((section) => {
          const isOpen = openId === section.id;
          return (
            <div key={section.id} className={`cs-section ${isOpen ? "cs-section-open" : ""}`}>
              <button
                className="cs-section-header"
                onClick={() => setOpenId(isOpen ? null : section.id)}
                aria-expanded={isOpen}
              >
                <span className="cs-section-toggle">{isOpen ? "−" : "+"}</span>
                <span className="cs-section-title">{section.header}</span>
              </button>

              {isOpen && (
                <div className="cs-section-body">
                  <div className="cs-section-why">
                    <strong>Why this matters:</strong> {section.why}
                  </div>
                  <pre className="cs-section-text">{section.body}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="cs-note">
        The entire prompt above is built once at module load and cached as <code>basePrompt</code>.
        Only the <code>## Current Page Context</code> block (when present) varies per request — it's
        appended to <code>basePrompt</code> at the moment of the call.
      </p>
    </div>
  );
}
