import React from "react";
import { ensureIconComponent } from "../utils/eventUtils";

export default function EventIntelPanel({ eventHighlights = [], variant = "grid" }) {
  if (!eventHighlights.length) {
    return <div className="empty-pill">Aún no hay eventos catalogados</div>;
  }

  if (variant === "compact") {
    return (
      <div className="event-intel-list">
        {eventHighlights.map((event) => {
          const Icon = ensureIconComponent(event.icon);
          return (
            <div key={event.key} className="event-intel-list-item">
              <div
                className="event-intel-icon"
                style={{ background: `${event.color}22`, color: event.color }}
              >
                <Icon size={16} />
              </div>
              <div className="event-intel-meta">
                <p className="event-intel-label">{event.label}</p>
                <p className="event-intel-description">{event.description}</p>
              </div>
              <span className="event-intel-count" style={{ color: event.color }}>
                {event.count}×
              </span>
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
            <div
              className="event-intel-icon"
              style={{ background: `${event.color}22`, color: event.color }}
            >
              <Icon size={18} />
            </div>
            <div className="event-intel-meta">
              <p className="event-intel-label">{event.label}</p>
              <p className="event-intel-description">{event.description}</p>
            </div>
            <span className="event-intel-count" style={{ color: event.color }}>
              {event.count}×
            </span>
          </div>
        );
      })}
    </div>
  );
}
