-- =========================================================================
-- Migration: Transaction Reversal Function
-- Purpose: Create reversal transactions to void completed transactions
-- Features: automatic reversal entry generation, audit trail, immutability
-- =========================================================================

-- =========================================================================
-- 1. FUNCTION: Create Reversal Transaction
-- =========================================================================

create or replace function public.create_reversal_transaction(
    p_original_transaction_id uuid,
    p_reversal_reason text,
    p_approved_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_original record;
    v_reversal_id uuid;
    v_reversal_transaction_id uuid;
begin
    -- Get original transaction
    select * into v_original
    from public.financial_transactions
    where id = p_original_transaction_id
        and deleted_at is null;

    if not found then
        raise exception 'Original transaction not found: %', p_original_transaction_id;
    end if;

    -- Only completed transactions can be reversed
    if v_original.status != 'completed' then
        raise exception 'Only completed transactions can be reversed. Current status: %', v_original.status;
    end if;

    -- Check if already reversed
    if v_original.reversal_transaction_id is not null then
        raise exception 'Transaction already reversed: %', p_original_transaction_id;
    end if;

    -- Create reversal transaction (opposite type)
    v_reversal_id := gen_random_uuid();
    
    insert into public.financial_transactions (
        id,
        condominium_id,
        account_id,
        category_id,
        transfer_group_id,
        type,
        status,
        amount,
        original_currency,
        exchange_rate,
        base_amount,
        base_currency,
        description,
        reference_number,
        transaction_date,
        created_by,
        approved_at,
        approved_by,
        reversed_by_transaction_id,
        reversal_reason
    ) values (
        v_reversal_id,
        v_original.condominium_id,
        v_original.account_id,
        v_original.category_id,
        v_original.transfer_group_id,
        v_original.type,  -- Same type (income/expense/transfer)
        'completed',      -- Auto-approve reversal
        v_original.amount,
        v_original.original_currency,
        v_original.exchange_rate,
        v_original.base_amount,
        v_original.base_currency,
        'REVERSA de ' || v_original.reference_number || ': ' || p_reversal_reason,
        'REV-' || v_original.reference_number,
        current_date,
        p_approved_by,
        now(),            -- Auto-approve
        p_approved_by,
        p_original_transaction_id,  -- Link to original
        p_reversal_reason
    );

    -- Update original transaction with reversal link
    update public.financial_transactions
    set reversal_transaction_id = v_reversal_id,
        status = 'voided',
        updated_at = now()
    where id = p_original_transaction_id;

    -- The trigger trg_generate_accounting_entries will automatically
    -- generate reversal entries for the new transaction

    return v_reversal_id;
end;
$$;


-- =========================================================================
-- 2. GRANTS
-- =========================================================================

grant execute on function public.create_reversal_transaction(uuid, text, uuid) to authenticated;


-- =========================================================================
-- 3. DOCUMENTATION
-- =========================================================================

comment on function public.create_reversal_transaction(uuid, text, uuid) is
    'Creates a reversal transaction to void a completed transaction. Auto-approves the reversal and generates accounting entries via trigger.';
