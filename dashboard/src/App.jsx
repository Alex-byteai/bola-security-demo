import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, Users, Eye, Database, KeyRound, ShoppingBag, CreditCard, Target, ShieldCheck, Radar, Lock, ShieldAlert, ShieldOff, Edit3, Trash2, FileWarning, Gavel, UserX, AlertOctagon } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './App.css';

const isDocker = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_CONFIG = {
  secure: {
    name: 'API Segura',
    url: 'http://localhost:3001',
    wsUrl: isDocker ? 'ws://app_secure:8081' : 'ws://localhost:8081',
    color: '#10b981'
  },
  vulnerable: {
    name: 'API Vulnerable',
    url: 'http://localhost:3000',
    wsUrl: isDocker ? 'ws://app_vulnerable:8081' : 'ws://localhost:8082', // CORRECT: host uses 8082, container uses 8081
    color: '#ef4444'
  }
};

const ensureIconComponent = (IconCandidate) => (typeof IconCandidate === 'function' ? IconCandidate : Shield);

const SEVERITY_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#7c2d12'
};

const DEFAULT_EVENT_META = {
  key: 'GENERAL',
  label: 'Evento de seguridad',
  description: 'Actividad registrada por las APIs',
  color: '#94a3b8',
  icon: Shield
};

const EVENT_TAXONOMY = {
  ORDER_CREATED: {
    label: 'Orden creada (segura)',
    description: 'Flujo protegido completado en la API segura',
    color: '#10b981',
    icon: ShoppingBag
  },
  ORDER_MODIFIED_BOLA: {
    label: 'Orden modificada sin ownership',
    description: 'Actualización vulnerable detectada en la API insegura',
    color: '#f97316',
    icon: Edit3
  },
  ORDER_ACCESS_ATTEMPT: {
    label: 'Intento de lectura de orden',
    description: 'Posible enumeración BOLA / acceso cruzado',
    color: '#fb7185',
    icon: Target
  },
  UNAUTHORIZED_ACCESS_ATTEMPT: {
    label: 'Acceso no autorizado bloqueado',
    description: 'Ownership enforcement en acción',
    color: '#f97316',
    icon: ShieldAlert
  },
  UNAUTHORIZED_UPDATE_BLOCKED: {
    label: 'Actualización bloqueada',
    description: 'Intento de modificar recursos ajenos detenido',
    color: '#f59e0b',
    icon: ShieldAlert
  },
  UNAUTHORIZED_DELETE_BLOCKED: {
    label: 'Eliminación bloqueada',
    description: 'Se evitó borrar un recurso sin permisos',
    color: '#f59e0b',
    icon: Trash2
  },
  UNAUTHORIZED_USER_ACCESS: {
    label: 'Usuario protegido',
    description: 'Intento de leer datos de otro usuario',
    color: '#f97316',
    icon: UserX
  },
  UNAUTHORIZED_USER_UPDATE_BLOCKED: {
    label: 'Modificación de usuario bloqueada',
    description: 'Solo el propietario/admin puede editar',
    color: '#f97316',
    icon: UserX
  },
  USER_DELETED_BY_ADMIN: {
    label: 'Usuario eliminado por admin',
    description: 'Acción administrativa registrada',
    color: '#f87171',
    icon: Trash2
  },
  PAYMENT_CREATED: {
    label: 'Pago creado',
    description: 'Transacción financiera registrada',
    color: '#ec4899',
    icon: CreditCard
  },
  ADMIN_PAYMENTS_ACCESS: {
    label: 'Reporte financiero consultado',
    description: 'Acceso privilegiado a pagos',
    color: '#14b8a6',
    icon: ShieldCheck
  },
  ADMIN_ACCESS_GRANTED: {
    label: 'Acceso admin concedido',
    description: 'Operación privilegiada autorizada',
    color: '#10b981',
    icon: ShieldCheck
  },
  ADMIN_ACCESS_DENIED: {
    label: 'Acceso admin denegado',
    description: 'Intento privilegiado bloqueado',
    color: '#f97316',
    icon: ShieldOff
  },
  RATE_LIMIT_EXCEEDED: {
    label: 'Rate limit excedido',
    description: 'Protección anti abuso activada',
    color: '#fde047',
    icon: AlertOctagon
  },
  ORDER_MODIFIED_SAFE: {
    label: 'Orden actualizada con ownership',
    description: 'Cambio permitido tras validar propietario',
    color: '#10b981',
    icon: Edit3
  },
  ORDER_MODIFIED: {
    label: 'Orden actualizada',
    description: 'Evento de modificación registrado',
    color: '#10b981',
    icon: Edit3
  },
  ORDER_DELETED_SAFE: {
    label: 'Orden eliminada con verificación',
    description: 'Eliminación autorizada',
    color: '#10b981',
    icon: Trash2
  },
  PAYMENT_FLAGGED: {
    label: 'Pago monitoreado',
    description: 'Actividad financiera sensible',
    color: '#ec4899',
    icon: CreditCard
  },
  ORDER_MODIFIED_BOLA_ALERT: {
    label: 'Orden vulnerable editada',
    description: 'Contexto inseguro detectado',
    color: '#f97316',
    icon: ShieldAlert
  },
  BOLA_ATTEMPT: {
    label: 'Ataque BOLA detectado',
    description: 'Patrón crítico en curso',
    color: '#f43f5e',
    icon: Target
  },
  USER_DATA_ACCESS_ATTEMPT: {
    label: 'Intento de ver datos ajenos',
    description: 'Lectura no autorizada',
    color: '#fb7185',
    icon: Users
  },
  ORDER_MODIFIED_BOLA_V2: {
    label: 'Orden vulnerada',
    description: 'BOLA en modificación de órdenes',
    color: '#f97316',
    icon: Edit3
  },
  PAYMENT_CREATED_SECURE: {
    label: 'Pago seguro creado',
    description: 'Transacción protegida',
    color: '#10b981',
    icon: CreditCard
  },
  ADMIN_AUDIT: {
    label: 'Auditoría administrativa',
    description: 'Consulta de panel seguro',
    color: '#14b8a6',
    icon: Gavel
  }
};

