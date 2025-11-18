import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import EventIntelPanel from "./EventIntelPanel";
import { API_CONFIG } from "../config/apiConfig";
import { ensureIconComponent } from "../utils/eventUtils";

export default function OverviewTab({
  stats,
  chartData,
  severityData,
  requestInsights,
  connections,
  latestLog,
}) {
  return (
    <div className="overview-tab">
      <div className="stats-grid">
        {Object.entries(stats).map(([key, data]) => (
          <div
            key={key}
            className="stat-card"
            style={{ borderLeftColor: API_CONFIG[key].color }}
          >
            <div className="stat-card-header">
              <h3>{API_CONFIG[key].name}</h3>
              <span className={`status-dot ${connections[key] ? "connected" : "disconnected"}`} />
            </div>
            <div className="stat-numbers">
              <div className="stat-item">
                <span className="stat-label">Total</span>
                <span className="stat-value">{data.total}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Bloqueados</span>
                <span className="stat-value" style={{ color: "#ef4444" }}>
                  {data.blocked}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Críticos</span>
                <span className="stat-value" style={{ color: "#f59e0b" }}>
                  {data.critical}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h4>Actividad por API</h4>
          {chartData.length === 0 ? (
            <div className="empty-pill">Sin datos suficientes</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total" fill="#3b82f6" />
                <Bar dataKey="blocked" name="Bloqueados" fill="#ef4444" />
                <Bar dataKey="critical" name="Críticos" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h4>Distribución de Severidad</h4>
          {severityData.length === 0 ? (
            <div className="empty-pill">Aún no hay eventos</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {severityData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="overview-lower">
        <div className="overview-panel">
          <h4>Clasificación de Peticiones</h4>
          <RequestTypeGrid categories={requestInsights.categories} />
        </div>
        <div className="overview-panel">
          <h4>Último evento</h4>
          {latestLog ? (
            <LatestLogCard log={latestLog} />
          ) : (
            <div className="empty-pill">Esperando tráfico...</div>
          )}
        </div>
      </div>

      <div className="overview-panel">
        <h4>Eventos destacados</h4>
        <EventIntelPanel eventHighlights={requestInsights.eventHighlights} />
      </div>
    </div>
  );
}

function RequestTypeGrid({ categories = [] }) {
  if (!categories.length) {
    return <div className="empty-pill">Aún no hay clasificación disponible</div>;
  }

  return (
    <div className="request-grid">
      {categories.map((category) => {
        const Icon = ensureIconComponent(category.icon);
        return (
          <div key={category.id} className="request-card">
            <div className="request-card-header">
              <Icon size={20} color={category.color} />
              <div>
                <p className="request-label">{category.label}</p>
                <p className="request-share">{category.share}% del tráfico</p>
              </div>
            </div>
            <div className="request-counter" style={{ color: category.color }}>
              {category.count} eventos
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LatestLogCard({ log }) {
  const EventIcon = ensureIconComponent(log.eventMeta?.icon);
  const eventColor = log.eventMeta?.color || "#94a3b8";

  return (
    <div className="latest-log-card">
      <div className="latest-log-header">
        <div>
          <p className="latest-log-source">{log.sourceName || log.source}</p>
          <p className="latest-log-intent">{log.intent}</p>
        </div>
        <span className="latest-log-time">
          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Ahora"}
        </span>
      </div>
      {log.message && <p className="latest-log-message">{log.message}</p>}
      <div className="log-badges">
        <span className="event-pill" style={{ background: `${eventColor}22`, color: eventColor }}>
          <EventIcon size={14} />
          {log.eventMeta?.label || "Evento"}
        </span>
        {log.userEmail && <span className="event-pill">Usuario: {log.userEmail}</span>}
      </div>
    </div>
  );
}
