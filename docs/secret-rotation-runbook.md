# Secret rotation and Git history purge

The tracked `.env` and `.env.local` files must be treated as compromised. They are now ignored and removed from the current Git index, but old commits still contain their previous values.

## Rotate before purging history

1. Rotate the Supabase server credential used by `SUPABASE_SERVICE_ROLE_KEY`.
2. Revoke the exposed Resend key and create a replacement for `RESEND_API_KEY`.
3. Generate new independent values for `MARIS_ADMIN_SESSION_SECRET` and `MARIS_CUSTOMER_SESSION_SECRET`:

   ```powershell
   [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
   ```

4. Replace the values in local development and every Vercel environment that uses them, then redeploy. Rotating the session secrets intentionally invalidates all existing admin and customer sessions.
5. Verify admin login, customer login, Supabase reads/writes, and email delivery with the new values. Revoke the old provider keys after the replacement deployment is healthy.

## Purge the leaked files from Git history

Coordinate a maintenance window before this step because every commit hash changes and all collaborators must re-clone or reset their checkout.

```powershell
git clone --mirror https://github.com/marisjewelry302/Marisjewelryth.git Marisjewelryth-purge.git
Set-Location Marisjewelryth-purge.git
git filter-repo --path .env --path .env.local --invert-paths --force
git push --force --mirror origin
```

After the force-push, expire repository caches where supported, close or rebase open pull requests, and confirm that neither filename appears in any reachable ref. History cleanup does not replace provider-side key rotation.
