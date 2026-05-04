-- Run after your first Auth user exists and has a row in public.profiles.
-- This temporarily disables the profile privilege trigger for first-owner seeding.

alter table public.profiles disable trigger protect_profile_privileged_fields;

update public.profiles
set role = 'superuser',
    status = 'active',
    updated_at = now()
where email = 'info@savvydigital.id';

alter table public.profiles enable trigger protect_profile_privileged_fields;

select id, email, name, role, status
from public.profiles
where email = 'info@savvydigital.id';
