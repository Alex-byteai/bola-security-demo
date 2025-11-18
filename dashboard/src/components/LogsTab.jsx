import React from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { ensureIconComponent } from "../utils/eventUtils";
import { SEVERITY_COLORS } from "../config/severityConfig";

const DEFAULT_SEVERITY_COLOR = "#6b7280";

const safeString = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};

const getSeverityIcon = (severity) => {
  if (!severity) return <CheckCircle size={16} color={DEFAULT_SEVERITY_COLOR} />;
  const upper = severity.toUpperCase();
  if (upper === "HIGH" || upper === "CRITICAL") {
    return <AlertTriangle size={16} color={SEVERITY_COLORS[upper] || "#ef4444"} />;
  }
  if (upper === "MEDIUM") {
    return <AlertTriangle size={16} color={SEVERITY_COLORS.MEDIUM} />;
  }
  return <CheckCircle size={16} color={SEVERITY_COLORS.LOW} />;
};

export default function LogsTab({ logs = [] }) {
  if (!logs.length) {
    return (
      <div className="logs-tab">
        <div className="no-logs">Esperando eventos...</div>
      </div>
    );
  }

  return (
    <div className="logs-tab">
      <div className="logs-header">
        <h3>Logs en Tiempo Real</h3>
        <span className="logs-count">{logs.length} eventos recientes</span>
      </div>

      <div className="logs-container">
        {logs.map((log) => {
          const severityColor = SEVERITY_COLORS[log.severity?.toUpperCase()] || DEFAULT_SEVERITY_COLOR;
          const EventIcon = ensureIconComponent(log.eventMeta?.icon);
          return (
            <div
              key={log.id}
              className={`log-item ${["HIGH", "CRITICAL"].includes((log.severity || "").toUpperCase()) ? "critical" : ""}`}
              style={{ borderLeftColor: log.sourceColor || "#6b7280" }}
            >
              <div className="log-header">
                <div className="log-source" style={{ color: log.sourceColor || "#6b7280" }}>
                  {log.sourceName || "Origen desconocido"}
                  <span className="log-source-pill" style={{ background: log.requestColor || "#94a3b8" }}>
                    {log.requestLabel || "General"}
                  </span>
                </div>
                <div className="log-severity" style={{ color: severityColor }}>
                  {getSeverityIcon(log.severity)}
                  <span>{(log.severity || "INFO").toUpperCase()}</span>
                </div>
                <div className="log-timestamp">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Ahora"}
                </div>
              </div>

              <div className="log-content">
                <div className="log-message">
                  <strong>{log.methodLabel || "REQ"}</strong> {log.intent || "Actividad"}
                </div>
                {log.message && <div className="log-note">{safeString(log.message)}</div>}
                <div className="log-badges">
                  <span className="event-pill" style={{ background: `${(log.eventMeta?.color || "#94a3b8")}22`, color: log.eventMeta?.color || "#94a3b8" }}>
                    <EventIcon size={14} />
                    {log.eventMeta?.label || "Evento"}
                  </span>
                  {log.userEmail && <span className="event-pill">Usuario: {log.userEmail}</span>}
                  {log.ip && <span className="event-pill">IP: {log.ip}</span>}
                </div>

                {(log.endpoint || log.resource || log.url) && (
                  <div className="log-details">
                    <span>
                      Endpoint: {safeString(log.endpoint || log.resource || log.url)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
