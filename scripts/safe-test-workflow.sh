#!/bin/bash
set -e  # Exit on any error

# Configuration
REPO_URL="https://github.com/omarsektaoui77-hub/uibac"
SANDBOX_DIR="$HOME/Desktop/uibac-safe-test"
BRANCH_NAME="test-safe-$(date +%s)"
BACKEND_URL="http://roundhouse.proxy.rlwy.net:39487"
PORT=3000

echo "=== Safe Testing Workflow ==="
echo "Sandbox: $SANDBOX_DIR"
echo "Branch: $BRANCH_NAME"
echo ""

# Step 1: Check if port 3000 is free
echo "Checking if port $PORT is free..."
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ ERROR: Port $PORT is already in use"
    echo "Run: lsof -ti:$PORT | xargs kill -9"
    exit 1
fi
echo "✅ Port $PORT is free"
echo ""

# Step 2: Create sandbox directory
echo "Creating sandbox directory..."
if [ -d "$SANDBOX_DIR" ]; then
    echo "⚠️  Sandbox directory already exists, removing..."
    rm -rf "$SANDBOX_DIR"
fi
mkdir -p "$SANDBOX_DIR"
echo "✅ Sandbox directory created"
echo ""

# Step 3: Clone repository
echo "Cloning repository..."
cd "$SANDBOX_DIR"
git clone "$REPO_URL" .
echo "✅ Repository cloned"
echo ""

# Step 4: Create test branch
echo "Creating test branch..."
git checkout -b "$BRANCH_NAME"
echo "✅ Branch $BRANCH_NAME created"
echo ""

# Step 5: Backup existing config files
echo "Backing up configuration files..."
[ -f vercel.json ] && cp vercel.json vercel.json.backup || echo "No vercel.json found"
[ -f .env.local ] && cp .env.local .env.local.backup || echo "No .env.local found"
[ -f .env ] && cp .env .env.backup || echo "No .env found"
echo "✅ Configuration files backed up"
echo ""

# Step 6: Create .env.local from vercel.json
echo "Creating .env.local from vercel.json..."
if [ -f vercel.json ]; then
    # Extract NEXT_PUBLIC_API_URL from vercel.json if exists
    API_URL=$(grep -o '"NEXT_PUBLIC_API_URL": "[^"]*"' vercel.json | cut -d'"' -f4 || echo "$BACKEND_URL")
else
    API_URL="$BACKEND_URL"
fi

cat > .env.local << EOF
NEXT_PUBLIC_API_URL=$API_URL
NODE_ENV=production
EOF
echo "✅ .env.local created with NEXT_PUBLIC_API_URL=$API_URL"
echo ""

# Step 7: Install dependencies
echo "Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 8: Build project
echo "Building project..."
if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ BUILD FAILED"
    echo "Check the error messages above"
    exit 1
fi
echo ""

# Step 9: Start server in background
echo "Starting server in background..."
nohup npm start > server.log 2>&1 &
SERVER_PID=$!
echo "✅ Server started with PID: $SERVER_PID"
echo ""

# Step 10: Wait for server to start
echo "Waiting 5 seconds for server to start..."
sleep 5
echo ""

# Step 11: Verify server is running
echo "Verifying server is running..."
if curl -f http://localhost:$PORT > /dev/null 2>&1; then
    echo "✅ Server is running at http://localhost:$PORT"
else
    echo "❌ Server failed to start or not responding"
    echo "Check server.log for details"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi
echo ""

# Step 12: Test backend connectivity
echo "Testing backend connectivity..."
if curl -f "$BACKEND_URL" > /dev/null 2>&1; then
    echo "✅ Backend is reachable at $BACKEND_URL"
else
    echo "⚠️  WARNING: Backend is not reachable at $BACKEND_URL"
    echo "This may cause issues in the application"
fi
echo ""

echo "=== Setup Complete ==="
echo "Sandbox: $SANDBOX_DIR"
echo "Branch: $BRANCH_NAME"
echo "Server PID: $SERVER_PID"
echo "Server URL: http://localhost:$PORT"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:$PORT in your browser"
echo "2. Test the application"
echo "3. If everything works, run Vercel deployment commands"
echo "4. If something fails, run the cleanup commands below"
echo ""
echo "=== Cleanup Commands (if something fails) ==="
echo "kill $SERVER_PID"
echo "cd ~ && rm -rf $SANDBOX_DIR"
echo "git push origin --delete $BRANCH_NAME"
