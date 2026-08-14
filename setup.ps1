# SpeakSafe - Complete Setup and Run Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SPEAKSAFE - Setup & Launch Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "[1/6] Checking Python..." -ForegroundColor Yellow
python --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "[2/6] Checking Node.js..." -ForegroundColor Yellow
node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKEND SETUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Navigate to backend
Set-Location -Path "backend"

# Create virtual environment if it doesn't exist
if (-Not (Test-Path "venv")) {
    Write-Host "[3/6] Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "[3/6] Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Install requirements
Write-Host "[4/6] Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt -q

# Run migrations
Write-Host "[5/6] Running database migrations..." -ForegroundColor Yellow
python manage.py makemigrations
python manage.py migrate

# Create superuser prompt
Write-Host ""
Write-Host "Do you want to create a superuser? (Y/N)" -ForegroundColor Yellow
$createSuperuser = Read-Host
if ($createSuperuser -eq "Y" -or $createSuperuser -eq "y") {
    python manage.py createsuperuser
}

# Load initial data (categories)
Write-Host "[6/6] Loading initial complaint categories..." -ForegroundColor Yellow
python manage.py shell -c "
from complaints.models import ComplaintCategory

categories = [
    {'name': 'Facilities', 'slug': 'facilities', 'description': 'Infrastructure and maintenance issues', 'icon': '🏢', 'response_days': 7},
    {'name': 'Harassment', 'slug': 'harassment', 'description': 'Bullying, discrimination, or misconduct', 'icon': '⚠️', 'response_days': 3, 'default_severity': 4},
    {'name': 'Academic', 'slug': 'academic', 'description': 'Academic integrity and fairness', 'icon': '📚', 'response_days': 5},
    {'name': 'Safety', 'slug': 'safety', 'description': 'Security and safety concerns', 'icon': '🛡️', 'response_days': 2, 'default_severity': 3},
    {'name': 'Administration', 'slug': 'administration', 'description': 'Administrative processes and policies', 'icon': '📋', 'response_days': 7},
    {'name': 'Other', 'slug': 'other', 'description': 'Other concerns not listed above', 'icon': '💬', 'response_days': 7},
]

for cat_data in categories:
    ComplaintCategory.objects.get_or_create(
        slug=cat_data['slug'],
        defaults=cat_data
    )
print('✓ Categories loaded successfully')
"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FRONTEND SETUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Navigate to frontend
Set-Location -Path "../frontend"

# Install npm packages
if (-Not (Test-Path "node_modules")) {
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "Node modules already installed. Skipping..." -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host "  1. Backend:  cd backend && .\venv\Scripts\Activate.ps1 && python manage.py runserver" -ForegroundColor White
Write-Host "  2. Frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or run: .\run.ps1" -ForegroundColor Yellow
Write-Host ""

# Return to root
Set-Location -Path ".."
