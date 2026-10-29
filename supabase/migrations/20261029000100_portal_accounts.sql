-- SmartBooks SA: portal-specific accounts and onboarding.
--
-- A user belongs to exactly one portal: "business" (owns books) or "accountant"
-- (personal workspace for client books). The portal is stored on the account so
-- sign-in routing, the onboarding gate and the wizard all agree, and it cannot be
-- read or written by anyone else (profiles RLS: id = auth.uid()).

alter table public.profiles
  add column if not exists portal text check (portal in ('business', 'accountant'));

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Accounts that already finished the business wizard keep their access: they are
-- business users and must not be sent back through onboarding.
update public.profiles p
   set portal = 'business',
       onboarding_completed = true
 where p.portal is null
   and exists (
     select 1 from public.companies c
      where c.owner_id = p.id::text
        and c.onboarding_completed
   );
