#!/usr/bin/env bash

# PNexus Supabase Integration Quick Start Script
# Usage: ./setup-supabase.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     PNexus Supabase Integration Setup                       ║"
echo "║     Interactive Configuration Wizard                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    read -p "⚠️  .env.local already exists. Overwrite? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting..."
        exit 1
    fi
fi

# Copy template
echo "📋 Creating .env.local from template..."
cp .env.local.example .env.local
echo "✅ .env.local created"
echo ""

# Prompt for credentials
echo "🔐 Enter Supabase Credentials"
echo "(Get these from: https://app.supabase.com/projects)"
echo ""

read -p "Enter Project URL (https://...supabase.co): " SUPABASE_URL
read -p "Enter Anon Key (public API key): " SUPABASE_ANON_KEY
read -sp "Enter Service Role Key (secret!): " SUPABASE_SERVICE_ROLE_KEY
echo ""
echo ""

# Optional: Gemini API
read -p "Enter Gemini API Key (optional, press Enter to skip): " GEMINI_API_KEY
echo ""

# Update .env.local
cat > .env.local << EOF
# ===================================================================
# SUPABASE CREDENTIALS (Production)
# ===================================================================

VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
VITE_SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# ===================================================================
# API KEYS
# ===================================================================

VITE_GEMINI_API_KEY=$GEMINI_API_KEY

# ===================================================================
# FEATURE FLAGS
# ===================================================================

VITE_ENABLE_REALTIME=true
VITE_ENABLE_STORAGE=true
VITE_ENABLE_AUTH=true
VITE_ENABLE_RLS_VALIDATION=true
VITE_ENVIRONMENT=development

# ===================================================================
# SERVER CONFIGURATION
# ===================================================================

NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
EOF

echo "✅ .env.local configured"
echo ""

# Install dependencies
read -p "📦 Install dependencies? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm install
    echo "✅ Dependencies installed"
else
    echo "⏭️  Skipping dependency installation"
fi
echo ""

# Run audit
read -p "🔍 Run Supabase audit now? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run audit:supabase
else
    echo "⏭️  To run audit later, use: npm run audit:supabase"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Setup Complete! ✅                                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📚 Next Steps:"
echo "  1. Review .env.local to ensure credentials are correct"
echo "  2. Run: npm run audit:supabase (to verify all components)"
echo "  3. Read: SUPABASE_SETUP.md (for detailed guide)"
echo "  4. Start developing!"
echo ""
echo "📖 Documentation:"
echo "  - SUPABASE_SETUP.md          - Step-by-step setup"
echo "  - SUPABASE_AUDIT_GUIDE.md    - How to run audits"
echo "  - SUPABASE_INTEGRATION_STATUS.md - Detailed status"
echo ""
