import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Check, ChevronDown } from "lucide-react";

export default function ResponsiveSelect({
  value,
  onValueChange,
  placeholder,
  triggerClassName = "",
  triggerIcon,
  options = [],
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);
  const label = selected ? selected.label : placeholder;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName}>
          {triggerIcon}
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          className={`flex items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-[13px] ${triggerClassName}`}
        >
          {triggerIcon}
          <span className="flex-1 text-left truncate">{label}</span>
          <ChevronDown size={14} className="opacity-50 flex-shrink-0" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-[15px]">
            {placeholder || "Select an option"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto max-h-[50vh] pb-4">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onValueChange(o.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-[14px] hover:bg-[#EFF4F0] transition-colors ${
                o.value === value
                  ? "text-[#2D5A43] font-medium bg-[#EFF4F0]"
                  : "text-[#1A2E22]"
              }`}
            >
              {o.label}
              {o.value === value && <Check size={16} />}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}