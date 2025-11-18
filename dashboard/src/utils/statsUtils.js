import { REQUEST_TYPE_CONFIG } from "./requestTypeConfig";
import { DEFAULT_EVENT_META, humanizeEventKey } from "./eventUtils";

const DEFAULT_SOURCE_STATS = { total: 0, blocked: 0, critical: 0 };

const isCriticalSeverity = (severity = "") =>
  ["HIGH", "CRITICAL"].includes(String(severity).toUpperCase());

const isBlockedEvent = (log = {}) => {
  const eventText = String(log.event || "").toUpperCase();
  const securityText = String(log.securityEvent || "").toUpperCase();
  return (
    eventText.includes("BLOCKED") ||
    eventText.includes("UNAUTHORIZED") ||
    securityText.includes("BLOCKED") ||
    securityText.includes("UNAUTHORIZED")
  );
};

export const updateStatsWithLog = (currentStats, log) => {
  if (!log || typeof log !== "object" || !log.source) {
    return currentStats;
  }

  const prev = currentStats[log.source] || DEFAULT_SOURCE_STATS;

  return {
    ...currentStats,
    [log.source]: {
      total: prev.total + 1,
      blocked: prev.blocked + (isBlockedEvent(log) ? 1 : 0),
      critical: prev.critical + (isCriticalSeverity(log.severity) ? 1 : 0),
    },
  };
};

export const buildRequestInsights = (logList = []) => {
  if (!Array.isArray(logList) || logList.length === 0) {
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
        readOps: 0,
      },
      eventHighlights: [],
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
    if (!log || typeof log !== "object") {
      return;
    }

    const type = log.requestType || "general";
    categoryCounts[type] = (categoryCounts[type] || 0) + 1;

    const method = (log.method || "GET").toUpperCase();
    methodCounts[method] = (methodCounts[method] || 0) + 1;

    const endpoint = log.resource || log.endpoint || log.url || "desconocido";
    const endpointKey = `${method} ${endpoint}`;
    if (!endpointMap[endpointKey]) {
      endpointMap[endpointKey] = {
        key: endpointKey,
        method,
        endpoint,
        count: 0,
        type,
      };
    }
    endpointMap[endpointKey].count += 1;

    if (type === "auth" && method === "POST") loginAttempts += 1;
    if (type === "bola") bolaAlerts += 1;
    if (type === "admin") adminCalls += 1;

    if (method === "GET") {
      readOps += 1;
    } else {
      writeOps += 1;
    }

    const eventKey = (
      log.eventMeta?.key || log.event || log.securityEvent || "GENERAL"
    ).toUpperCase();
    if (!eventCounts[eventKey]) {
      eventCounts[eventKey] = {
        key: eventKey,
        label: log.eventMeta?.label || humanizeEventKey(eventKey),
        description:
          log.eventMeta?.description || DEFAULT_EVENT_META.description,
        color: log.eventMeta?.color || DEFAULT_EVENT_META.color,
        icon: log.eventMeta?.icon || DEFAULT_EVENT_META.icon,
        count: 0,
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
        share: ((count / total) * 100).toFixed(1),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const methodMix = Object.entries(methodCounts)
    .map(([method, count]) => ({
      method,
      count,
      share: Math.round((count / total) * 100),
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
      readOps,
    },
    eventHighlights: Object.values(eventCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4),
  };
};
