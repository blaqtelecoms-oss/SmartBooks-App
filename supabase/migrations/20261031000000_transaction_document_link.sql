-- Transactions imported from an uploaded document keep a link to that document, so
-- removing the document clears exactly the transactions it brought in.
alter table public.transactions
  add column if not exists document_id uuid references public.documents(id) on delete cascade;

create index if not exists transactions_document_id_idx on public.transactions (document_id);
