# PNexus Supabase Integration Guide

**Complete step-by-step guide to connect PNexus to a real Supabase backend**

---

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [Detailed Setup (30 minutes)](#detailed-setup)
3. [Verification Checklist](#verification-checklist)
4. [Runtime Validation](#runtime-validation)
5. [Production Deployment](#production-deployment)

---

## Quick Start

### Step 1: Clone Environment Template

```bash
# Copy template to local config
cp .env.local.example .env.local
```

### Step 2: Get Supabase Credentials

1. Go to https://app.supabase.com/projects
2. Select your project (or create one)
3. Click "Settings" → "API"
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Key** (public) → `VITE_SUPABASE_ANON_KEY`
   - **Service Role Key** (secret!) → `VITE_SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Update `.env.local`

```bash
# Edit .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ENVIRONMENT=development
```

### Step 4: Run Audit

```bash
npm install
npm run audit:supabase
```

**Expected Result:**
```
✅ Passed:   6
❌ Failed:   0
📊 Success Rate: 100%
```

---

## Detailed Setup

### Prerequisites

**What you need:**
- [ ] Supabase account (free at https://supabase.com)
- [ ] Supabase project created
- [ ] Node.js 18+ installed
- [ ] Git (to clone repo)
- [ ] Text editor for `.env.local`

### Step 1: Create Supabase Project

1. Visit https://app.supabase.com
2. Click "New Project"
3. Fill in details:
   - **Name**: PNexus
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to you
4. Wait 2-3 minutes for provisioning
5. You should see "Project Created" notification

### Step 2: Get API Keys

Once project is ready:

1. Go to **Settings** → **API**
2. You'll see:

```
Project URL: https://your-project-id.supabase.co
Anon Key: (starts with 'eyJ')
Service Role Key: (starts with 'eyJ', longer than Anon)
```

**⚠️ Security:**
- **Anon Key**: Safe to expose (frontend)
- **Service Role Key**: 🔒 Keep private (backend only)
- Never commit these to version control!

### Step 3: Verify Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Paste contents of `supabase_schema.sql`
3. Click "Run"
4. Wait for migrations to complete

**Or use CLI (if you have supabase-cli):**

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Apply migrations
supabase db push
```

### Step 4: Create `.env.local`

```bash
# Copy template
cp .env.local.example .env.local

# Edit with your credentials
cat > .env.local << EOF
# === SUPABASE (from API settings page) ===
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# === OPTIONAL ===
VITE_GEMINI_API_KEY=your-gemini-key
VITE_ENVIRONMENT=development
VITE_ENABLE_RLS_VALIDATION=true
VITE_ENABLE_REALTIME=true
VITE_ENABLE_STORAGE=true
EOF
```

### Step 5: Verify Environment Variables

```bash
# This will check all variables
npm run lint

# If using bash, manually check:
echo "SUPABASE_URL=$VITE_SUPABASE_URL"
echo "ANON_KEY length: ${#VITE_SUPABASE_ANON_KEY}"
```

**Success indicators:**
- ✅ No "undefined" values
- ✅ URLs start with `https://`
- ✅ Keys are long base64 strings
- ✅ No "placeholder" or "your-" prefixes

### Step 6: Install Dependencies

```bash
npm install
```

### Step 7: Run Audit

```bash
# Full validation (type check + Supabase audit)
npm run audit:full

# Or just Supabase audit
npm run audit:supabase
```

---

## Verification Checklist

Use this checklist after setup:

### Configuration ✓

- [ ] `.env.local` file exists
- [ ] No "placeholder" values in `.env.local`
- [ ] `VITE_SUPABASE_URL` matches project URL format
- [ ] `VITE_SUPABASE_ANON_KEY` is 200+ characters
- [ ] `VITE_SUPABASE_SERVICE_ROLE_KEY` is 300+ characters
- [ ] File is in `.gitignore` (not committed)

### Database Schema ✓

- [ ] All 11 tables exist in Supabase
- [ ] `user_profiles` table has 9 columns
- [ ] `payments` table has 11 columns
- [ ] RLS is enabled on all tables
- [ ] Foreign keys are properly configured
- [ ] Check constraints are in place

**Quick SQL check:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name, rowsecurity
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output (all should have rowsecurity = true):
```
user_profiles        | true
plans                | true
payments             | true
app_config           | true
stories              | true
story_views          | true
communities          | true
channels             | true
channel_members      | true
chat_folders         | true
calls                | true
```

### Storage Buckets ✓

- [ ] 4 buckets exist: avatars, media, stories, attachments
- [ ] `avatars` is public
- [ ] `media`, `stories`, `attachments` are private
- [ ] Can upload/download files

**Create buckets manually if missing:**
```
Supabase Dashboard → Storage → New Bucket

Name: avatars       | Public: ✓
Name: media         | Public: ✗
Name: stories       | Public: ✗
Name: attachments   | Public: ✗
```

### RLS Policies ✓

- [ ] Each table has 1+ RLS policy
- [ ] Policies reference `auth.uid()`
- [ ] SELECT policies exist
- [ ] INSERT/UPDATE/DELETE policies configured

**View policies:**
```
Supabase Dashboard → SQL Editor → Copy table name → Policies tab
```

### Realtime ✓

- [ ] Realtime is enabled for database changes
- [ ] Subscriptions can be created
- [ ] Presence tracking works
- [ ] Broadcast messaging works

**Enable realtime for specific tables:**
```sql
-- In SQL Editor, for each table:
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- etc.
```

---

## Runtime Validation

### 1. Test Connection

```typescript
import { createSupabaseClient } from './src/core/env/supabaseFactory';
import { validateEnv } from './src/core/env/validator';

async function testConnection() {
  const config = validateEnv();
  if (!config) return;

  const client = createSupabaseClient(config);
  
  // Test simple query
  const { data, error } = await client
    .from('user_profiles')
    .select('COUNT(*)', { count: 'exact', head: true });
  
  if (error) {
    console.error('Connection failed:', error.message);
  } else {
    console.log('✅ Connection successful!');
  }
}
```

### 2. Test RLS

```typescript
// Only returns rows user owns (due to RLS policy)
const { data: ownPayments } = await client
  .from('payments')
  .select('*')
  .eq('user_id', 'current-user-id');

// RLS blocks cross-user access automatically
// This query would have no results for other users' payments
```

### 3. Test Storage

```typescript
async function testStorage() {
  // Upload file
  const { error: uploadError } = await client.storage
    .from('avatars')
    .upload('user-123/avatar.jpg', file, { upsert: true });

  if (uploadError) console.error('Upload failed:', uploadError);

  // Download file
  const { data, error: downloadError } = await client.storage
    .from('avatars')
    .download('user-123/avatar.jpg');

  if (downloadError) console.error('Download failed:', downloadError);

  // Delete file
  const { error: deleteError } = await client.storage
    .from('avatars')
    .remove(['user-123/avatar.jpg']);

  if (deleteError) console.error('Delete failed:', deleteError);
}
```

### 4. Test Realtime

```typescript
async function testRealtime() {
  // Subscribe to changes
  const subscription = client
    .channel('public:user_profiles')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_profiles',
      },
      (payload) => {
        console.log('Change received:', payload);
      }
    )
    .subscribe();

  // When you update data elsewhere, you'll see changes here
}
```

---

## Production Deployment

### Environment Setup

Create `.env.production`:

```bash
# Supabase (Production Project)
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=prod-service-role-key-here

# Features
VITE_ENVIRONMENT=production
VITE_ENABLE_RLS_VALIDATION=true
VITE_ENABLE_REALTIME=true
VITE_ENABLE_STORAGE=true

# Logging
LOG_LEVEL=info
```

### Pre-deployment Checklist

```bash
# 1. Type check
npm run lint

# 2. Run audit against production
VITE_ENVIRONMENT=production npm run audit:supabase

# 3. Verify all sections pass
# Expected: ✅ Passed: 6, ❌ Failed: 0

# 4. Test with real data
npm run dev

# 5. Verify in browser:
# - Can log in
# - Can see data from Supabase
# - Realtime updates work
# - File uploads work

# 6. Build for production
npm run build

# 7. Verify build succeeded
ls -lh dist/

# 8. Deploy
# (Use your deployment tool: Vercel, Netlify, etc.)
```

### Monitoring

After deployment:

1. **Supabase Dashboard**
   - Go to https://app.supabase.com
   - Check database performance metrics
   - Monitor API usage
   - Review logs

2. **Set Alerts**
   - High error rate
   - Slow queries
   - High storage usage
   - Connection pool exhaustion

3. **Regular Audits**
   ```bash
   # Weekly
   npm run audit:supabase
   ```

---

## Troubleshooting

### Issue: "VITE_SUPABASE_URL is not defined"

**Solution:**
```bash
# Check file exists
ls -la .env.local

# Check content
cat .env.local

# Ensure Vite prefix (VITE_)
# Variables must start with VITE_ to be exposed to frontend
```

### Issue: "Invalid API key"

**Solution:**
1. Go to Supabase dashboard
2. Settings → API
3. Copy full key (including all special characters)
4. Paste into `.env.local`
5. Make sure there are no spaces/line breaks

### Issue: "Connection refused"

**Solution:**
```bash
# Test URL format
echo $VITE_SUPABASE_URL
# Should output: https://your-project.supabase.co

# Test connectivity
curl -I https://your-project.supabase.co/rest/v1/

# Should return 401 (Unauthorized) - that's OK
# If connection refused, check firewall
```

### Issue: "RLS policy violation"

**Solution:**
1. Check RLS is enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Check policies exist: Supabase Dashboard → SQL Editor → Policies
3. Check policies reference correct auth context:
   ```sql
   CREATE POLICY "Users can view own data"
   ON table_name
   FOR SELECT
   USING (auth.uid() = user_id);
   ```

### Issue: "Storage bucket not found"

**Solution:**
```sql
-- Create bucket via SQL
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Or create via dashboard:
-- Storage → New Bucket → avatars
```

### Issue: "Realtime not working"

**Solution:**
1. Enable realtime for table:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
   ```
2. Restart Realtime service (Supabase dashboard)
3. Check subscription syntax is correct
4. Verify network allows WebSocket connections

---

## Next Steps

### Week 1
- [ ] Complete setup following this guide
- [ ] Run all audits successfully
- [ ] Verify each section passes

### Week 2-3
- [ ] Implement client application code
- [ ] Test with real Supabase project
- [ ] Handle authentication
- [ ] Test message flow

### Week 4+
- [ ] Load testing
- [ ] Performance optimization
- [ ] Production deployment
- [ ] Monitoring setup

---

## Support

If you get stuck:

1. **Check Supabase Docs**: https://supabase.com/docs
2. **Run the Audit**: `npm run audit:supabase` (provides detailed error messages)
3. **Check Logs**: Supabase Dashboard → Logs
4. **Community Help**: https://discord.supabase.com

---

**Status**: ✅ Ready for Production  
**Version**: 1.0  
**Last Updated**: 2026-06-03
