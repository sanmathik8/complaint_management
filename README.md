# Complaint Management Platform

A robust, anonymous, and secure platform for student complaint management. Built with Django (Backend) and Next.js (Frontend), focusing on security, anonymity, and institutional integrity.

## 🚀 Project Overview
This system allows students to submit complaints securely and anonymously while providing administrators (Principals/Admins) with powerful tools to manage, respond to, and audit these complaints.

## ✨ Key Features
- **Anonymous Reporting**: Students can report issues without revealing their identity, using cryptographically secured sessions.
- **System Freeze**: Admins can instantly lock the system to prevent new submissions during high-volume or critical periods.
- **Smart Triage**: Automated content analysis flags urgent issues (e.g., safety, harassment) and auto-escalates them.
- **Duplicate Prevention**: Integrated word-overlap and similarity detection to prevent spam and redundant reporting.
- **Quota Management**: Hard limits on daily and weekly submissions per user/session.
- **End-to-End Encryption**: Sensitive complaint content is encrypted at rest in the database.
- **Audit Trails**: Every action (submission, read, reply, status change) is logged for accountability.

## 🛠 Tech Stack
- **Backend**: Django, Django REST Framework (DRF), PostgreSQL
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Axios
- **Security**: DRF Token Authentication, AES Encryption for content, Jaccard Similarity for duplicate detection.

## 📊 System Limits & Rules
- **Daily Limit**: 2 complaints per user per 24 hours.
- **Weekly Limit**: 5 complaints per user per 7 days.
- **Cooldown**: 10-minute mandatory wait between submissions.
- **Global Limit**: Default 200 total submissions per day system-wide (triggers auto-freeze).
- **Edit Window**: Students can only edit "Pending" complaints within the first 12 hours.

## 🔌 API Endpoints

### Auth
- `POST /api/login/`: Authenticate user.
- `POST /api/register/`: Register new student account.

### Complaints (Students)
- `GET /api/complaints/categories/`: List available complaint categories.
- `POST /api/complaints/complaints/`: Submit a new complaint.
  - **Request Body**: `{ "content": "string", "category_slug": "string", "severity": int }`
- `PATCH /api/complaints/complaints/{id}/`: Edit a pending complaint.
- `POST /api/complaints/complaints/{id}/resolve/`: Confirm a complaint is resolved.

### Admin Tools (Privileged)
- `GET /api/complaints/complaints/dashboard_stats/`: Executive summary.
- `POST /api/complaints/complaints/{id}/reply/`: Principal's secure response.
- `POST /api/complaints/complaints/{id}/mark_read/`: Mark as under review.
- `PATCH /api/complaints/settings/1/`: Toggle `is_frozen` or adjust global limits.

## 📂 Setup Instructions

### Backend
1. Navigate to `/backend`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Run migrations: `python manage.py migrate`.
4. Create superuser: `python manage.py createsuperuser`.
5. Start server: `python manage.py runserver`.

### Frontend
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Configure API URL in `.env.local`.
4. Start dev server: `npm run dev`.

## 📜 Known Constraints & Future Plans
- **Media Optimization**: Currently, image attachments are stored as Base64 in the DB. Future updates will move these to AWS S3.
- **Live Notifications**: Transitioning from polling to WebSockets for real-time admin alerts.
- **Advanced NLP**: Integration with modern LLMs for better sentiment analysis and triage accuracy.
