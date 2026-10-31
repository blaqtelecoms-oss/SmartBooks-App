-- Proof of payment must be attached before an invoice can be marked paid.
-- Holds the storage path inside the private "uploads" bucket.
alter table public.invoices
  add column if not exists proof_of_payment_url text;
