import { useState, useEffect, useRef } from "react";
import { sseEvents, eventMapping } from "../data/sseEvents";

const EVENT_COLORS: Record<string, string> = {
  RUN_STARTED: "#3b82f6",
  TEXT_MESSAGE_START: "#10b981",
  TEXT_MESSAGE_CONTENT: "#10b981",
  TEXT_MESSAGE_END: "#10b981",
  TOOL_CALL_START: "#f59e0b",
  TOOL_CALL_ARGS: "#f59e0b",
  TOOL_CALL_END: "#f59e0b",
  CUSTOM: "#ec4899",
  RUN_FINISHED: "#3b82f6",
  DONE: "#6b7280",
};

export default function ToolCallTimeline() {
  const [visible, setVisible] = useState(sseEvents.length);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setVisible((v) => {
        if (v >= sseEvents.length) {
          setPlaying(false);
          return v;
        }
        return v + 1;
      });
    }, 600);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing]);

  const toggleExpand = (step: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const reset = () => {
    setVisible(0);
    setExpanded(new Set());
    setPlaying(false);
  };

  const step = () => {
    setPlaying(false);
    setVisible((v) => Math.min(v + 1, sseEvents.length));
  };

  return (
    <div className="cs-timeline-wrap">
      <div className="cs-timeline-controls">
        <button onClick={() => setPlaying((p) => !p)} className="cs-btn">
          {playing ? "Pause" : "Play"}
        </button>
        <button onClick={step} className="cs-btn" disabled={visible >= sseEvents.length}>
          Step ▶
        </button>
        <button onClick={reset} className="cs-btn cs-btn-secondary">
          Reset
        </button>
        <button
          onClick={() => setVisible(sseEvents.length)}
          className="cs-btn cs-btn-secondary"
        >
          Show all
        </button>
        <span className="cs-timeline-counter">
          {visible} / {sseEvents.length} events
        </span>
      </div>

      <div className="cs-timeline">
        {sseEvents.slice(0, visible).map((ev) => {
          const isExpanded = expanded.has(ev.step);
          const color = EVENT_COLORS[ev.type] ?? "#6b7280";
          return (
            <div key={ev.step} className="cs-timeline-row">
              <div className="cs-timeline-rail">
                <div className="cs-timeline-dot" style={{ background: color }} />
                <div className="cs-timeline-time">+{ev.tMs}ms</div>
              </div>
              <div className="cs-timeline-card">
                <button
                  className="cs-timeline-card-header"
                  onClick={() => toggleExpand(ev.step)}
                >
                  <span className="cs-event-type" style={{ color }}>
                    {ev.type}
                    {ev.name ? ` · ${ev.name}` : ""}
                  </span>
                  <span className="cs-event-toggle">{isExpanded ? "−" : "+"}</span>
                </button>
                <div className="cs-timeline-explain">{ev.explain}</div>
                {isExpanded && (
                  <pre className="cs-code cs-code-small">
                    {typeof ev.payload === "string"
                      ? ev.payload
                      : JSON.stringify(ev.payload, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="cs-mapping">
        <h4>Anthropic event → AG-UI event mapping</h4>
        <table className="cs-table">
          <thead>
            <tr>
              <th>Anthropic SDK event</th>
              <th>Emitted as</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {eventMapping.map((m, i) => (
              <tr key={i}>
                <td>
                  <code>{m.anthropic}</code>
                </td>
                <td>
                  <code>{m.agui}</code>
                </td>
                <td>{m.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
