-- =========================================================================
-- Migration: Transaction Approval and Reconciliation Fields
-- Table: financial_transactions (alter)
-- Features: approval tracking, reconciliation, reversal links
-- =========================================================================

-- =========================================================================
-- 1. ADD COLUMNS
-- =========================================================================

alter table public.financial_transactions
    add column approved_at timestamptz,
    add column approved_by uuid references public.profiles(id) on delete set null,
    add column reconciled_at timestamptz,
    add column reconciled_by uuid references public.profiles(id) on delete set null,
    add column reversal_transaction_id uuid references public.financial_transactions(id) on delete set null,
    add column reversed_by_transaction_id uuid references public.financial_transactions(id) on delete set null,
    add column reversal_reason text;

comment on column public.financial_transactions.approved_at is 'Timestamp when transaction was approved (pending → completed).';
comment on column public.financial_transactions.approved_by is 'Profile ID of admin who approved the transaction.';
comment on column public.financial_transactions.reconciled_at is 'Timestamp when transaction was reconciled with bank statement.';
comment on column public.financial_transactions.reconciled_by is 'Profile ID of admin who reconciled the transaction.';
comment on column public.financial_transactions.reversal_transaction_id is 'FK to the reversal transaction that voided this one.';
comment on column public.financial_transactions.reversed_by_transaction_id is 'FK to the original transaction that this one reverses.';
comment on column public.financial_transactions.reversal_reason is 'Reason for reversal (audit trail).';


-- =========================================================================
-- 2. ADD INDEXES
-- =========================================================================

create index if not exists idx_ft_approved_at
    on public.financial_transactions (approved_at)
    where approved_at is not null;

create index if not exists idx_ft_reconciled_at
    on public.financial_transactions (reconciled_at)
    where reconciled_at is null and deleted_at is null;

create index if not exists idx_ft_reversal_transaction_id
    on public.financial_transactions (reversal_transaction_id)
    where reversal_transaction_id is not null;

create index if not exists idx_ft_reversed_by_transaction_id
    on public.financial_transactions (reversed_by_transaction_id)
    where reversed_by_transaction_id is not null;


-- =========================================================================
-- 3. DOCUMENTATION
-- =========================================================================

comment on column public.financial_transactions.approved_at is 'Timestamp when transaction was approved (pending → completed). NULL if not yet approved.';
comment on column public.financial_transactions.approved_by is 'Profile ID of admin who approved the transaction. NULL if not yet approved.';
comment on column public.financial_transactions.reconciled_at is 'Timestamp when transaction was reconciled with bank statement. NULL if not yet reconciled.';
comment on column public.financial_transactions.reconciled_by is 'Profile ID of admin who reconciled the transaction. NULL if not yet reconciled.';
comment on column public.financial_transactions.reversal_transaction_id is 'FK to the reversal transaction that voided this one. NULL if not reversed.';
comment on column public.financial_transactions.reversed_by_transaction_id is 'FK to the original transaction that this one reverses. NULL if not a reversal.';
comment on column public.financial_transactions.reversal_reason is 'Reason for reversal (audit trail). NULL if not a reversal.';
