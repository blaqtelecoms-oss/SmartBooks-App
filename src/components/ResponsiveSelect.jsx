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
  searchable = false,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);
  const label = selected ? selected.label : placeholder;
  const visibleOptions =
    searchable && query.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
      : options;

  const closeDrawer = () => {
    setOpen(false);
    setQuery("");
  };

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
    <Drawer open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDrawer())}>
      <DrawerTrigger asChild>
        <button
          type="button"
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
        {searchable && (
          <div className="px-4 pb-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search options"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-[13px] outline-none"
            />
          </div>
        )}
        <div className="overflow-y-auto max-h-[50vh] pb-4">
          {visibleOptions.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-[#6B6B72]">No matches</p>
          ) : visibleOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onValueChange(o.value);
                closeDrawer();
              }}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left text-[14px] hover:bg-[#EFF4F0] transition-colors ${
                o.value === value
                  ? "text-[#2D5A43] font-medium bg-[#EFF4F0]"
                  : "text-[#1A2E22]"
              }`}
            >
              <span className="min-w-0 flex-1" style={{ overflowWrap: "anywhere" }}>{o.label}</span>
              {o.value === value && <Check size={16} className="flex-none" />}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}