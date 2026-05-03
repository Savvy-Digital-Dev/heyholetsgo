# HoHo v2 Supabase Setup

## 1. Create Project

1. Open `https://supabase.com/dashboard`.
2. Click **New project**.
3. Fill project name, database password, and region.
4. Wait until the project is ready.

## 2. Run Schema

1. Open your project.
2. Click **SQL Editor**.
3. Click **New query**.
4. Paste all contents of `supabase/schema.sql`.
5. Click **Run**.

## 3. Enable Email Login

1. Open **Authentication**.
2. Open **Providers**.
3. Make sure **Email** is enabled.
4. For invite-only MVP, create users manually from **Authentication > Users** or invite them from Supabase.

## 4. Configure App Keys

1. Open **Project Settings > API Keys** or **Connect**.
2. Copy:
   - Project URL
   - Publishable key, or legacy anon key
3. Edit `assets/js/config/env.js`:

```js
window.HOHO_ENV = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  ENABLE_GOOGLE_OAUTH: false,
  APP_URL: window.location.origin + window.location.pathname
};
```

Never put `service_role`, `sb_secret_...`, or database password in the frontend.

## 5. Make Owner Superuser

1. Login once in HoHo with your owner account so the app creates a `profiles` row.
2. Open **SQL Editor** again.
3. Open `supabase/seed-superuser.sql`.
4. Replace `YOUR_OWNER_EMAIL@example.com` with your owner email.
5. Run the query.

## 6. Optional Google Login

Enable Google only after email/password works:

1. Open **Authentication > Providers > Google**.
2. Enable Google.
3. Add Google Client ID and Client Secret from Google Cloud Console.
4. Add Supabase callback URL to the Google OAuth app.
5. Set `ENABLE_GOOGLE_OAUTH: true` in `assets/js/config/env.js`.
