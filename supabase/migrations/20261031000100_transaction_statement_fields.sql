-- Statement rows keep the figures printed on the statement, so the transaction page
-- can show a running balance, a fee total and each statement's opening/closing balance.
alter table public.transactions
  add column if not exists balance numeric,
  add column if not exists fee numeric default 0;
