# Staff accounts

Staff sign in at `/staff` with email + password, then a 6-digit authenticator code (TOTP). Nobody can reach `/admin` without both.
Access is decided by the `profiles` table, not by signing up: a user with no profile row has **no** access, and the database
policies also require the TOTP-verified session (`aal2`) for every committee write.

## Create the first Super Admin (one time)

1. Supabase dashboard > **Authentication > Users > Add user > Create new user**. Enter the person's email and a strong password, and tick "Auto Confirm User".
2. In the SQL editor (or ask Claude to run it once you approve), run, with the real email and name:

```sql
insert into profiles (user_id, display_name, role)
select id, 'Full Name', 'super_admin' from auth.users where email = 'person@example.com';
```

3. They sign in at `/staff`, scan the QR code with an authenticator app, and enter the code. After that, only the code is asked for.

Roles: `super_admin` and `committee_admin` (everything in `/admin`), `scorer` (live scoring only). Others are reserved for later phases.
Rule of thumb from the brief: at least two Super Admins (Chairman Enver Amien, Treasurer Muneer Gaida, plus the league owner).

## Recommended Supabase settings
- **Authentication > Sign In / Providers > Email**: switch off "Allow new users to sign up" (invite-only). Even if left on, a new user has no profile and no access.
- **Authentication > Attack Protection**: enable leaked-password protection and keep rate limits on.
- Keep the **service role key** out of the app. It is not needed: all staff writes run as the signed-in user and are checked by row-level security.

## Lost authenticator (reset 2FA)
There are no recovery codes yet. A Super Admin can reset someone's 2FA in SQL, and the person re-enrols at next sign-in:

```sql
delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'person@example.com');
```

## Remove someone
Delete their `profiles` row (access ends at once for new requests) and then the user in Authentication > Users.
Their past entries stay in the audit log.
