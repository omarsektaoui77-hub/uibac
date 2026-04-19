#!/bin/bash
# Vercel Preview Deployment Commands (Free Tier Only)

# IMPORTANT: Run this INSIDE the sandbox directory first
cd ~/Desktop/uibac-safe-test

# === STEP 1: Link to Vercel (FIRST TIME ONLY) ===
# This creates .vercel/project.json with your project ID
echo "Step 1: Link to Vercel"
echo "Run: vercel link"
echo "This will prompt you to select your project from the list"
echo "After linking, check .vercel/project.json for your projectId"
echo ""

# === STEP 2: Deploy to PREVIEW (NOT PRODUCTION) ===
# This creates a preview deployment, does NOT affect production URL
echo "Step 2: Deploy to Preview"
echo "Run: vercel"
echo "This deploys to a preview URL like: https://uibac-xxxxx.vercel.app"
echo "Your production URL remains unchanged"
echo ""

# === STEP 3: Get Preview URL ===
# Multiple ways to get the preview URL without clicking through dashboard
echo "Step 3: Get Preview URL"
echo ""
echo "Option A (CLI - Recommended):"
echo "  vercel ls"
echo "  This lists all deployments with their URLs"
echo ""
echo "Option B (Inspect):"
echo "  vercel inspect"
echo "  Shows details of latest deployment including URL"
echo ""
echo "Option C (Output capture):"
echo "  PREVIEW_URL=\$(vercel --yes)"
echo "  echo \$PREVIEW_URL"
echo ""

# === STEP 4: Verify Preview Deployment ===
echo "Step 4: Verify Preview Deployment"
echo "After deployment, test with:"
echo "  curl https://your-preview-url.vercel.app/api/health"
echo "  Then open the preview URL in your browser"
echo ""

# === IMPORTANT NOTES ===
echo "=== IMPORTANT ==="
echo "1. NEVER use 'vercel --prod' for testing - that deploys to production"
echo "2. Preview deployments are FREE on Vercel Hobby tier"
echo "3. Preview deployments auto-expire after 14 days"
echo "4. You can have unlimited preview deployments"
echo "5. Production URL (https://uibac.vercel.app) is NEVER touched"
echo ""
