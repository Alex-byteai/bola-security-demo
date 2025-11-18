import {
  Shield,
  ShoppingBag,
  Edit3,
  Target,
  ShieldAlert,
  Trash2,
  UserX,
  CreditCard,
  ShieldCheck,
  ShieldOff,
  AlertOctagon,
  Eye,
  Users,
  Gavel,
  KeyRound,
  Activity,
  Radar,
  FileWarning
} from "lucide-react";

export const DEFAULT_EVENT_META = {
  key: "GENERAL",
  label: "Evento de seguridad",
  description: "Actividad registrada por las APIs",
  color: "#94a3b8",
  icon: Shield,
};

export const ensureIconComponent = (IconCandidate) =>
  typeof IconCandidate === "function" ? IconCandidate : Shield;

export const humanizeEventKey = (key = "") =>
  key
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const EVENT_TAXONOMY = {
  ORDER_CREATED: {
    label: "Orden creada (segura)",
    description: "Flujo protegido completado en la API segura",
    color: "#10b981",
    icon: ShoppingBag,
  },
  ORDER_MODIFIED_BOLA: {
    label: "Orden modificada sin ownership",
    description: "Actualización vulnerable detectada en la API insegura",
    color: "#f97316",
    icon: Edit3,
  },
  ORDER_ACCESS_ATTEMPT: {
    label: "Intento de lectura de orden",
    description: "Posible enumeración BOLA / acceso cruzado",
    color: "#fb7185",
    icon: Target,
  },
  UNAUTHORIZED_ACCESS_ATTEMPT: {
    label: "Acceso no autorizado bloqueado",
    description: "Ownership enforcement en acción",
    color: "#f97316",
    icon: ShieldAlert,
  },
  UNAUTHORIZED_UPDATE_BLOCKED: {
    label: "Actualización bloqueada",
    description: "Intento de modificar recursos ajenos detenido",
    color: "#f59e0b",
    icon: ShieldAlert,
  },
  UNAUTHORIZED_DELETE_BLOCKED: {
    label: "Eliminación bloqueada",
    description: "Se evitó borrar un recurso sin permisos",
    color: "#f59e0b",
    icon: Trash2,
  },
  UNAUTHORIZED_USER_ACCESS: {
    label: "Usuario protegido",
    description: "Intento de leer datos de otro usuario",
    color: "#f97316",
    icon: UserX,
  },
  UNAUTHORIZED_USER_UPDATE_BLOCKED: {
    label: "Modificación de usuario bloqueada",
    description: "Solo el propietario/admin puede editar",
    color: "#f97316",
    icon: UserX,
  },
  USER_DELETED_BY_ADMIN: {
    label: "Usuario eliminado por admin",
    description: "Acción administrativa registrada",
    color: "#f87171",
    icon: Trash2,
  },
  PAYMENT_CREATED: {
    label: "Pago creado",
    description: "Transacción financiera registrada",
    color: "#ec4899",
    icon: CreditCard,
  },
  PAYMENT_CREATED_SECURE: {
    label: "Pago seguro creado",
    description: "Transacción protegida",
    color: "#10b981",
    icon: CreditCard,
  },
  PAYMENT_FLAGGED: {
    label: "Pago monitoreado",
    description: "Actividad financiera sensible",
    color: "#ec4899",
    icon: CreditCard,
  },
  ADMIN_PAYMENTS_ACCESS: {
    label: "Reporte financiero consultado",
    description: "Acceso privilegiado a pagos",
    color: "#14b8a6",
    icon: ShieldCheck,
  },
  ADMIN_ACCESS_GRANTED: {
    label: "Acceso admin concedido",
    description: "Operación privilegiada autorizada",
    color: "#10b981",
    icon: ShieldCheck,
  },
  ADMIN_ACCESS_DENIED: {
    label: "Acceso admin denegado",
    description: "Intento privilegiado bloqueado",
    color: "#f97316",
    icon: ShieldOff,
  },
  ADMIN_AUDIT: {
    label: "Auditoría administrativa",
    description: "Consulta de panel seguro",
    color: "#14b8a6",
    icon: Gavel,
  },
  ADMIN_HEALTH_CHECK: {
    label: "Monitoreo del sistema",
    description: "Llamada a health/stats",
    color: "#22d3ee",
    icon: Radar,
  },
  RATE_LIMIT_EXCEEDED: {
    label: "Rate limit excedido",
    description: "Protección anti abuso activada",
    color: "#fde047",
    icon: AlertOctagon,
  },
  ORDER_MODIFIED_SAFE: {
    label: "Orden actualizada con ownership",
    description: "Cambio permitido tras validar propietario",
    color: "#10b981",
    icon: Edit3,
  },
  ORDER_MODIFIED: {
    label: "Orden actualizada",
    description: "Evento de modificación registrado",
    color: "#10b981",
    icon: Edit3,
  },
  ORDER_DELETED_SAFE: {
    label: "Orden eliminada con verificación",
    description: "Eliminación autorizada",
    color: "#10b981",
    icon: Trash2,
  },
  ORDER_MODIFIED_BOLA_ALERT: {
    label: "Orden vulnerable editada",
    description: "Contexto inseguro detectado",
    color: "#f97316",
    icon: ShieldAlert,
  },
  ORDER_MODIFIED_BOLA_V2: {
    label: "Orden vulnerada",
    description: "BOLA en modificación de órdenes",
    color: "#f97316",
    icon: Edit3,
  },
  ORDER_ACCESS_BOLA: {
    label: "Orden ajena leída (BOLA)",
    description: "Lectura de recursos de otro usuario sin control",
    color: "#f43f5e",
    icon: Eye,
  },
  ORDER_DELETED_BOLA: {
    label: "Orden ajena eliminada (BOLA)",
    description: "Eliminación sin ownership en API vulnerable",
    color: "#f87171",
    icon: Trash2,
  },
  ORDER_ACCESS_ALERT: {
    label: "Orden consultada",
    description: "Lectura de recursos monitoreada",
    color: "#fb7185",
    icon: Target,
  },
  ORDER_CREATED_SAFE: {
    label: "Orden segura creada",
    description: "Flujo protegido completado",
    color: "#10b981",
    icon: ShoppingBag,
  },
  USER_DATA_ACCESS_ATTEMPT: {
    label: "Intento de ver datos ajenos",
    description: "Lectura no autorizada",
    color: "#fb7185",
    icon: Users,
  },
  USER_PROFILE_VIEWED: {
    label: "Perfil de usuario consultado",
    description: "Lectura de información sensible",
    color: "#6366f1",
    icon: Users,
  },
  BOLA_ATTEMPT: {
    label: "Ataque BOLA detectado",
    description: "Patrón crítico en curso",
    color: "#f43f5e",
    icon: Target,
  },
  UNAUTHORIZED_ACCESS_BLOCKED: {
    label: "Acceso bloqueado (seguro)",
    description: "La API segura frenó lectura de orden ajena",
    color: "#10b981",
    icon: ShieldCheck,
  },
  UNAUTHORIZED_UPDATE_BLOCKED_SECURE: {
    label: "Actualización bloqueada (seguro)",
    description: "Se impidió editar una orden ajena",
    color: "#14b8a6",
    icon: ShieldCheck,
  },
  UNAUTHORIZED_DELETE_BLOCKED_SECURE: {
    label: "Eliminación bloqueada (seguro)",
    description: "Se evitó borrar recursos sin permiso",
    color: "#14b8a6",
    icon: ShieldCheck,
  },
  ALERT_POLICY_TRIGGERED: {
    label: "Política activada",
    description: "Una regla automatizada fue disparada",
    color: "#fde047",
    icon: FileWarning,
  },
  LOGIN_ATTEMPT: {
    label: "Intento de login",
    description: "Actividad de autenticación",
    color: "#38bdf8",
    icon: KeyRound,
  },
  AUTH_FAILURE: {
    label: "Fallo de autenticación",
    description: "Credenciales inválidas",
    color: "#f87171",
    icon: ShieldAlert,
  },
  GENERAL_ACTIVITY: {
    label: "Tráfico general",
    description: "Evento sin clasificar",
    color: "#94a3b8",
    icon: Activity,
  },
};

export const getEventMeta = (log) => {
  if (!log || typeof log !== "object") {
    return DEFAULT_EVENT_META;
  }

  const rawKey = ((log.event || log.securityEvent || "").toUpperCase()).trim();
  if (!rawKey) {
    return DEFAULT_EVENT_META;
  }

  const meta = EVENT_TAXONOMY[rawKey];
  if (meta) {
    return {
      ...DEFAULT_EVENT_META,
      ...meta,
      key: rawKey,
      icon: ensureIconComponent(meta.icon),
    };
  }

  return {
    ...DEFAULT_EVENT_META,
    key: rawKey,
    label: humanizeEventKey(rawKey),
    icon: ensureIconComponent(DEFAULT_EVENT_META.icon),
  };
};
