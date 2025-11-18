import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Eye, Database, Shield, CheckCircle, XCircle } from "lucide-react";

import { API_CONFIG } from "./config/apiConfig";
import { SEVERITY_COLORS } from "./config/severityConfig";
import { extractLogsFromPayload, createLogEntry } from "./utils/websocketUtils";
import { buildRequestInsights, updateStatsWithLog } from "./utils/statsUtils";
import OverviewTab from "./components/OverviewTab";
import LogsTab from "./components/LogsTab";
import AnalyticsTab from "./components/AnalyticsTab";

import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    secure: { total: 0, blocked: 0, critical: 0 },
    vulnerable: { total: 0, blocked: 0, critical: 0 },
  });
  const [connections, setConnections] = useState({
    secure: false,
    vulnerable: false,
  });

  const wsRefs = useRef({ secure: null, vulnerable: null });

  useEffect(() => {
    Object.entries(API_CONFIG).forEach(([key, config]) => {
      const ws = new WebSocket(config.wsUrl);

      ws.onopen = () => setConnections((p) => ({ ...p, [key]: true }));

      ws.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          const extracted = extractLogsFromPayload(payload);
          if (!extracted.length) return;

          const enriched = extracted.map((raw) => createLogEntry(raw, key, config));

          setLogs((prev) => [...enriched, ...prev].slice(0, 250));
          setStats((prev) => enriched.reduce((acc, log) => updateStatsWithLog(acc, log), prev));
        } catch (error) {
          console.error(`Error handling message for ${config.name}:`, error);
        }
      };

      ws.onclose = () => setConnections((p) => ({ ...p, [key]: false }));
      ws.onerror = (error) => console.error(`WebSocket error for ${config.name}:`, error);

      wsRefs.current[key] = ws;
    });

    return () => {
      Object.values(wsRefs.current).forEach((ws) => ws?.close());
    };
  }, []);

  const requestInsights = useMemo(() => buildRequestInsights(logs), [logs]);
  const latestLog = logs[0] || null;

  const chartData = useMemo(
    () =>
      Object.entries(stats)
        .filter(([key]) => API_CONFIG[key])
        .map(([key, data]) => ({
          name: API_CONFIG[key].name,
          total: data.total || 0,
          blocked: data.blocked || 0,
          critical: data.critical || 0,
          color: API_CONFIG[key].color,
        })),
    [stats]
  );

  const severityData = useMemo(() => {
    const counts = logs.reduce((acc, log) => {
      const severity = (log.severity || "INFO").toUpperCase();
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: SEVERITY_COLORS[name] || "#6b7280",
    }));
  }, [logs]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <Shield className="header-icon" />
            <h1>BOLA Monitoring Dashboard</h1>
          </div>

          <div className="connection-status">
            {Object.entries(connections).map(([k, ok]) => (
              <div key={k} className="status-item">
                <span className={`status-dot ${ok ? "connected" : "disconnected"}`} />
                {API_CONFIG[k].name}
                {ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <nav className="navigation">
        <button
          onClick={() => setActiveTab("overview")}
          className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
        >
          <Activity size={18} /> Resumen
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`nav-item ${activeTab === "logs" ? "active" : ""}`}
        >
          <Eye size={18} /> Logs
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`nav-item ${activeTab === "analytics" ? "active" : ""}`}
        >
          <Database size={18} /> Analíticas
        </button>
      </nav>

      <main className="main-content">
        {activeTab === "overview" && (
          <OverviewTab
            stats={stats}
            chartData={chartData}
            severityData={severityData}
            requestInsights={requestInsights}
            connections={connections}
            latestLog={latestLog}
          />
        )}

        {activeTab === "logs" && <LogsTab logs={logs.slice(0, 80)} />}

        {activeTab === "analytics" && (
          <AnalyticsTab logs={logs} requestInsights={requestInsights} />
        )}
      </main>
    </div>
  );
}
