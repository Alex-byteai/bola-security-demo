import {
  Activity,
  Database,
  KeyRound,
  Users,
  ShoppingBag,
  CreditCard,
  ShieldCheck,
  Target,
} from "lucide-react";

export const REQUEST_TYPE_CONFIG = {
  general: {
    id: "general",
    label: "Tráfico General",
    color: "#94a3b8",
    icon: Activity,
  },
  auth: {
    id: "auth",
    label: "Autenticación / Login",
    color: "#38bdf8",
    icon: KeyRound,
  },
  users: {
    id: "users",
    label: "Gestión de Usuarios",
    color: "#c084fc",
    icon: Users,
  },
  orders: {
    id: "orders",
    label: "Operaciones de Órdenes",
    color: "#f97316",
    icon: ShoppingBag,
  },
  payments: {
    id: "payments",
    label: "Pagos y Finanzas",
    color: "#ec4899",
    icon: CreditCard,
  },
  admin: {
    id: "admin",
    label: "Panel y Administración",
    color: "#14b8a6",
    icon: ShieldCheck,
  },
  monitoring: {
    id: "monitoring",
    label: "Monitoreo / Health",
    color: "#22d3ee",
    icon: Database,
  },
  bola: {
    id: "bola",
    label: "Alertas BOLA",
    color: "#f43f5e",
    icon: Target,
  },
};
