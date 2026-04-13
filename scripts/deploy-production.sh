#!/bin/bash
# BacQuest Production Deployment Script
# Safe deployment with environment validation

set -e  # Exit on any error

echo "🚀 Starting BacQuest Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI not found. Install with: npm i -g vercel"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Run from project root."
        exit 1
    fi
    
    # Check if .env.production.local exists
    if [ ! -f ".env.production.local" ]; then
        log_warning ".env.production.local not found. Creating from template..."
        cp .env.production.example .env.production.local
        log_error "Please fill in .env.production.local with your production secrets"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Pull production environment variables
pull_production_env() {
    log_info "Pulling production environment variables..."
    
    if vercel env pull .env.production.local --environment=production; then
        log_success "Production environment variables pulled successfully"
    else
        log_error "Failed to pull production environment variables"
        exit 1
    fi
}

# Validate environment
validate_environment() {
    log_info "Validating production environment..."
    
    # Load environment variables
    set -a
    source .env.production.local
    set +a
    
    # Check critical variables
    if [ -z "$OPENAI_API_KEY" ]; then
        log_error "OPENAI_API_KEY is required"
        exit 1
    fi
    
    if [ -z "$FIREBASE_PROJECT_ID" ]; then
        log_error "FIREBASE_PROJECT_ID is required"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        log_error "JWT_SECRET is required"
        exit 1
    fi
    
    # Check chaos threshold is valid
    if [[ "$NEXT_PUBLIC_CHAOS_THRESHOLD" =~ ^[0-9]*\.?[0-9]+$ ]] && (( $(echo "$NEXT_PUBLIC_CHAOS_THRESHOLD <= 1 && $NEXT_PUBLIC_CHAOS_THRESHOLD >= 0" | bc -l) )); then
        log_success "Chaos threshold is valid: $NEXT_PUBLIC_CHAOS_THRESHOLD"
    else
        log_error "NEXT_PUBLIC_CHAOS_THRESHOLD must be between 0 and 1"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Build project
build_project() {
    log_info "Building project with production configuration..."
    
    # Clean previous build
    rm -rf .next
    
    # Build with production environment
    if NODE_ENV=production npm run build; then
        log_success "Build completed successfully"
    else
        log_error "Build failed"
        exit 1
    fi
}

# Run production tests
run_tests() {
    log_info "Running production tests..."
    
    # Run TypeScript check
    if npm run type-check; then
        log_success "TypeScript check passed"
    else
        log_error "TypeScript check failed"
        exit 1
    fi
    
    # Run linter
    if npm run lint; then
        log_success "Linting passed"
    else
        log_warning "Linting issues found (continuing deployment)"
    fi
}

# Deploy to production
deploy_production() {
    log_info "Deploying to production..."
    
    # Deploy with force flag
    if vercel --prod --force; then
        log_success "Deployment completed successfully"
    else
        log_error "Deployment failed"
        exit 1
    fi
}

# Post-deployment verification
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Get production URL
    PROD_URL=$(vercel ls --scope=omarsektaoui77-hubs-projects | grep "Production" | awk '{print $2}')
    
    if [ -n "$PROD_URL" ]; then
        log_success "Production URL: $PROD_URL"
        
        # Wait a moment for deployment to propagate
        sleep 10
        
        # Basic health check
        if curl -f -s "$PROD_URL" > /dev/null; then
            log_success "Production deployment is accessible"
        else
            log_warning "Production deployment might not be fully propagated yet"
        fi
    else
        log_error "Could not determine production URL"
    fi
}

# Security audit
security_audit() {
    log_info "Running security audit..."
    
    # Check for exposed secrets in build
    if grep -r "sk-" .next/ 2>/dev/null; then
        log_error "API keys found in build output!"
        exit 1
    fi
    
    if grep -r "private_key" .next/ 2>/dev/null; then
        log_error "Private keys found in build output!"
        exit 1
    fi
    
    log_success "Security audit passed"
}

# Main deployment flow
main() {
    echo "🎯 BacQuest Production Deployment Pipeline"
    echo "=========================================="
    
    check_prerequisites
    pull_production_env
    validate_environment
    build_project
    run_tests
    security_audit
    deploy_production
    verify_deployment
    
    echo ""
    log_success "🎉 Production deployment completed successfully!"
    echo ""
    log_info "Next steps:"
    echo "  1. Monitor the application for any issues"
    echo "  2. Check Vercel logs for errors"
    echo "  3. Verify all features are working"
    echo "  4. Monitor AI tutor performance"
    echo ""
}

# Run main function
main "$@"
