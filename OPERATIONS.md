# OPERATIONS.md — Runbook do ambiente hospedado

Procedimentos de operação do Supabase hospedado. Schema e policies: `DATA_MODEL.md`.

Todos exigem acesso ao Dashboard do Supabase (dono da conta). Nenhum é executável pelo app admin: a RLS exige `aal2`, então quem perdeu o acesso não se recupera pela própria interface.

## Perda do TOTP

O admin não tem código de recuperação: o segundo fator é o único caminho até `aal2`. Reset pelo Dashboard:

1. Authentication → Users → selecionar a conta → remover o fator MFA cadastrado.
2. O próximo login abre em `aal1`; o app exige novo cadastro de TOTP e mostra outro QR Code antes de liberar a gestão.
3. Conferir que sobrou apenas um fator ativo:

```sql
select u.email, f.id, f.factor_type, f.status, f.created_at
from auth.mfa_factors f join auth.users u on u.id = f.user_id
order by f.created_at desc;
```

Fatores `unverified` remanescentes podem ser apagados: o frontend já descarta incompletos antes de gerar outro QR Code.

**Risco de bloqueio total:** com um único admin cadastrado, perder o TOTP *e* o acesso à conta Supabase deixa o banco inalcançável — não há terceiro caminho. Mitigação: manter ao menos duas contas convidadas com TOTP em dispositivos diferentes, e a recuperação da própria conta Supabase (e-mail + 2FA) documentada fora deste repositório.

## Backup e restauração

O plano Free não tem backup automático restaurável nem PITR — o backup é manual e responsabilidade do operador. Rodar antes de qualquer migration em produção e em rotina periódica:

```bash
supabase projects list                                        # confirmar o projeto ligado
supabase db dump --linked --role-only -f backup/roles.sql     # papéis do cluster
supabase db dump --linked            -f backup/schema.sql     # schema
supabase db dump --linked --data-only --use-copy -f backup/dados.sql
```

`supabase db dump` **não** inclui os arquivos do Storage. As fotos precisam de cópia própria: as colunas `caes.photos`, `historias.photos`, `eventos.photos`, `produtos.photos`, `produtos.measurement_image` e `rifa_premios.photo` guardam apenas caminhos — restaurar o banco sem o bucket deixa o site inteiro sem imagens. O bucket `dog-photos` é público e o protocolo S3 está habilitado (`[storage.s3_protocol]`), então a cópia sai por cliente S3 compatível apontando para o endpoint do projeto.

Restauração: recriar o projeto, aplicar `roles.sql`, `schema.sql` e `dados.sql` nessa ordem, reenviar os objetos do bucket preservando os mesmos caminhos e revalidar com `supabase db lint` e `supabase test db`.

Nunca restaurar `seed.sql` em produção: é exclusivamente fictício.

## Verificação periódica

### Cron

Os dois jobs sustentam regras de negócio — reserva que não expira trava número de rifa, e dado pessoal não limpo vira passivo. Verificar depois de cada deploy e periodicamente:

```sql
select jobid, jobname, schedule, active from cron.job order by jobid;

select j.jobname, d.status, d.start_time, d.return_message
from cron.job_run_details d join cron.job j on j.jobid = d.jobid
order by d.start_time desc limit 20;
```

Esperado: `expire-event-reservations` (a cada minuto) e `clean-event-personal-data` (03:15 diário), ambos `active` e com `status = 'succeeded'` nas execuções recentes.

`cron.job_run_details` cresce indefinidamente e consome a cota do banco; limpar o histórico antigo quando necessário:

```sql
delete from cron.job_run_details where start_time < now() - interval '30 days';
```

Sinais de que o cron parou: reservas `pendente` com `expires_at` no passado, ou tentativas por IP acumuladas há mais de 24h.

```sql
select count(*) from public.reservas where status = 'pendente' and expires_at <= now();
select count(*) from public.reserva_ip_tentativas where created_at < now() - interval '24 hours';
```

### Quotas

Consumo consolidado em Dashboard → Settings → Usage (banco, Storage, egress e MAU). Os limites do plano gratuito mudam com o tempo — conferir os valores vigentes no próprio Dashboard, não nesta página. Medição direta:

```sql
select pg_size_pretty(pg_database_size(current_database())) as banco;
select count(*) as objetos, pg_size_pretty(sum((metadata ->> 'size')::bigint)) as storage
from storage.objects where bucket_id = 'dog-photos';
```

O teto de 500.000 bytes por imagem é aplicado no client (`compressImage`) e no bucket; a cota de Storage cresce sobretudo com fotos de cães e eventos antigos, cujos objetos os CRUDs removem junto com o registro.

**Pausa por inatividade:** o plano gratuito suspende projetos sem atividade por alguns dias, o que derruba site público e admin de uma vez. Um site de abrigo tem tráfego baixo e é candidato natural a isso — acompanhar o estado do projeto no Dashboard e reativar quando necessário.

### Auditoria

Exclusões de eventos arquivados preservam registro mínimo, sem os dados operacionais:

```sql
select event_name, export_email, export_sent_at, deleted_at
from public.event_deletion_audit order by deleted_at desc;
```

Toda linha precisa ter `export_sent_at` preenchido: a exclusão só ocorre depois que a Edge Function confirma o envio da cópia. Linha sem envio confirmado indica exclusão fora do fluxo previsto.
