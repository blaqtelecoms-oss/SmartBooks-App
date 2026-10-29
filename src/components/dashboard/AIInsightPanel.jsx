import React from "react";
import { Sparkles, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function AIInsightPanel({ transactions, taxReturns }) {
  const unallocated = transactions?.filter(t => t.status === "unallocated")?.length || 0;
  const duplicates = transactions?.filter(t => t.is_duplicate)?.length || 0;
  const pendingTax = taxReturns?.filter(t => t.status === "draft" || t.status === "calculated")?.length || 0;

  const insights = [];
  if (unallocated > 0) {
    insights.push({ icon: AlertTriangle, color: "text-[#F59E0B]", bg: "bg-amber-50", text: `${unallocated} unallocated transaction${unallocated > 1 ? "s" : ""} pending review` });
  }
  if (duplicates > 0) {
    insights.push({ icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", text: `${duplicates} potential duplicate${duplicates > 1 ? "s" : ""} detected` });
  }
  if (pendingTax > 0) {
    insights.push({ icon: Clock, color: "text-[#3B82F6]", bg: "bg-blue-50", text: `${pendingTax} tax return${pendingTax > 1 ? "s" : ""} need attention` });
  }
  if (insights.length === 0) {
    insights.push({ icon: CheckCircle, color: "text-[#22C55E]", bg: "bg-green-50", text: "All caught up! Your books are in good shape." });
  }

  return (
    <div className="bg-white rounded-xl border border-[#DDE6DF] p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#EFF4F0] flex items-center justify-center">
          <Sparkles size={15} className="text-[#2D5A43]" />
        </div>
        <h3 className="text-[15px] font-medium text-[#1A2E22]">AI Insights</h3>
      </div>
      <div className="space-y-2.5">
        {insights.map((insight, i) => (
          <div key={i} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg ${insight.bg}`}>
            <insight.icon size={16} className={`${insight.color} mt-0.5 flex-shrink-0`} />
            <p className="text-[13px] text-[#1A2E22]">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}