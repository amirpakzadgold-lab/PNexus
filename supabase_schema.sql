-- 1. جدول پروفایل کاربران (توسعه جدول auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  username TEXT UNIQUE,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول پلن‌های اشتراک
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  duration_months INT NOT NULL,
  price_usdt NUMERIC(10,2) NOT NULL,
  features JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول درخواست‌های پرداخت
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id INT REFERENCES plans(id),
  amount NUMERIC(10,2) NOT NULL,
  receiver_address TEXT NOT NULL,
  txid TEXT UNIQUE,
  sender_address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- 4. جدول تنظیمات اپلیکیشن
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

INSERT INTO app_config (key, value, description) 
VALUES ('wallet_address', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 'آدرس کیف پول TRC20 برای دریافت USDT')
ON CONFLICT (key) DO NOTHING;

-- 5. جدول استوری‌ها
CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'text')),
  caption TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. جدول بازدیدکنندگان استوری
CREATE TABLE IF NOT EXISTS story_views (
  id SERIAL PRIMARY KEY,
  story_id INT REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- 7. جدول جوامع (Communities)
CREATE TABLE IF NOT EXISTS communities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. جدول کانال‌ها (Channels)
CREATE TABLE IF NOT EXISTS channels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. جدول اعضای کانال
CREATE TABLE IF NOT EXISTS channel_members (
  channel_id INT REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

-- 10. جدول پوشه‌های گفتگو (Chat Folders)
CREATE TABLE IF NOT EXISTS chat_folders (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  chat_ids TEXT[] 
);

-- 11. جدول تماس‌ها (Calls)
CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  caller_id UUID REFERENCES auth.users(id),
  callee_id UUID REFERENCES auth.users(id),
  call_type TEXT CHECK (call_type IN ('audio', 'video')),
  status TEXT CHECK (status IN ('missed', 'answered', 'outgoing')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INT
);

-- RLS Policies

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view plans" ON plans FOR SELECT USING (true);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view config" ON app_config FOR SELECT USING (true);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view non-expired stories" ON stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Users can insert own stories" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own stories" ON stories FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view communities" ON communities FOR SELECT USING (true);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public channels" ON channels FOR SELECT USING (is_private = false);
CREATE POLICY "Members can view private channels" ON channels FOR SELECT USING (
  EXISTS (SELECT 1 FROM channel_members WHERE channel_id = channels.id AND user_id = auth.uid())
);

ALTER TABLE chat_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own folders" ON chat_folders FOR ALL USING (auth.uid() = user_id);

-- Insert default plans
INSERT INTO plans (name, duration_months, price_usdt, features) VALUES 
('1 Month', 1, 5.00, '{"features": ["No Ads", "Premium Support", "Custom Themes"]}'),
('3 Months', 3, 13.50, '{"features": ["No Ads", "Premium Support", "Custom Themes", "10% Discount"]}'),
('6 Months', 6, 25.00, '{"features": ["No Ads", "Premium Support", "Custom Themes", "16% Discount"]}'),
('12 Months', 12, 45.00, '{"features": ["No Ads", "Premium Support", "Custom Themes", "25% Discount", "Exclusive Badge"]}')
ON CONFLICT DO NOTHING;
