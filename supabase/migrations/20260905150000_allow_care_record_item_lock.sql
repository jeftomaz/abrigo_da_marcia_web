-- A validação tranca o item antes da baixa sem expor UPDATE direto ao client.

alter function public.prepare_dog_care_record() security definer;

revoke all on function public.prepare_dog_care_record() from public;
