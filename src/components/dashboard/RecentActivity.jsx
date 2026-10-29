import React from "react";
import moment from "moment";

export default function RecentActivity({ logs, loading }) {
  if (loading) {
    return <div className="sb-card h-[200px] animate-pulse" />;
  }

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  };

  return (
    <div className="sb-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="sb-display" style={{ fontSize: 28, lineHeight: 1.1, color: "var(--sb-ink)" }}>
          Recent activity
        </h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--sb-muted)" }} aria-hidden="true">
          <circle cx="12" cy="5" r="0.6" />
          <circle cx="12" cy="12" r="0.6" />
          <circle cx="12" cy="19" r="0.6" />
        </svg>
      </div>
      <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sb-muted)" }}>Today</p>
      <div className="mt-1">
        {logs.length === 0 ? (
          <p className="py-4 text-[13px]" style={{ color: "var(--sb-muted)" }}>No recent activity</p>
        ) : (
          logs.map((log, i) => (
            <div key={log.id} className="relative mt-4 flex gap-3">
              {i < logs.length - 1 && (
                <div className="absolute left-[16px] top-[36px] bottom-[-16px]" style={{ borderLeft: "1px solid var(--sb-border)" }} />
              )}
              <div
                className="grid h-8 w-8 flex-none place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ background: "var(--sb-brand)" }}
              >
                {getInitials(log.user_name)}
              </div>
              <p className="text-[13px] leading-[1.5]" style={{ color: "var(--sb-muted)" }}>
                <b className="font-bold" style={{ color: "var(--sb-ink)" }}>{log.user_name || "Unknown"}</b> {log.action}
                <br />
                <small className="text-[11px]" style={{ color: "var(--sb-muted)" }}>
                  {moment(log.created_date).format("hh:mm a")}
                </small>
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
