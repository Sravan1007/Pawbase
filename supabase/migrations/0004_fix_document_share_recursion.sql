-- Fixes infinite recursion (42P17): the "documents: shared with vet" policy
-- queried document_shares, whose own RLS policy queried back into
-- documents, forming a cycle. A security-definer function (same pattern as
-- has_pet_access) breaks the cycle by bypassing document_shares' RLS for
-- this internal check.

create or replace function is_shared_with_vet(target_document_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from document_shares ds
    where ds.document_id = target_document_id and ds.vet_id = auth.uid()
  );
$$;

drop policy if exists "documents: shared with vet" on documents;
create policy "documents: shared with vet" on documents
  for select using (is_shared_with_vet(id));
