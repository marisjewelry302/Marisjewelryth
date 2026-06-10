-- Add username and password_hash columns to admin_users for authentication system
-- This preserves existing admin records and adds the necessary auth columns

alter table public.admin_users 
add column if not exists username text,
add column if not exists password_hash text,
add column if not exists display_name text,
add column if not exists is_active boolean not null default true;

-- Populate username from email (remove domain part) for existing records
update public.admin_users 
set username = lower(split_part(email, '@', 1)) 
where username is null and email is not null;

-- Populate display_name from name for existing records
update public.admin_users 
set display_name = name 
where display_name is null and name is not null;

-- Ensure legacy records are active by default
update public.admin_users 
set is_active = true 
where is_active is null;

-- Make username unique and not null
alter table public.admin_users 
alter column username set not null,
add constraint admin_users_username_unique unique (username);

comment on column public.admin_users.username is 'Login username (derived from email for legacy users)';
comment on column public.admin_users.password_hash is 'Bcrypt password hash for authentication';
comment on column public.admin_users.display_name is 'Display name for the admin user';
