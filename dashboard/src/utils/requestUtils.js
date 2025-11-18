import { REQUEST_TYPE_CONFIG } from "./requestTypeConfig";
import { DEFAULT_EVENT_META, getEventMeta } from "./eventUtils";

export const classifyRequestType = (log) => {
  if (!log || typeof log !== "object") return "general";

  const resource = String(log.resource || log.endpoint || log.url || "").toLowerCase();
  const action = String(log.action || "").toLowerCase();
  const event = String(log.event || "").toLowerCase();
  const sec = String(log.securityEvent || "").toLowerCase();

  if (event.includes("bola") || sec.includes("bola")) return "bola";
  if (resource.includes("/auth") || resource.includes("login") || action.includes("login")) return "auth";
  if (resource.includes("/orders")) return "orders";
  if (resource.includes("/users")) return "users";
  if (resource.includes("/payments")) return "payments";
  if (resource.includes("/admin") || resource.includes("/security")) return "admin";
  if (resource.includes("/health") || resource.includes("/stats")) return "monitoring";
  return "general";
};

export const buildIntentLabel = (type, log) => {
  if (!log || typeof log !== "object") return "Actividad general";

  const method = (log.method || "REQ").toUpperCase();
  const verb =
    method === "GET"
      ? "Consulta"
      : method === "POST"
      ? "Creación"
      : method === "PUT"
      ? "Actualización"
      : method === "DELETE"
      ? "Eliminación"
      : method;

  switch (type) {
    case "auth":
      return method === "POST" ? "Intento de login" : "Verificación de sesión";
    case "orders":
      return `${verb} de órdenes`;
    case "users":
      return `${verb} de usuarios`;
    case "payments":
      return `${verb} financiera`;
    case "admin":
      return `${verb} privilegiada`;
    case "monitoring":
      return "Ping de salud / monitoreo";
    case "bola":
      return "Patrón BOLA detectado";
    default:
      return `${verb} general`;
  }
};

const buildFallbackLog = () => ({
  id: `${Date.now()}-${Math.random()}`,
  timestamp: new Date().toISOString(),
  requestType: "general",
  requestLabel: REQUEST_TYPE_CONFIG.general.label,
  requestColor: REQUEST_TYPE_CONFIG.general.color,
  intent: "Actividad general",
  methodLabel: "REQ",
  eventMeta: DEFAULT_EVENT_META,
});

export const attachRequestIntel = (log) => {
  if (!log || typeof log !== "object") {
    return buildFallbackLog();
  }

  const type = classifyRequestType(log);
  const meta = REQUEST_TYPE_CONFIG[type] || REQUEST_TYPE_CONFIG.general;
  const eventMeta = getEventMeta(log);

  return {
    ...log,
    requestType: type,
    requestLabel: meta.label,
    requestColor: meta.color,
    intent: buildIntentLabel(type, log),
    methodLabel: (log.method || "REQ").toUpperCase(),
    eventMeta,
  };
};
