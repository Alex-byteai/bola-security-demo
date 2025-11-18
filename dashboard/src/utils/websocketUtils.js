import { attachRequestIntel } from "./requestUtils";

export const extractLogsFromPayload = (payload) => {
  if (!payload) return [];
  if (payload.type === "initial") return payload.logs || [];
  if (payload.type === "new") return [payload.log];
  if (Array.isArray(payload)) return payload;
  return [payload];
};

export const createLogEntry = (rawLog, key, config) => {
  const safeLog = typeof rawLog === "object" ? rawLog : {};

  return attachRequestIntel({
    ...safeLog,
    id: `${Date.now()}-${Math.random()}`,
    timestamp: safeLog.timestamp || new Date().toISOString(),
    source: key,
    sourceName: config.name,
    sourceColor: config.color,
  });
};