const humanizeEventKey = (key = '') =>
  key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const getEventMeta = (log) => {
  const rawKey = (log.event || log.securityEvent || '').toUpperCase();
  if (!rawKey) {
    return DEFAULT_EVENT_META;
  }

  const meta = EVENT_TAXONOMY[rawKey];
  if (meta) {
    return {
      ...DEFAULT_EVENT_META,
      ...meta,
      key: rawKey,
      icon: ensureIconComponent(meta.icon)
    };
  }

  return {
    ...DEFAULT_EVENT_META,
    key: rawKey,
    label: humanizeEventKey(rawKey),
    icon: ensureIconComponent(DEFAULT_EVENT_META.icon)
  };
};

const REQUEST_TYPE_CONFIG = {
  auth: { label: 'Autenticación / Login', color: '#38bdf8', icon: KeyRound },
  orders: { label: 'Operaciones de Órdenes', color: '#f97316', icon: ShoppingBag },
  users: { label: 'Gestión de Usuarios', color: '#c084fc', icon: Users },
  payments: { label: 'Pagos y Finanzas', color: '#ec4899', icon: CreditCard },
  admin: { label: 'Panel y Administración', color: '#14b8a6', icon: ShieldCheck },
  monitoring: { label: 'Monitoreo / Health', color: '#22d3ee', icon: Radar },
  bola: { label: 'Alertas BOLA', color: '#f43f5e', icon: Target },
  general: { label: 'Tráfico General', color: '#94a3b8', icon: Activity }
};

const classifyRequestType = (log) => {
  const resource = (log.resource || log.endpoint || log.url || '').toLowerCase();
  const action = (log.action || '').toLowerCase();
  const securityEvent = (log.securityEvent || '').toLowerCase();
  const event = (log.event || '').toLowerCase();

  if (securityEvent.includes('bola') || event.includes('bola')) return 'bola';
  if (resource.includes('/auth') || resource.includes('login') || action.includes('login')) return 'auth';
  if (resource.includes('/orders')) return 'orders';
  if (resource.includes('/users')) return 'users';
  if (resource.includes('/payments')) return 'payments';
  if (resource.includes('/security') || resource.includes('/admin')) return 'admin';
  if (resource.includes('/health') || resource.includes('/stats')) return 'monitoring';
  return 'general';
};

