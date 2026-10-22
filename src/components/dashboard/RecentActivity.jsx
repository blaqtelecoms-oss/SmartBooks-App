import React from "react";
import moment from "moment";

export default function RecentActivity({ logs, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-[14px] border border-[#e4ebe5] p-5 h-[200px] animate-pulse" />
    );
  }

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  return (
    <div className="bg-white rounded-[14px] border border-[#e4ebe5] p-5" style={{ boxShadow: "0 1px 2px rgba(45,90,67,0.04)" }}>
      <div className="flex justify-between items-start">
        <h3 className="text-[17px] font-semibold">Recent Activity</h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7A8E7E" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="5" r="0.6" />
          <circle cx="12" cy="12" r="0.6" />
          <circle cx="12" cy="19" r="0.6" />
        </svg>
      </div>
      <p className="mt-3 text-[14px] font-medium">Today</p>
      <div className="mt-1">
        {logs.length === 0 ? (
          <p className="text-[14px] text-[#7A8E7E] py-4">No recent activity</p>
        ) : (
          logs.map((log, i) => (
            <div key={log.id} className="flex gap-3 mt-4 relative">
              {i < logs.length - 1 && (
                <div className="absolute left-[16px] top-[36px] bottom-[-16px] border-l border-[#e4ebe5]" />
              )}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[12px] text-white flex-none"
                style={{ background: "linear-gradient(135deg, #6BA17E, #2D5A43)" }}
              >
                {getInitials(log.user_name)}
              </div>
              <p className="text-[13px] leading-[1.5] text-[#5C7263]">
                <b className="text-[#1A2E22] font-semibold">{log.user_name || "Unknown"}</b> {log.action}
                <br />
                <small className="text-[#7A8E7E] text-[12px]">
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