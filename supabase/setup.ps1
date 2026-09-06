# Setup script for Pedago AI Supabase database (Windows PowerShell)
# Usage: .\setup.ps1 [-Command <command>]
# Commands: start, reset, seed, test, generate-types, full

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('start', 'reset', 'migrate', 'seed', 'test', 'generate-types', 'full')]
    [string]$Command = 'full'
)

# Configuration
$ProjectId = $env:SUPABASE_PROJECT_ID
$UseLocal = $ProjectId -eq $null -or $ProjectId -eq ''
$DbUrl = "postgres://postgres:postgres@localhost:54321/postgres"
$TypesFile = "packages/shared/src/database.types.ts"

# Helper functions
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit 1
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

# Initialize
if ($UseLocal) {
    Write-Log "Using local Supabase database"
} else {
    Write-Log "Using remote project: $ProjectId"
}

# Check for Supabase CLI
function Test-SupabaseCLI {
    try {
        $null = supabase --version
        return $true
    } catch {
        return $false
    }
}

# Function to start local Supabase
function Start-Supabase {
    Write-Log "Starting Supabase..."
    
    if (-not (Test-SupabaseCLI)) {
        Write-Error-Custom "Supabase CLI not found. Install from: https://supabase.com/docs/guides/cli"
    }

    if ($UseLocal) {
        supabase start
        Write-Log "Local Supabase started successfully"
    } else {
        Write-Warning-Custom "Using remote project (not starting local instance)"
    }
}

# Function to reset database
function Reset-Database {
    Write-Log "Resetting database..."
    
    if ($UseLocal) {
        supabase db reset
        Write-Log "Database reset complete"
    } else {
        Write-Error-Custom "Cannot reset remote database via CLI. Use Supabase dashboard."
    }
}

# Function to apply migrations
function Apply-Migrations {
    Write-Log "Applying migrations..."
    
    if ($UseLocal) {
        supabase migration up
        Write-Log "All migrations applied"
    } else {
        supabase db push --project-id $ProjectId
        Write-Log "Migrations pushed to remote"
    }
}

# Function to load seed data
function Load-SeedData {
    Write-Log "Loading seed data..."
    
    if (-not $UseLocal) {
        Write-Error-Custom "Seed data loading requires local database access"
    }

    # Check if psql is available
    try {
        $null = psql --version
    } catch {
        Write-Error-Custom "psql not found. Ensure PostgreSQL client tools are installed."
    }

    $env:PGPASSWORD = "postgres"
    psql -h localhost -p 54321 -U postgres -d postgres -f supabase/migrations/seed.sql
    $env:PGPASSWORD = ""
    
    Write-Log "Seed data loaded"
}

# Function to run tests
function Invoke-Tests {
    Write-Log "Running database tests..."
    
    if (-not $UseLocal) {
        Write-Warning-Custom "Tests require local database access"
        return
    }

    $env:PGPASSWORD = "postgres"

    Write-Log "Running RLS workspace isolation tests..."
    psql -h localhost -p 54321 -U postgres -d postgres -f supabase/tests/rls_workspace_isolation.sql 2>&1 | Select-String "^(✓|✗|Test|====)" | Write-Host
    
    Write-Log "Running storage access tests..."
    psql -h localhost -p 54321 -U postgres -d postgres -f supabase/tests/storage_access.sql 2>&1 | Select-String "^(✓|✗|Test|====)" | Write-Host
    
    Write-Log "Running scoring constraint tests..."
    psql -h localhost -p 54321 -U postgres -d postgres -f supabase/tests/scoring_constraints.sql 2>&1 | Select-String "^(✓|✗|Test|====)" | Write-Host
    
    Write-Log "Running analysis integrity tests..."
    psql -h localhost -p 54321 -U postgres -d postgres -f supabase/tests/analysis_integrity.sql 2>&1 | Select-String "^(✓|✗|Test|====)" | Write-Host
    
    $env:PGPASSWORD = ""
    
    Write-Log "All tests completed"
}

# Function to generate TypeScript types
function Generate-Types {
    Write-Log "Generating TypeScript types..."
    
    if (-not (Test-SupabaseCLI)) {
        Write-Error-Custom "Supabase CLI not found"
    }

    if ($UseLocal) {
        supabase gen types typescript --local | Out-File -Encoding UTF8 $TypesFile
    } else {
        supabase gen types typescript --project-id $ProjectId | Out-File -Encoding UTF8 $TypesFile
    }

    if (Test-Path $TypesFile) {
        Write-Log "Types generated to $TypesFile"
        Write-Log "Generated $(((Get-Content $TypesFile | Measure-Object -Line).Lines)) lines"
    } else {
        Write-Error-Custom "Failed to generate types"
    }
}

# Function to run full setup
function Invoke-FullSetup {
    Write-Log "Running complete database setup..."
    
    Start-Supabase
    Start-Sleep -Seconds 2
    
    Apply-Migrations
    Write-Log "Waiting for migrations to complete..."
    Start-Sleep -Seconds 3
    
    Load-SeedData
    Start-Sleep -Seconds 1
    
    Invoke-Tests
    Start-Sleep -Seconds 1
    
    Generate-Types
    
    Write-Host ""
    Write-Host "=====================================================`n" -ForegroundColor Green
    Write-Host "Database setup complete!`n" -ForegroundColor Green
    Write-Host "=====================================================`n" -ForegroundColor Green
    Write-Host "Next steps:"
    Write-Host "1. Start your backend:  cd backend && npm run dev"
    Write-Host "2. Start your frontend: cd frontend && npm run dev"
    Write-Host "3. Access Supabase Studio: http://localhost:54323 (local)"
    Write-Host ""
}

# Main execution
switch ($Command) {
    'start' { Start-Supabase }
    'reset' { Reset-Database }
    'migrate' { Apply-Migrations }
    'seed' { Load-SeedData }
    'test' { Invoke-Tests }
    'generate-types' { Generate-Types }
    'full' { Invoke-FullSetup }
    default { Invoke-FullSetup }
}

Write-Log "Setup operation completed"
