import React from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Optional password for a locked document. Only used to open the file while it is
 * being read — it is never stored with the document.
 */
export default function FilePasswordField({ id = "file-password", value, onChange, hint }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[12.5px] font-semibold text-[#0B1F1A]">
        Document password (optional)
      </Label>
      <div className="relative">
        <Lock
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA9A1]"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="password"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Only for a password-protected file"
          className="h-11 pl-10"
        />
      </div>
      <p className="text-[11.5px] leading-relaxed text-[#6B7280]">
        {hint || "Used once to open this file — never stored."}
      </p>
    </div>
  );
}
