#!/bin/bash
# Setup script for Pedago AI Supabase database
# Usage: ./setup.sh [command]
# Commands: start, reset, seed, test, generate-types, full

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ID="${SUPABASE_PROJECT_ID:-}"
USE_LOCAL=true

# Default to local unless PROJECT_ID is set
if [ -n "$PROJECT_ID" ]; then
  USE_LOCAL=false
fi

if [ "$USE_LOCAL" = true ]; then
  DB_URL="postgres://postgres:postgres@localhost:54321/postgres"
  echo -e "${GREEN}Using local Supabase database${NC}"
else
  echo -e "${GREEN}Using remote project: $PROJECT_ID${NC}"
fi

log() {
  echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
  exit 1
}

warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to start local Supabase
start_supabase() {
  log "Starting Supabase..."
  
  if ! command -v supabase &> /dev/null; then
    error "Supabase CLI not found. Please install it: https://supabase.com/docs/guides/cli"
  fi

  if [ "$USE_LOCAL" = true ]; then
    supabase start
    log "Local Supabase started successfully"
  else
    warning "Using remote project (not starting local instance)"
  fi
}

# Function to reset database
reset_database() {
  log "Resetting database..."
  
  if [ "$USE_LOCAL" = true ]; then
    supabase db reset
    log "Database reset complete"
  else
    error "Cannot reset remote database via CLI. Use Supabase dashboard instead."
  fi
}

# Function to apply migrations
apply_migrations() {
  log "Applying migrations..."
  
  if [ "$USE_LOCAL" = true ]; then
    supabase migration up
    log "All migrations applied"
  else
    supabase db push --project-id "$PROJECT_ID"
    log "Migrations pushed to remote"
  fi
}

# Function to load seed data
load_seed_data() {
  log "Loading seed data..."
  
  if [ "$USE_LOCAL" = true ]; then
    psql "$DB_URL" -f supabase/migrations/seed.sql
  else
    error "Seed data loading requires local database access"
  fi
  
  log "Seed data loaded"
}

# Function to run tests
run_tests() {
  log "Running database tests..."
  
  if [ "$USE_LOCAL" = false ]; then
    warning "Tests require local database access"
    return
  fi

  log "Running RLS tests..."
  psql "$DB_URL" -f supabase/tests/rls_workspace_isolation.sql > /tmp/rls_test.log 2>&1 || true
  grep -E "^(✓|✗|Test|====)" /tmp/rls_test.log || echo "RLS tests executed"

  log "Running storage access tests..."
  psql "$DB_URL" -f supabase/tests/storage_access.sql > /tmp/storage_test.log 2>&1 || true
  grep -E "^(✓|✗|Test|====)" /tmp/storage_test.log || echo "Storage tests executed"

  log "Running scoring constraint tests..."
  psql "$DB_URL" -f supabase/tests/scoring_constraints.sql > /tmp/scoring_test.log 2>&1 || true
  grep -E "^(✓|✗|Test|====)" /tmp/scoring_test.log || echo "Scoring tests executed"

  log "Running analysis integrity tests..."
  psql "$DB_URL" -f supabase/tests/analysis_integrity.sql > /tmp/analysis_test.log 2>&1 || true
  grep -E "^(✓|✗|Test|====)" /tmp/analysis_test.log || echo "Analysis tests executed"

  log "All tests completed"
}

# Function to generate TypeScript types
generate_types() {
  log "Generating TypeScript types..."
  
  if ! command -v supabase &> /dev/null; then
    error "Supabase CLI not found"
  fi

  TYPES_FILE="packages/shared/src/database.types.ts"
  
  if [ "$USE_LOCAL" = true ]; then
    supabase gen types typescript --local > "$TYPES_FILE"
  else
    supabase gen types typescript --project-id "$PROJECT_ID" > "$TYPES_FILE"
  fi

  if [ -f "$TYPES_FILE" ]; then
    log "Types generated to $TYPES_FILE"
  else
    error "Failed to generate types"
  fi
}

# Function to run full setup
full_setup() {
  log "Running complete database setup..."
  
  start_supabase
  sleep 2
  
  apply_migrations
  log "Waiting for migrations to complete..."
  sleep 3
  
  load_seed_data
  sleep 1
  
  run_tests
  sleep 1
  
  generate_types
  
  log ""
  echo -e "${GREEN}=====================================================${NC}"
  echo -e "${GREEN}Database setup complete!${NC}"
  echo -e "${GREEN}=====================================================${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Start your backend:  cd backend && npm run dev"
  echo "2. Start your frontend: cd frontend && npm run dev"
  echo "3. Access Supabase Studio: http://localhost:54323 (local)"
  echo ""
}

# Main script
if [ $# -eq 0 ]; then
  full_setup
else
  case "$1" in
    start)
      start_supabase
      ;;
    reset)
      reset_database
      ;;
    migrate)
      apply_migrations
      ;;
    seed)
      load_seed_data
      ;;
    test)
      run_tests
      ;;
    generate-types)
      generate_types
      ;;
    full)
      full_setup
      ;;
    *)
      echo "Usage: $0 [command]"
      echo ""
      echo "Commands:"
      echo "  start            - Start local Supabase"
      echo "  reset            - Reset database and apply migrations"
      echo "  migrate          - Apply all migrations"
      echo "  seed             - Load seed data"
      echo "  test             - Run all tests"
      echo "  generate-types   - Generate TypeScript types"
      echo "  full             - Run complete setup (default)"
      echo ""
      exit 1
      ;;
  esac
fi
