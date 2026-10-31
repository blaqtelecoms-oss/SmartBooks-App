import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import moment from "moment";
import { db } from "@/api/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { formatRand } from "@/lib/money";
import { allocateTransaction, categoryLabel, explainTransaction } from "@/lib/transactionDetail";
import {
  ArrowLeft, ArrowDownLeft, ArrowUpRight, ChevronDown, Check, Loader2, Sparkles,
} from "lucide-react";

/** One label/value line. The value wraps instead of pushing past the card edge. */
const DetailRow = ({ label, value }) => {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2" style={{ borderBottom: "1px solid var(--sb-border)" }}>
      <span className="shrink-0 text-[12.5px]" style={{ color: "var(--sb-muted)" }}>{label}</span>
      <span
        className="min-w-0 flex-1 text-right text-[13px] font-semibold"
        style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}
      >
        {value}
      </span>
    </div>
  );
};

/**
 * A transaction's full record as its own page — the way a banking app opens a
 * movement. Everything the ledger row carries fits here: identity, amount,
 * allocation controls and the imported metadata, scrolling vertically when it
 * is taller than the screen and never scrolling sideways.
 */
export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentCompany } = useOutletContext();
  const { toast } = useToast();

  const [tx, setTx] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");

  useEffect(() => {
    if (!currentCompany || !id) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [rows, accts, docs] = await Promise.all([
          db.entities.Transaction.filter({ id, company_id: currentCompany.id }),
          db.entities.Account.filter({ company_id: currentCompany.id }),
          db.entities.Document.filter(
            { company_id: currentCompany.id, type: "bank_statement" },
            "-created_date"
          ),
        ]);
        if (!active) return;
        setTx(rows[0] || null);
        setAccounts(accts);
        setStatements(docs);
      } catch (e) {
        if (active) setTx(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [currentCompany, id]);

  const handleAllocate = async (account) => {
    if (!tx) return;
    setSaving(true);
    setPickerOpen(false);
    try {
      const { updated, isEdit } = await allocateTransaction({ tx, account, companyId: currentCompany.id });
      setTx((current) => ({ ...current, ...updated }));
      toast({
        title: isEdit ? "Allocation updated" : "Transaction allocated",
        description: isEdit ? undefined : "Rule learned for future transactions",
      });
    } catch (e) {
      toast({ title: "Error allocating", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleExplain = async () => {
    if (!tx) return;
    setAiLoading(true);
    setAiText("");
    try {
      const result = await explainTransaction(tx);
      setAiText(typeof result === "string" ? result : "No explanation returned.");
    } catch (e) {
      setAiText("Unable to generate explanation. Please try again.");
    }
    setAiLoading(false);
  };

  const backToList = () => navigate("/transactions");

  if (!currentCompany) {
    return (
      <p className="py-20 text-center text-[13px]" style={{ color: "var(--sb-muted)" }}>
        Select a company first
      </p>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={22} className="mx-auto animate-spin" style={{ color: "var(--sb-muted)" }} />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 pb-6">
        <button type="button" onClick={backToList} className="sb-btn sb-btn-outline w-fit">
          <ArrowLeft size={15} /> Back to transactions
        </button>
        <div className="sb-card" style={{ padding: 24 }}>
          <p className="sb-display" style={{ fontSize: 26, color: "var(--sb-ink)" }}>Transaction not found.</p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--sb-muted)" }}>
            It may belong to another company or have been deleted.
          </p>
        </div>
      </div>
    );
  }

  const isIn = tx.type === "credit";
  const statement = statements.find((doc) => doc.id === tx.document_id);
  const allocatedAccount = accounts.find((a) => a.id === tx.account_id);
  const allocationText = allocatedAccount
    ? `${allocatedAccount.code} – ${allocatedAccount.name}`
    : categoryLabel(tx);

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 pb-6">
      {/* Page bar: back to the ledger, exactly like a movement screen in a bank app */}
      <div
        className="sticky top-0 z-20 -mx-1 flex items-center gap-3 px-1 py-2"
        style={{
          background: "color-mix(in srgb, var(--sb-page) 92%, transparent)",
          WebkitBackdropFilter: "blur(12px)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          type="button"
          onClick={backToList}
          aria-label="Back to transactions"
          className="grid h-11 w-11 flex-none place-items-center rounded-full transition-transform active:scale-95"
          style={{ background: "var(--sb-card)", border: "1px solid var(--sb-border)", color: "var(--sb-ink)" }}
        >
          <ArrowLeft size={18} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        </button>
        <p className="min-w-0 truncate text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--sb-muted)" }}>
          Transaction
        </p>
      </div>

      {/* Identity + amount */}
      <section className="sb-card" style={{ padding: 20 }}>
        <div className="flex items-start gap-3">
          <span
            className="grid h-12 w-12 flex-none place-items-center rounded-full"
            style={{
              background: isIn ? "var(--sb-green-bg)" : "var(--sb-soft)",
              color: isIn ? "var(--sb-green-ink)" : "var(--sb-muted)",
            }}
            aria-hidden="true"
          >
            {isIn
              ? <ArrowDownLeft size={20} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
              : <ArrowUpRight size={20} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />}
          </span>
          <div className="min-w-0 flex-1">
            <h1
              className="text-[15px] font-semibold leading-snug"
              style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}
            >
              {tx.description}
            </h1>
            <p className="mt-1 text-[12px]" style={{ color: "var(--sb-muted)", overflowWrap: "anywhere" }}>
              {moment(tx.date).format("DD MMM YYYY")}
              {tx.reference ? ` · ${tx.reference}` : ""}
            </p>
          </div>
        </div>

        <p
          className="sb-money mt-4"
          style={{
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1.1,
            color: isIn ? "var(--sb-green-ink)" : "var(--sb-ink)",
            overflowWrap: "anywhere",
          }}
        >
          {isIn ? "+" : "−"}{formatRand(Math.abs(tx.amount || 0))}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={tx.status === "unallocated" ? "sb-chip sb-chip-amber" : "sb-chip sb-chip-green"}>
            {tx.status}
          </span>
          <span className="text-[11.5px] font-semibold" style={{ color: "var(--sb-muted)" }}>
            {isIn ? "Money in" : "Money out"}
          </span>
        </div>
      </section>

      {/* Allocation */}
      <section className="sb-card" style={{ padding: 16 }}>
        <p className="sb-label">Allocate to account</p>

        {accounts.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-expanded={pickerOpen}
              className="mt-2 flex min-h-[52px] w-full items-center justify-between gap-3 rounded-full px-4 text-left"
              style={{ background: "var(--sb-soft)", border: "1px solid var(--sb-border)" }}
            >
              <span
                className="min-w-0 flex-1 text-[13px] font-semibold"
                style={{ color: allocationText ? "var(--sb-ink)" : "var(--sb-muted)", overflowWrap: "anywhere" }}
              >
                {allocationText || "Choose an account"}
              </span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                style={{ color: "var(--sb-muted)", flex: "none", transform: pickerOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s ease" }}
              />
            </button>

            {pickerOpen && (
              <div
                className="mt-2 overflow-y-auto rounded-[16px]"
                style={{ background: "var(--sb-card)", border: "1px solid var(--sb-border)", maxHeight: 320 }}
              >
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleAllocate(a)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] transition-colors hover:bg-[var(--sb-soft)]"
                    style={{ borderBottom: "1px solid var(--sb-border)" }}
                  >
                    <span className="min-w-0 flex-1" style={{ color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
                      {a.code} – {a.name}
                    </span>
                    {tx.account_id === a.id && (
                      <Check size={15} style={{ color: "var(--sb-green-ink)", flex: "none" }} aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {saving && (
              <p className="mt-2 flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--sb-muted)" }}>
                <Loader2 size={12} className="animate-spin" /> Saving allocation…
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-[12.5px] font-semibold" style={{ color: "var(--sb-ink)" }}>
            {allocationText || "No chart of accounts yet"}
          </p>
        )}
      </section>

      {/* Complete record */}
      <section className="sb-card" style={{ padding: "8px 16px" }}>
        <DetailRow label="Type" value={isIn ? "Credit" : "Debit"} />
        <DetailRow label="Category" value={categoryLabel(tx) || "Uncategorized"} />
        <DetailRow label="Account" value={tx.account_name} />
        <DetailRow label="Reference" value={tx.reference} />
        <DetailRow label="Fee" value={tx.fee ? formatRand(tx.fee) : null} />
        <DetailRow label="Running balance" value={tx.balance != null ? formatRand(tx.balance) : null} />
        <DetailRow label="Bank" value={tx.bank_name} />
        <DetailRow label="Statement" value={statement?.name} />
        <DetailRow label="Source" value={tx.source} />
        <DetailRow label="AI confidence" value={tx.ai_confidence != null ? `${tx.ai_confidence}%` : null} />
        <DetailRow
          label="Imported"
          value={tx.created_date ? moment(tx.created_date).format("DD MMM YYYY HH:mm") : null}
        />
      </section>

      {/* Explain with AI */}
      <section className="flex flex-col gap-3">
        <button type="button" onClick={handleExplain} disabled={aiLoading} className="sb-btn sb-btn-outline w-full">
          {aiLoading
            ? <Loader2 size={15} className="animate-spin" />
            : <Sparkles size={15} style={{ color: "var(--sb-brand-2)" }} />}
          Explain with AI
        </button>

        {aiLoading && (
          <p className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--sb-muted)" }}>
            <Loader2 size={13} className="animate-spin" /> Analyzing transaction…
          </p>
        )}

        {!aiLoading && aiText && (
          <div className="sb-card whitespace-pre-wrap text-[13px] leading-relaxed" style={{ padding: 16, color: "var(--sb-ink)", overflowWrap: "anywhere" }}>
            {aiText}
          </div>
        )}
      </section>
    </div>
  );
}
