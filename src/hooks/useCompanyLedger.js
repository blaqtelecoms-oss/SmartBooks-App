import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { buildLedger } from "@/lib/ledger";

/** Loads the selected company's chart of accounts and ledger, already reconciled. */
export function useCompanyLedger() {
  const { currentCompany } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!currentCompany) {
      setAccounts([]);
      setTransactions([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    Promise.all([
      db.entities.Account.filter({ company_id: currentCompany.id }),
      db.entities.Transaction.filter({ company_id: currentCompany.id }, "-date", 2000),
    ])
      .then(([accountRows, transactionRows]) => {
        if (cancelled) return;
        setAccounts(accountRows);
        setTransactions(transactionRows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentCompany?.id]);

  const rows = useMemo(() => buildLedger(accounts, transactions), [accounts, transactions]);

  return { company: currentCompany, accounts, transactions, rows, loading };
}
