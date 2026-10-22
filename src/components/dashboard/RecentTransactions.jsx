import React, { useState } from "react";
import moment from "moment";

const STATUS_STYLES = {
  allocated: "bg-[#e9f3ea] text-[#2D5A43]",
  reviewed: "bg-[#e6eff8] text-[#4a7fb5]",
  unallocated: "bg-[#fbf1e1] text-[#B8915A]",
};

export default function RecentTransactions({ transactions, loading }) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = statusFilter === "all"
    ? transactions
    : transactions.filter(t => t.status === statusFilter);

  const formatR = (v) => `R ${(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="bg-white rounded-[14px] border border-[#e4ebe5] p-5" style={{ boxShadow: "0 1px 2px rgba(45,90,67,0.04)" }}>
        <div className="h-[200px] animate-pulse bg-[#e9f3ea] rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[14px] border border-[#e4ebe5] p-5" style={{ boxShadow: "0 1px 2px rgba(45,90,67,0.04)" }}>
      <div className="flex justify-between items-start gap-2.5">
        <h3 className="text-[17px] font-semibold mt-1">Recent Transactions</h3>
        <div className="flex gap-2">
          <div className="border border-[#e4ebe5] bg-white rounded-[8px] px-3 py-2 text-[13px] font-medium flex items-center gap-1.5 cursor-default">
            This Year
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#e4ebe5] bg-white rounded-[8px] px-3 py-2 text-[13px] font-medium cursor-pointer focus:outline-none appearance-none"
            style={{ paddingRight: "28px" }}
          >
            <option value="all">Filter</option>
            <option value="allocated">Allocated</option>
            <option value="reviewed">Reviewed</option>
            <option value="unallocated">Unallocated</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto mt-3">
        <table className="w-full border-collapse min-w-[560px]">
          <thead>
            <tr>
              <th className="bg-[#e9f3ea] text-left text-[13px] font-medium text-[#5C7263] px-3 py-2.5 rounded-l-[8px]">Description</th>
              <th className="bg-[#e9f3ea] text-left text-[13px] font-medium text-[#5C7263] px-3 py-2.5">Date</th>
              <th className="bg-[#e9f3ea] text-left text-[13px] font-medium text-[#5C7263] px-3 py-2.5">Amount</th>
              <th className="bg-[#e9f3ea] text-left text-[13px] font-medium text-[#5C7263] px-3 py-2.5">Account</th>
              <th className="bg-[#e9f3ea] text-center text-[13px] font-medium text-[#5C7263] px-3 py-2.5 rounded-r-[8px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-[14px] text-[#7A8E7E] py-8">
                  No transactions found
                </td>
              </tr>
            ) : (
              filtered.slice(0, 8).map(tx => (
                <tr key={tx.id}>
                  <td className="px-3 py-3 border-b border-[#e4ebe5] text-[14px]">
                    <b>{tx.description}</b>
                    <small className="block text-[#7A8E7E] text-[12px] mt-0.5">
                      {tx.category || tx.supplier_name || "—"}
                    </small>
                  </td>
                  <td className="px-3 py-3 border-b border-[#e4ebe5] text-[14px]">
                    {moment(tx.date).format("YYYY-MM-DD")}
                    <small className="block text-[#7A8E7E] text-[12px] mt-0.5">
                      {moment(tx.created_date).format("HH:mm")}
                    </small>
                  </td>
                  <td className="px-3 py-3 border-b border-[#e4ebe5] text-[14px]">
                    <b>{formatR(tx.amount)}</b>
                  </td>
                  <td className="px-3 py-3 border-b border-[#e4ebe5] text-[14px] text-[#7A8E7E]">
                    {tx.account_name || "—"}
                    <small className="block text-[12px] mt-0.5">
                      {tx.contra_account_name || ""}
                    </small>
                  </td>
                  <td className="px-3 py-3 border-b border-[#e4ebe5] text-center">
                    <span
                      className={`text-[12px] font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[tx.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}