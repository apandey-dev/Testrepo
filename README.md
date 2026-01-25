# FocusPad - Supabase Setup Guide

## Prerequisites
- A Supabase account ([sign up at supabase.com](https://supabase.com))
- Modern web browser
- Text editor

---

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Project Name:** FocusPad
   - **Database Password:** *Choose a strong password*
   - **Region:** *Select closest to your users*
4. Click **"Create new project"**
5. Wait ~2 minutes for project provisioning

---

## Step 2: Get API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

---

## Step 3: Configure Environment Variables

1. Open `js/store.js`
2. Find the `Store` object at the top
3. Update these values:
   ```javascript
   const Store = {
       SUPABASE_URL: 'YOUR_PROJECT_URL_HERE',  // From Step 2
       SUPABASE_KEY: 'YOUR_ANON_KEY_HERE',     // From Step 2
       // ... rest of code
   };
   ```

---

## Step 4: Enable Email Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Email** provider
3. Ensure it's **enabled** (toggle should be green)
4. Scroll down to **Email Templates** (optional) to customize signup emails

---

## Step 5: Execute Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL Editor
5. Click **"Run"** (or press `Ctrl+Enter`)
6. Verify success:
   - You should see "Success. No rows returned"
   - Go to **Database** → **Tables**
   - You should see `folders` and `notes` tables

---

## Step 6: Verify RLS (Row Level Security)

1. Go to **Authentication** → **Policies**
2. Select **folders** table:
   - Should see 4 policies (SELECT, INSERT, UPDATE, DELETE)
3. Select **notes** table:
   - Should see 4 policies (SELECT, INSERT, UPDATE, DELETE)

> ✅ RLS ensures users can only access their own data

---

## Step 7: Test the Application

1. Open `index.html` in a web browser
2. **Sign Up:** Create a new account
   - Use a real email if you want email confirmations (optional)
   - Or use `test@example.com` with a password
3. **Create Folders:** Click sidebar → "New Folder"
4. **Create Notes:** Select a folder → "New Note"
5. **Test Isolation:**
   - Create multiple notes
   - Switch between them
   - Content should remain separate

---

## Troubleshooting

### Error: "Invalid Supabase URL or Key"
- Double-check `SUPABASE_URL` and `SUPABASE_KEY` in `js/store.js`
- Ensure there are no extra spaces or quotes

### Error: "Insert violates row security policy"
- RLS policies may not be set up correctly
- Re-run `supabase-schema.sql`
- Verify policies in **Authentication** → **Policies**

### Notes not saving
- Check browser console (`F12`) for errors
- Verify you're logged in (check top-right for logout button)
- Ensure `user_id` matches in database

### Folder names not unique
- The schema enforces `UNIQUE (user_id, name)`
- Try a different folder name
- Check for case-sensitivity issues

---

## Database Schema Overview

### `folders` table
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to auth.users)
- `name` (TEXT, unique per user)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### `notes` table
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to auth.users)
- `folder_id` (UUID, foreign key to folders, CASCADE DELETE)
- `title` (TEXT)
- `content` (TEXT)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## Data Isolation Guarantee

**ONE USER → MANY FOLDERS → MANY NOTES**

- Each user sees only their own folders (via RLS)
- Each folder contains its own isolated notes
- Deleting a folder cascades to its notes
- Content is stored per-note (no sharing)
- `updated_at` triggers ensure proper sorting

---

## Security Features

✓ **Row Level Security (RLS):** Users can only access their own data  
✓ **Cascade Deletes:** Deleting a folder removes its notes  
✓ **Unique Constraints:** Folder names unique per user  
✓ **Timestamp Triggers:** Auto-update `updated_at` on edits  
✓ **Supabase Auth:** Industry-standard authentication

---

## Support

If you encounter issues:
1. Check browser console for errors (`F12`)
2. Verify Supabase project is active
3. Ensure RLS policies are enabled
4. Re-run schema if needed

---

## License

This project is provided as-is for educational purposes.
