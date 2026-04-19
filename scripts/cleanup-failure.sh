#!/bin/bash
# Failure Recovery Commands - Clean up everything in 1 command

SANDBOX_DIR="$HOME/Desktop/uibac-safe-test"
PORT=3000

echo "=== Failure Recovery - Cleanup All ==="
echo ""

# Step 1: Kill local server on port 3000
echo "Step 1: Killing local server on port $PORT..."
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti:$PORT | xargs kill -9
    echo "✅ Server killed"
else
    echo "✅ No server running on port $PORT"
fi
echo ""

# Step 2: Delete sandbox directory
echo "Step 2: Deleting sandbox directory..."
if [ -d "$SANDBOX_DIR" ]; then
    cd "$SANDBOX_DIR"
    
    # Get branch name if inside sandbox
    BRANCH_NAME=$(git branch --show-current 2>/dev/null || echo "")
    
    cd ~
    rm -rf "$SANDBOX_DIR"
    echo "✅ Sandbox directory deleted: $SANDBOX_DIR"
else
    echo "✅ Sandbox directory does not exist"
    BRANCH_NAME=""
fi
echo ""

# Step 3: Delete remote branch (if exists)
if [ ! -z "$BRANCH_NAME" ]; then
    echo "Step 3: Deleting remote branch: $BRANCH_NAME..."
    git push origin --delete "$BRANCH_NAME" 2>/dev/null || echo "⚠️  Remote branch may not exist or already deleted"
    echo "✅ Remote branch deleted"
else
    echo "Step 3: Skipping remote branch deletion (branch name unknown)"
fi
echo ""

# Step 4: Delete Vercel Preview deployment
echo "Step 4: Deleting Vercel Preview deployment..."
if command -v vercel &> /dev/null; then
    # Try to get latest preview deployment
    LATEST_DEPLOYMENT=$(vercel ls --scope=omarsektaoui77-hub 2>/dev/null | grep -E "test-safe|preview" | head -1 | awk '{print $1}')
    
    if [ ! -z "$LATEST_DEPLOYMENT" ]; then
        vercel rm "$LATEST_DEPLOYMENT" --yes --safe 2>/dev/null || echo "⚠️  Could not delete preview deployment (may not exist)"
        echo "✅ Vercel preview deployment deleted"
    else
        echo "✅ No preview deployment found to delete"
    fi
else
    echo "⚠️  Vercel CLI not installed, skipping preview deletion"
fi
echo ""

echo "=== Cleanup Complete ==="
echo "Everything has been cleaned up safely"
echo "Production remains untouched"
