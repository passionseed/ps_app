#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Verifying Pathlab seed data via Supabase CLI..."

# Check if seed exists in seeds table
RESULT=$(supabase db execute "SELECT id FROM public.seeds WHERE id = 'ux-designer-pathlab-001';" || echo "")

if [[ $RESULT == *"ux-designer-pathlab-001"* ]]; then
    echo "✅ Seed 'ux-designer-pathlab-001' found!"
else
    echo "❌ Seed 'ux-designer-pathlab-001' not found. (Expected in Red Phase)"
    exit 1
fi
