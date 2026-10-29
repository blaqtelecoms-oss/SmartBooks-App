import {
  LayoutDashboard, Building2, Upload, BookOpen, FileText, Calculator,
  Shield, Settings, MessageSquare, Users, ArrowLeftRight, Receipt,
  Wand2, ScanLine, Landmark, Warehouse, CreditCard, Clock, FileBarChart,
  Scale, FileSpreadsheet, TrendingUp, Wallet, HandCoins,
} from "lucide-react";

// Both portals share one navigation, so the business and accountant portals
// expose exactly the same pages and features.
// Items are grouped into categories; `group` drives both the desktop sidebar
// headings and the mobile drawer sections, in first-appearance order.
export const portalNav = [
  // ---- Workspace
  { label: "Dashboard", icon: LayoutDashboard, path: "/", group: "Workspace" },
  { label: "Scan Receipt", icon: ScanLine, path: "/scan-receipt", group: "Workspace" },
  { label: "Transactions", icon: ArrowLeftRight, path: "/transactions", group: "Workspace" },
  { label: "Upload Statement", icon: Upload, path: "/upload", group: "Workspace" },
  { label: "AI Assistant", icon: MessageSquare, path: "/assistant", group: "Workspace" },

  // ---- Accounting
  { label: "Trial Balance", icon: Scale, path: "/trial-balance", group: "Accounting" },
  { label: "Balance Sheet", icon: FileSpreadsheet, path: "/balance-sheet", group: "Accounting" },
  { label: "Profit & Loss", icon: TrendingUp, path: "/profit-loss", group: "Accounting" },
  { label: "Expenses", icon: Wallet, path: "/expenses", group: "Accounting" },
  { label: "Invoices", icon: CreditCard, path: "/invoices", group: "Accounting" },
  { label: "Debtors & Creditors", icon: HandCoins, path: "/debtors-creditors", group: "Accounting" },

  // ---- Tax
  { label: "Tax", icon: Calculator, path: "/tax", group: "Tax" },
  { label: "VAT 201", icon: FileBarChart, path: "/vat201", group: "Tax" },

  // ---- Stock
  { label: "Inventory", icon: Warehouse, path: "/inventory", group: "Stock" },

  // ---- Records
  { label: "Chart of Accounts", icon: BookOpen, path: "/accounts", group: "Records" },
  { label: "Allocation Rules", icon: Wand2, path: "/rules", group: "Records" },
  { label: "Bank Rules", icon: Landmark, path: "/bank-rules", group: "Records" },
  { label: "Receipts", icon: Receipt, path: "/documents", group: "Records" },
  { label: "Reports", icon: FileText, path: "/reports", group: "Records" },
  { label: "Aging Reports", icon: Clock, path: "/aging", group: "Records" },

  // ---- Admin
  { label: "Companies", icon: Building2, path: "/companies", group: "Admin" },
  { label: "Team", icon: Users, path: "/team", group: "Admin" },
  { label: "Audit Log", icon: Shield, path: "/audit", group: "Admin" },
  { label: "Settings", icon: Settings, path: "/settings", group: "Admin" },
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