const buildIntentLabel = (type, log) => {
  const method = (log.method || 'REQ').toUpperCase();
  const friendlyVerb = method === 'GET' ? 'Consulta' : method === 'POST' ? 'Creación' : method === 'PUT' ? 'Actualización' : method === 'DELETE' ? 'Eliminación' : method;

  switch (type) {
    case 'auth':
      return method === 'POST' ? 'Intento de login' : 'Verificación de sesión';
    case 'orders':
      return `${friendlyVerb} de órdenes`;
    case 'users':
      return `${friendlyVerb} de usuarios`;
    case 'payments':
      return `${friendlyVerb} financiera`;
    case 'admin':
      return `${friendlyVerb} privilegiada`;
    case 'monitoring':
      return 'Ping de salud / monitoreo';
    case 'bola':
      return 'Patrón BOLA detectado';
    default:
      return `${friendlyVerb} general`;
  }
};

const attachRequestIntel = (log) => {
  const requestType = classifyRequestType(log);
  const meta = REQUEST_TYPE_CONFIG[requestType] || REQUEST_TYPE_CONFIG.general;
  const eventMeta = getEventMeta(log);

  return {
    ...log,
    requestType,
    requestLabel: meta.label,
    requestColor: meta.color,
    intent: buildIntentLabel(requestType, log),
    methodLabel: (log.method || 'REQ').toUpperCase(),
    eventMeta
  };
};

const extractLogsFromPayload = (payload) => {
  if (!payload) return [];
  if (payload.type === 'initial' && Array.isArray(payload.logs)) return payload.logs;
  if (payload.type === 'new' && payload.log) return [payload.log];
  return [payload];
};

const createLogEntry = (rawLog, key, config) => {
  const baseLog = {
    ...rawLog,
    id: `${Date.now()}-${Math.random()}`,
    timestamp: rawLog.timestamp || new Date().toISOString(),
    source: key,
    sourceName: config.name,
    sourceColor: config.color
  };

  return attachRequestIntel(baseLog);
};

const updateStatsWithLog = (currentStats, log) => {
  const sourceStats = currentStats[log.source] || { total: 0, blocked: 0, critical: 0 };
  const isCritical = log.severity === 'HIGH' || log.severity === 'CRITICAL';
  const isBlocked = (log.securityEvent || '').includes('BLOCKED') || (log.event || '').includes('UNAUTHORIZED');

  return {
    ...currentStats,
    [log.source]: {
      total: sourceStats.total + 1,
      blocked: sourceStats.blocked + (isBlocked ? 1 : 0),
      critical: sourceStats.critical + (isCritical ? 1 : 0)
    }
  };
};

