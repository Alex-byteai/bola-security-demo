import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import EventIntelPanel from "./EventIntelPanel";

const formatHour = (date) => `${date.getHours().toString().padStart(2, "0")}:00`;

export default function AnalyticsTab({ logs = [], requestInsights }) {
  const timelineData = useMemo(() => {
    const bucket = logs.reduce((acc, log) => {
      const date = log.timestamp ? new Date(log.timestamp) : new Date();
      const label = formatHour(date);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(bucket)
      .map(([hour, requests]) => ({ hour, requests }))
      .sort((a, b) => (a.hour > b.hour ? 1 : -1));
  }, [logs]);

  const { methodMix = [], topEndpoints = [], specialCounts = {}, eventHighlights = [] } = requestInsights;

  return (
    <div className="analytics-tab">
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Actividad por Hora</h4>
          {timelineData.length === 0 ? (
            <div className="empty-pill">Aún no hay actividad</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="analytics-card">
          <h4>Métricas de Seguridad</h4>
          <div className="metrics-grid">
            <Metric label="Total de Eventos" value={logs.length} accent="#3b82f6" />
            <Metric label="Intentos de Login" value={specialCounts.loginAttempts || 0} accent="#38bdf8" />
            <Metric label="Alertas BOLA" value={specialCounts.bolaAlerts || 0} accent="#f43f5e" />
            <Metric label="Llamadas Admin" value={specialCounts.adminCalls || 0} accent="#14b8a6" />
            <Metric label="Lecturas" value={specialCounts.readOps || 0} accent="#6b7280" />
            <Metric label="Escrituras" value={specialCounts.writeOps || 0} accent="#f97316" />
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Mix de Métodos</h4>
          <div className="method-pills">
            {methodMix.length === 0 ? (
              <span className="empty-pill">Sin datos</span>
            ) : (
              methodMix.map((method) => (
                <div key={method.method} className="method-pill">
                  <span>{method.method}</span>
                  <strong>{method.share}%</strong>
                  <small>{method.count} req</small>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="analytics-card">
          <h4>Top Endpoints Atacados</h4>
          <div className="top-endpoints">
            {topEndpoints.length === 0 ? (
              <div className="empty-pill">Aún sin actividad</div>
            ) : (
              topEndpoints.map((endpoint) => (
                <div key={endpoint.key} className="endpoint-row">
                  <div>
                    <strong>{endpoint.method}</strong> {endpoint.endpoint}
                  </div>
                  <span className="endpoint-count">{endpoint.count} eventos</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="analytics-card">
        <h4>Eventos destacados</h4>
        <EventIntelPanel eventHighlights={eventHighlights} variant="compact" />
      </div>
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className="metric-item">
      <span className="metric-label">{label}</span>
      <span className="metric-value" style={{ color: accent }}>
        {value}
      </span>
    </div>
  );
}
