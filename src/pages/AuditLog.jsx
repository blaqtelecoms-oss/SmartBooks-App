import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Shield, Loader2 } from "lucide-react";
import moment from "moment";

export default function AuditLog() {
  const { currentCompany } = useOutletContext();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany) loadLogs();
  }, [currentCompany]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      setLogs(await base44.entities.AuditLog.filter({ company_id: currentCompany.id }, "-created_date", 50));
    } catch (e) {}
    setLoading(false);
  };

  if (!currentCompany) return <p className="text-center text-[#6B6B72] py-20">Select a company first</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-medium text-[#0F0F0F] tracking-tight">Audit Trail</h1>
        <p className="text-[13px] text-[#6B6B72] mt-1">POPIA-compliant activity log for {currentCompany.name}</p>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={24} className="animate-spin text-[#6B6B72] mx-auto" /></div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E8] p-12 text-center">
          <Shield size={32} className="text-[#6B6B72] mx-auto mb-3" strokeWidth={1} />
          <p className="text-[15px] font-medium text-[#0F0F0F]">No audit logs yet</p>
          <p className="text-[13px] text-[#6B6B72] mt-1">Activity will be logged as you use the system</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E5E8] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E5E5E8]">
                <th className="text-left px-4 py-3 text-[11px] text-[#6B6B72] uppercase tracking-wider font-medium">Timestamp</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#6B6B72] uppercase tracking-wider font-medium">User</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#6B6B72] uppercase tracking-wider font-medium">Action</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#6B6B72] uppercase tracking-wider font-medium">Entity</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#6B6B72] uppercase tracking-wider font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-[#F7F7FA] hover:bg-[#F7F7FA]">
                  <td className="px-4 py-2.5 text-[#6B6B72] whitespace-nowrap">{moment(log.created_date).format("DD/MM/YY HH:mm")}</td>
                  <td className="px-4 py-2.5">{log.user_name || "System"}</td>
                  <td className="px-4 py-2.5"><span className="bg-[#F1F1F4] px-1.5 py-0.5 rounded text-[11px]">{log.action}</span></td>
                  <td className="px-4 py-2.5 text-[#6B6B72]">{log.entity_type || "—"}</td>
                  <td className="px-4 py-2.5 text-[#6B6B72] max-w-[200px] truncate">{log.details || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}