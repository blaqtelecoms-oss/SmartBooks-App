import {
  LayoutDashboard, Building2, Upload, BookOpen, FileText, Calculator,
  Shield, Settings, MessageSquare, Users, ArrowLeftRight, Receipt,
  Wand2, ScanLine, Landmark, Warehouse, CreditCard, Clock, FileBarChart,
} from "lucide-react";

// Both portals share one navigation, so the business and accountant portals
// expose exactly the same pages and features.
// Requested order first (Dashboard, Scan Receipt, Transactions, Upload Statement,
// Invoices, Inventory, Tax, Receipts, Reports, AI Assistant, Settings), then every
// remaining existing destination so no page or route is lost.
// `group` only drives how the mobile drawer organises the same items.
export const portalNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", group: "Workspace" },
  { label: "Scan Receipt", icon: ScanLine, path: "/scan-receipt", group: "Workspace" },
  { label: "Transactions", icon: ArrowLeftRight, path: "/transactions", group: "Workspace" },
  { label: "Upload Statement", icon: Upload, path: "/upload", group: "Workspace" },
  { label: "Invoices", icon: CreditCard, path: "/invoices", group: "Finance" },
  { label: "Inventory", icon: Warehouse, path: "/inventory", group: "Finance" },
  { label: "Tax", icon: Calculator, path: "/tax", group: "Finance" },
  { label: "Receipts", icon: Receipt, path: "/documents", group: "Finance" },
  { label: "Reports", icon: FileText, path: "/reports", group: "Finance" },
  { label: "AI Assistant", icon: MessageSquare, path: "/assistant", group: "Workspace" },
  { label: "Settings", icon: Settings, path: "/settings", group: "Admin" },
  // Additional existing destinations retained
  { label: "Companies", icon: Building2, path: "/companies", group: "Admin" },
  { label: "Allocation Rules", icon: Wand2, path: "/rules", group: "Finance" },
  { label: "Bank Rules", icon: Landmark, path: "/bank-rules", group: "Finance" },
  { label: "Chart of Accounts", icon: BookOpen, path: "/accounts", group: "Finance" },
  { label: "Aging Reports", icon: Clock, path: "/aging", group: "Finance" },
  { label: "VAT 201", icon: FileBarChart, path: "/vat201", group: "Finance" },
  { label: "Team", icon: Users, path: "/team", group: "Admin" },
  { label: "Audit Log", icon: Shield, path: "/audit", group: "Admin" },
];

export const navForPortal = () => portalNav;

export const navGroupsFor = () => {
  const groups = [];
  portalNav.forEach((item) => {
    const existing = groups.find((g) => g.label === item.group);
    if (existing) existing.items.push(item);
    else groups.push({ label: item.group, items: [item] });
  });
  return groups;
};