const buildRequestInsights = (logList) => {
  if (!logList.length) {
    return {
      total: 0,
      categories: [],
      methodMix: [],
      topEndpoints: [],
      specialCounts: {
        loginAttempts: 0,
        bolaAlerts: 0,
        adminCalls: 0,
        writeOps: 0,
        readOps: 0
      },
      eventHighlights: []
    };
  }

  const categoryCounts = {};
  const methodCounts = {};
  const endpointMap = {};
  const eventCounts = {};
  let loginAttempts = 0;
  let bolaAlerts = 0;
  let adminCalls = 0;
  let writeOps = 0;
  let readOps = 0;

  logList.forEach((log) => {
    const type = log.requestType || 'general';
    categoryCounts[type] = (categoryCounts[type] || 0) + 1;

    const method = (log.method || 'GET').toUpperCase();
    methodCounts[method] = (methodCounts[method] || 0) + 1;

    const endpoint = log.resource || log.endpoint || log.url || 'desconocido';
    const endpointKey = `${method} ${endpoint}`;
    if (!endpointMap[endpointKey]) {
      endpointMap[endpointKey] = {
        key: endpointKey,
        method,
        endpoint,
        count: 0,
        type
      };
    }
    endpointMap[endpointKey].count += 1;

    if (type === 'auth' && method === 'POST') loginAttempts += 1;
    if (type === 'bola') bolaAlerts += 1;
    if (type === 'admin') adminCalls += 1;

    if (method === 'GET') {
      readOps += 1;
    } else {
      writeOps += 1;
    }

    const eventKey = (log.eventMeta?.key || log.event || log.securityEvent || 'GENERAL').toUpperCase();
    if (!eventCounts[eventKey]) {
      eventCounts[eventKey] = {
        key: eventKey,
        label: log.eventMeta?.label || humanizeEventKey(eventKey),
        description: log.eventMeta?.description || DEFAULT_EVENT_META.description,
        color: log.eventMeta?.color || DEFAULT_EVENT_META.color,
        icon: log.eventMeta?.icon || DEFAULT_EVENT_META.icon,
        count: 0
      };
    }
    eventCounts[eventKey].count += 1;
  });

  const total = logList.length;

  const categories = Object.entries(categoryCounts)
    .map(([type, count]) => {
      const meta = REQUEST_TYPE_CONFIG[type] || REQUEST_TYPE_CONFIG.general;
      return {
        id: type,
        label: meta.label,
        color: meta.color,
        icon: meta.icon,
        count,
        share: ((count / total) * 100).toFixed(1)
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const methodMix = Object.entries(methodCounts)
    .map(([method, count]) => ({
      method,
      count,
      share: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  const topEndpoints = Object.values(endpointMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total,
    categories,
    methodMix,
    topEndpoints,
    specialCounts: {
      loginAttempts,
      bolaAlerts,
      adminCalls,
      writeOps,
      readOps
    },
    eventHighlights: Object.values(eventCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  };
};

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    secure: { total: 0, blocked: 0, critical: 0 },
    vulnerable: { total: 0, blocked: 0, critical: 0 }
  });
  const [connections, setConnections] = useState({
    secure: false,
    vulnerable: false
  });

  const wsRefs = useRef({ secure: null, vulnerable: null });

  const requestInsights = useMemo(() => buildRequestInsights(logs), [logs]);
  const latestLog = logs[0] || null;

  useEffect(() => {
    // Conectar WebSockets
    Object.entries(API_CONFIG).forEach(([key, config]) => {
      const ws = new WebSocket(config.wsUrl);
      
      ws.onopen = () => {
        console.log(`Conectado a ${config.name}`);
        setConnections(prev => ({ ...prev, [key]: true }));
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const extractedLogs = extractLogsFromPayload(payload);
          if (!extractedLogs.length) return;

          const enrichedLogs = extractedLogs.map(rawLog => createLogEntry(rawLog, key, config));

          setLogs(prev => {
            const combined = [...enrichedLogs, ...prev];
            return combined.slice(0, 250);
          });

          setStats(prev => enrichedLogs.reduce((acc, log) => updateStatsWithLog(acc, log), prev));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log(`Desconectado de ${config.name}`);
        setConnections(prev => ({ ...prev, [key]: false }));
        
        // Reconectar después de 5 segundos
        setTimeout(() => {
          if (wsRefs.current[key] === ws) {
            wsRefs.current[key] = new WebSocket(config.wsUrl);
          }
        }, 5000);
      };

      wsRefs.current[key] = ws;
    });

    return () => {
      // Limpiar conexiones
      Object.values(wsRefs.current).forEach(ws => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
    };
  }, []);

  // Preparar datos para gráficos
  const chartData = Object.entries(stats).map(([key, data]) => ({
    name: API_CONFIG[key].name,
    total: data.total,
    blocked: data.blocked,
    critical: data.critical,
    color: API_CONFIG[key].color
  }));

  const severityData = Object.entries(
    logs.reduce((acc, log) => {
      const severity = log.severity || 'UNKNOWN';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({
    name,
    value,
    color: SEVERITY_COLORS[name] || '#6b7280'
  }));

  const recentLogs = logs.slice(0, 80);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <Shield className="header-icon" />
            <h1>Security Dashboard - BOLA Monitoring</h1>
          </div>
          <div className="connection-status">
            {Object.entries(connections).map(([key, connected]) => (
              <div key={key} className="status-item">
                <div 
                  className={`status-dot ${connected ? 'connected' : 'disconnected'}`}
                  style={{ backgroundColor: API_CONFIG[key].color }}
                />
                <span>{API_CONFIG[key].name}</span>
                {connected ? <CheckCircle size={16} /> : <XCircle size={16} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="navigation">
        {[
          { id: 'overview', label: 'Resumen', icon: Activity },
          { id: 'logs', label: 'Logs en Tiempo Real', icon: Eye },
          { id: 'analytics', label: 'Analíticas', icon: Database }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            chartData={chartData}
            severityData={severityData}
            requestInsights={requestInsights}
            connections={connections}
            latestLog={latestLog}
          />
        )}

        {activeTab === 'logs' && (
          <LogsTab logs={recentLogs} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab logs={logs} requestInsights={requestInsights} />
        )}
      </main>
    </div>
  );
}

function EventIntelPanel({ eventHighlights, variant = 'grid' }) {
  if (!eventHighlights.length) {
    return <div className="empty-pill">Aún no hay eventos catalogados</div>;
  }

  if (variant === 'compact') {
    return (
      <div className="event-intel-list">
        {eventHighlights.map((event) => {
          const Icon = ensureIconComponent(event.icon);
          return (
            <div key={event.key} className="event-intel-list-item">
              <div className="event-intel-icon" style={{ background: `${event.color}22`, color: event.color }}>
                <Icon size={16} />
              </div>
              <div className="event-intel-meta">
                <p className="event-intel-label">{event.label}</p>
                <p className="event-intel-description">{event.description}</p>
              </div>
              <span className="event-intel-count" style={{ color: event.color }}>{event.count}×</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="event-intel-grid">
      {eventHighlights.map((event) => {
        const Icon = ensureIconComponent(event.icon);
        return (
          <div key={event.key} className="event-intel-card">
            <div className="event-intel-icon" style={{ background: `${event.color}22`, color: event.color }}>
              <Icon size={18} />
            </div>
            <div className="event-intel-meta">
              <p className="event-intel-label">{event.label}</p>
              <p className="event-intel-description">{event.description}</p>
            </div>
            <span className="event-intel-count" style={{ color: event.color }}>{event.count}×</span>
          </div>
        );
      })}
    </div>
  );
}

// Componente para la pestaña de Resumen
function OverviewTab({ stats, chartData, severityData, requestInsights, connections, latestLog }) {
  return (
    <div className="overview-tab">
      {/* Estadísticas Rápidas */}
      <div className="stats-grid">
        {Object.entries(stats).map(([key, data]) => (
          <div key={key} className="stat-card" style={{ borderLeftColor: API_CONFIG[key].color }}>
            <h3>{API_CONFIG[key].name}</h3>
            <div className="stat-numbers">
              <div className="stat-item">
                <span className="stat-label">Total Requests</span>
                <span className="stat-value">{data.total}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Bloqueados</span>
                <span className="stat-value" style={{ color: '#ef4444' }}>{data.blocked}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Críticos</span>
                <span className="stat-value" style={{ color: '#f59e0b' }}>{data.critical}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos e insights */}
      <div className="charts-grid">
        <div className="chart-card">
          <h4>Actividad por API</h4>
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
        </div>

        <div className="chart-card">
          <h4>Distribución de Severidad</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <RequestTypeGrid requestInsights={requestInsights} />
    </div>
  );
}

// Componente para la pestaña de Logs
function LogsTab({ logs }) {
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'HIGH':
      case 'CRITICAL':
        return <AlertTriangle size={16} color="#ef4444" />;
      case 'MEDIUM':
        return <AlertTriangle size={16} color="#f59e0b" />;
      default:
        return <CheckCircle size={16} color="#10b981" />;
    }
  };

  return (
    <div className="logs-tab">
      <div className="logs-header">
        <h3>Logs en Tiempo Real</h3>
        <span className="logs-count">{logs.length} eventos</span>
      </div>
      
      <div className="logs-container">
        {logs.length === 0 ? (
          <div className="no-logs">Esperando eventos...</div>
        ) : (
          logs.map((log) => {
            const EventIcon = ensureIconComponent(log.eventMeta?.icon);
            const eventColor = log.eventMeta?.color || '#94a3b8';

            return (
              <div
                key={log.id}
                className={`log-item ${log.severity === 'HIGH' || log.severity === 'CRITICAL' ? 'critical' : ''}`}
                style={{ borderLeftColor: log.sourceColor }}
              >
                <div className="log-header">
                  <div className="log-source" style={{ color: log.sourceColor }}>
                    {log.sourceName}
                    <span className="log-source-pill" style={{ background: log.requestColor }}>
                      {log.requestLabel}
                    </span>
                  </div>
                  <div className="log-severity">
                    {getSeverityIcon(log.severity)}
                    <span>{log.severity || 'INFO'}</span>
                  </div>
                  <div className="log-timestamp">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <div className="log-content">
                  <div className="log-message">
                    <strong>{log.methodLabel}</strong> {log.intent}
                  </div>
                  {log.message && (
                    <div className="log-note">{log.message}</div>
                  )}
                  <div className="log-badges">
                    {log.eventMeta && (
                      <span className="event-pill" style={{ background: `${eventColor}22`, color: eventColor }}>
                        <EventIcon size={14} />
                        {log.eventMeta.label}
                      </span>
                    )}
                  </div>

                  {(log.userEmail || log.ip || log.endpoint || log.resource) && (
                    <div className="log-details">
                      {log.userEmail && <span>Usuario: {log.userEmail}</span>}
                      {log.ip && <span>IP: {log.ip}</span>}
                      {(log.endpoint || log.resource) && (
                        <span>Endpoint: {log.endpoint || log.resource}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Componente para la pestaña de Analíticas
function AnalyticsTab({ logs, requestInsights }) {
  // Agrupar logs por hora para el gráfico de timeline
  const hourlyData = logs.reduce((acc, log) => {
    const date = new Date(log.timestamp);
    const label = `${date.getHours().toString().padStart(2, '0')}:00`;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const timelineData = Object.entries(hourlyData).map(([hour, count]) => ({
    hour,
    requests: count
  }));

  return (
    <div className="analytics-tab">
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Actividad por Hora</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h4>Métricas de Seguridad</h4>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Total de Eventos</span>
              <span className="metric-value">{logs.length}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Eventos Críticos</span>
              <span className="metric-value" style={{ color: '#ef4444' }}>
                {logs.filter(l => l.severity === 'HIGH' || l.severity === 'CRITICAL').length}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Intentos de Login</span>
              <span className="metric-value" style={{ color: '#38bdf8' }}>
                {requestInsights.specialCounts.loginAttempts}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Alertas BOLA</span>
              <span className="metric-value" style={{ color: '#f43f5e' }}>
                {requestInsights.specialCounts.bolaAlerts}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Operaciones de Escritura</span>
              <span className="metric-value" style={{ color: '#f97316' }}>
                {requestInsights.specialCounts.writeOps}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Mix de Métodos</h4>
          <div className="method-pills">
            {requestInsights.methodMix.length === 0 ? (
              <span className="empty-pill">Sin datos</span>
            ) : (
              requestInsights.methodMix.map((method) => (
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
            {requestInsights.topEndpoints.length === 0 ? (
              <div className="empty-pill">Aún sin actividad</div>
            ) : (
              requestInsights.topEndpoints.map((endpoint) => (
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
        <EventIntelPanel eventHighlights={requestInsights.eventHighlights} variant="compact" />
      </div>
    </div>
  );
}

function RequestTypeGrid({ requestInsights }) {
  if (!requestInsights.categories.length) {
    return (
      <div className="request-card">
        <h4>Clasificación de Peticiones</h4>
        <div className="empty-pill">Esperando tráfico...</div>
      </div>
    );
  }

  return (
    <div className="request-grid">
      {requestInsights.categories.map((category) => {
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




export default App;