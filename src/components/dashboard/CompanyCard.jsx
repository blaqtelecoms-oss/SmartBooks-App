import React from "react";
import { Link } from "react-router-dom";
import { Upload, ScanLine, FileText, Calculator, Plus, Building2 } from "lucide-react";

export default function CompanyCard({ company, bankBalance, formatR, portal }) {
  const quickActions = [
    { label: "Upload", icon: Upload, path: "/upload" },
    { label: "Scan", icon: ScanLine, path: "/scan-receipt" },
    { label: "Reports", icon: FileText, path: "/reports" },
    { label: "Tax", icon: Calculator, path: "/tax" },
  ];

  return (
    <div className="bg-white rounded-[14px] border border-[#e4ebe5] p-5" style={{ boxShadow: "0 1px 2px rgba(45,90,67,0.04)" }}>
      <div className="flex justify-between items-start gap-2.5">
        <h3 className="text-[17px] font-semibold">Active Company</h3>
        {portal !== "business" && (
          <Link
            to="/companies"
            className="bg-[#2D5A43] text-white rounded-[9px] px-3 py-1.5 text-[13px] font-semibold flex items-center gap-1 hover:bg-[#1F4030] transition-colors"
          >
            <Plus size={14} strokeWidth={2} /> Add Company
          </Link>
        )}
      </div>

      <div
        className="rounded-[14px] p-4 h-[160px] relative overflow-hidden mt-3.5"
        style={{
          background: "linear-gradient(135deg, #bfe0c5, #8fbf98 60%, #7fb08a)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)",
        }}
      >
        <Building2 size={24} className="text-[#12301f]" strokeWidth={1.6} />
        <h4 className="text-[19px] font-semibold mt-5 text-[#12301f]">{company.name}</h4>
        <div className="absolute left-4 bottom-4 text-[#12301f]">
          <small className="block text-[12px] opacity-70">Bank Balance</small>
          <b className="text-[22px]">{formatR(bankBalance)}</b>
        </div>
        <div className="absolute right-4 bottom-4 text-[12px] text-[#12301f] text-right leading-[1.6]">
          {company.vat_number ? `VAT ${company.vat_number}` : ""}<br />
          {company.financial_year_end ? `FY ends ${company.financial_year_end.slice(0, 3)}` : ""}
        </div>
        <div
          className="absolute -right-[30px] -top-[40px] w-[160px] h-[160px] rounded-full"
          style={{ background: "rgba(255,255,255,0.18)" }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {quickActions.map(action => (
          <Link
            key={action.label}
            to={action.path}
            className="bg-[#e9f3ea] rounded-[10px] pt-2.5 pb-2 text-center text-[13px] font-medium text-[#1A2E22] hover:bg-[#d6ebd9] transition-colors"
          >
            <action.icon size={22} className="block mx-auto mb-1.5" strokeWidth={1.6} />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}