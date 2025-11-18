# BOLA Vulnerability Demo

Dashboard interactivo y APIs (segura/vulnerable) para demostrar ataques Broken Object Level Authorization (BOLA) y verlos en tiempo real.

## Contenido

- [Arquitectura](#arquitectura)
- [Tecnologías principales](#tecnologías-principales)
- [Prerequisitos](#prerequisitos)
- [Configuración](#configuración)
- [Ejecución con Docker Compose](#ejecución-con-docker-compose)
- [Servicios](#servicios)
- [Dashboard](#dashboard)
- [Logs y WebSockets](#logs-y-websockets)
- [Pruebas y scripts](#pruebas-y-scripts)
- [Próximos pasos sugeridos](#próximos-pasos-sugeridos)

## Arquitectura

```
┌──────────────┐     Websocket     ┌──────────────┐
│  app_secure  │ ───────────────▶  │   dashboard  │
│  (puerto 3001│ ◀───────────────┐ │   (puerto    │
│  ws 8081)    │                  │ │    3002)    │
└──────────────┘                  │ └──────────────┘
                                  │
┌──────────────┐     Websocket    │
│app_vulnerable│ ───────────────▶ │
│ (puerto 3000 │ ◀───────────────┘
│  ws 8082)    │
└──────────────┘
```

- **app_secure**: API con controles de ownership y logging de accesos bloqueados (`UNAUTHORIZED_*_BLOCKED`).
- **app_vulnerable**: API sin validaciones para reproducir ataques BOLA (`ORDER_*_BOLA`).
- **dashboard**: UI React/Vite que recibe eventos por WebSocket y muestra métricas, logs y analíticas.

## Tecnologías principales

| Capa | Tecnologías |
|------|-------------|
| Backend | Node.js, Express, SQLite3, Winston |
| Dashboard | React 18, Vite, Recharts, lucide-react |
| Infra | Docker, Docker Compose |

## Prerequisitos

- Docker 24+ y Docker Compose v2.
- `make` (opcional para comandos abreviados).
- Variables definidas en `.env` (se provee ejemplo):
  ```env
  JWT_SECRET=superSecretKey
  ALLOWED_ORIGINS=http://localhost:3002
  ```

## Configuración

1. Clonar el repositorio.
2. Revisar/ajustar `.env` en la raíz.
3. (Opcional) Limpiar logs previos: `rm -rf app_secure/logs app_vulnerable/logs`.

## Ejecución con Docker Compose

```bash
# Construir y levantar
docker compose up --build

# Detener y limpiar
docker compose down -v
```

Una vez levantado:
- API segura: http://localhost:3001
- API vulnerable: http://localhost:3000
- Dashboard: http://localhost:3002

Si algún contenedor se reinicia, revisar los logs (`docker compose logs -f app_secure`).

## Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| app_secure | 3001 / ws 8081 | API con ownership enforcement y logging de accesos bloqueados. |
| app_vulnerable | 3000 / ws 8082 | API vulnerable a BOLA para demostrar ataques reales. |
| dashboard | 3002 | Monitoring UI que consume ambos WebSockets y resalta eventos. |

## Dashboard

Características principales:
- Tabs **Resumen**, **Logs**, **Analíticas**.
- Clasificación de eventos (`ORDER_ACCESS_BOLA`, `UNAUTHORIZED_UPDATE_BLOCKED`, etc.) con iconos/colores.
- Gráficas via Recharts (actividad por API, severidad, timeline).
- Indicadores de conexión WebSocket con dot verde animado.

Para desarrollo local del dashboard:
```bash
cd dashboard
npm install
npm run dev # http://localhost:3002
```
*(Asegúrate de que las APIs estén levantadas para recibir eventos.)*

## Logs y WebSockets

- Cada API genera `logs/security.log` y `logs/access.log` (montados como volúmenes).
- `app_* /websocket.js` monitorean `security.log` y envían nuevas líneas al dashboard.
- `dashboard/src/utils/websocketUtils.js` normaliza el payload y lo enriquece con metadatos (fuente, color, timestamps).

## Próximos pasos sugeridos

- Añadir autenticación al dashboard si se expone públicamente.
- Extender el README con diagramas (PlantUML, Mermaid) y ejemplos de requests.
- Automatizar pruebas end-to-end con Playwright o Cypress.
