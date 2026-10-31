import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { outstandingByContact } from "@/lib/ledger";
import { formatRand } from "@/lib/money";
import {
  ReportShell,
  ReportCard,
  ReportEmpty,
  ReportLoading,
  NoCompany,
  TotalLine,
} from "@/components/accounting/ReportShell";
import { MobileList, MobileCard, MobileMetricGrid, MobileMetric } from "@/components/mobile/MobileCards";

const BUCKETS = [
  { key: "current", label: "Current" },
  { key: "days30", label: "1–30 days" },
  { key: "days60", label: "31–60 days" },
  { key: "older", label: "60+ days" },
];

function AgingCard({ title, group, emptyText }) {
  return (
    <ReportCard
      title={title}
      footer={<TotalLine label={`Total ${title.toLowerCase()}`} value={group.totals.total} tone="brand" />}
    >
      {group.rows.length === 0 ? (
        <ReportEmpty>{emptyText}</ReportEmpty>
      ) : (
        <>
        <MobileList>
          {group.rows.map((row) => (
            <MobileCard key={row.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-[14px] font-semibold leading-snug" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                  {row.name}
                </p>
                <span className="sb-money shrink-0 text-[14px] font-bold" style={{ color: "var(--sb-ink)" }}>
                  {formatRand(row.buckets.total)}
                </span>
              </div>
              <MobileMetricGrid>
                {BUCKETS.map((bucket) => (
                  <MobileMetric
                    key={bucket.key}
                    label={bucket.label}
                    value={row.buckets[bucket.key] ? formatRand(row.buckets[bucket.key]) : "—"}
                  />
                ))}
              </MobileMetricGrid>
            </MobileCard>
          ))}
        </MobileList>
        <div className="sb-table-scroll hidden md:block">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--sb-muted)" }}>
                <th className="sb-label py-2 text-left">Contact</th>
                {BUCKETS.map((bucket) => (
                  <th key={bucket.key} className="sb-label py-2 text-right whitespace-nowrap">
                    {bucket.label}
                  </th>
                ))}
                <th className="sb-label py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.id} style={{ borderTop: "1px solid var(--sb-border)" }}>
                  <td className="py-2.5 pr-3 truncate" style={{ color: "var(--sb-ink)", maxWidth: 180 }}>
                    {row.name}
                  </td>
                  {BUCKETS.map((bucket) => (
                    <td key={bucket.key} className="py-2.5 pl-3 text-right sb-money whitespace-nowrap" style={{ color: "var(--sb-muted)" }}>
                      {row.buckets[bucket.key] ? formatRand(row.buckets[bucket.key]) : "—"}
                    </td>
                  ))}
                  <td className="py-2.5 pl-3 text-right sb-money font-bold whitespace-nowrap" style={{ color: "var(--sb-ink)" }}>
                    {formatRand(row.buckets.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </ReportCard>
  );
}

export default function DebtorsCreditors() {
  const { currentCompany } = useOutletContext();
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!currentCompany) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    Promise.all([
      db.entities.Invoice.filter({ company_id: currentCompany.id }, "-issue_date"),
      db.entities.Contact.filter({ company_id: currentCompany.id }),
    ])
      .then(([invoiceRows, contactRows]) => {
        if (cancelled) return;
        setInvoices(invoiceRows);
        setContacts(contactRows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentCompany?.id]);

  const { debtors, creditors } = useMemo(() => outstandingByContact(invoices, contacts), [invoices, contacts]);

  if (!currentCompany) return <NoCompany />;

  return (
    <ReportShell
      title="Debtors and Creditors Control"
      subtitle={`Outstanding customer and supplier balances for ${currentCompany.name}`}
      actions={
        <Link to="/invoices" className="sb-btn sb-btn-outline">
          Invoices
        </Link>
      }
    >
      {loading ? (
        <ReportLoading />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="sb-card" style={{ padding: 20 }}>
              <p className="sb-label">Debtors control</p>
              <p className="sb-display sb-money mt-2" style={{ fontSize: 34, lineHeight: 1.05, color: "var(--sb-ink)" }}>
                {formatRand(debtors.totals.total)}
              </p>
              <p className="mt-2 text-[12px]" style={{ color: "var(--sb-muted)" }}>
                Owed by {debtors.rows.length} {debtors.rows.length === 1 ? "customer" : "customers"} on unpaid sales invoices.
              </p>
            </div>
            <div className="sb-card" style={{ padding: 20 }}>
              <p className="sb-label">Creditors control</p>
              <p className="sb-display sb-money mt-2" style={{ fontSize: 34, lineHeight: 1.05, color: "var(--sb-ink)" }}>
                {formatRand(creditors.totals.total)}
              </p>
              <p className="mt-2 text-[12px]" style={{ color: "var(--sb-muted)" }}>
                Owed to {creditors.rows.length} {creditors.rows.length === 1 ? "supplier" : "suppliers"} on unpaid purchase invoices.
              </p>
            </div>
          </div>

          <AgingCard title="Debtors" group={debtors} emptyText="No outstanding customer invoices." />
          <AgingCard title="Creditors" group={creditors} emptyText="No outstanding supplier invoices." />
        </>
      )}
    </ReportShell>
  );
}
