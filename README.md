# 🎓 SmartClass

> A modern classroom management platform designed to improve transparency, communication, and student engagement.

![Status](https://img.shields.io/badge/Status-Active-success)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Supabase](https://img.shields.io/badge/Backend-Supabase-green)

---

# 📖 About

SmartClass is a web-based classroom management system developed for the **BAIUST CSE Spring Fest 2026 Hackathon (Junior Segment)**.

The goal of SmartClass is to create a safer, more transparent, and student-friendly classroom environment by combining feedback management, AI-powered tools, emergency support, and classroom utilities into a single platform.

---

# ✨ Features

## 🏠 Dashboard
- Classroom overview
- Statistics cards
- Recent activities
- Quick navigation

---

## 💬 Class Feedback

Students can submit classroom feedback anonymously.

Features:

- Daily feedback limit
- Community voting
- Verified feedback system
- Live vote count
- Edit/Delete own feedback
- Category-based feedback
- Real-time updates

Verification Rules

- Minimum 5 votes
- At least 80% "True" votes
- Users cannot vote on their own feedback

---

## 👨‍🏫 Captain Feedback

A dedicated feedback system for classroom captains.

Features

- Select captain
- Submit anonymous feedback
- Community verification
- Risk monitoring

Captain Status

🟢 Safe

🟡 Warning

🟠 High Risk

🔴 RED ALERT (3 or more verified complaints)

---

## 🪑 Smart Seat Planner

Automatically generates classroom seating based on student height.

Features

- Automatic arrangement
- Search students
- Print seating plan
- Export PDF
- Classroom view

---

## 🚨 SOS Emergency

Emergency alert system for students.

Features

- One-click SOS
- Manual location
- Real-time notifications
- Emergency history
- Captain resolution

---

## 📚 AI Syllabus Summarizer

Summarize long syllabus using AI.

Powered by OpenAI / Google Gemini.

Features

- Paste syllabus
- AI summary
- Important topics
- Estimated study time
- Copy summary

---

## 📜 School Rules

Digital school rulebook.

Features

- Search rules
- Category filter
- Captain management
- Live updates

---

## 📊 Reports

Analytics dashboard.

Includes

- Feedback statistics
- Category analysis
- Fund reports
- Verified feedback
- Charts

---

## 🔔 Notifications

Real-time notification center.

Features

- Feedback notifications
- SOS alerts
- Verification updates
- Read/Unread tracking

---

## 👤 User Profile

Each user has

- Name
- Roll Number
- Secret Code
- Height
- Role

Users can

- Change password
- View profile

---

# 🔐 Authentication

Users log in using

- Roll Number
- Password
- Secret Code

The Secret Code acts as the user's public identity.

Roll numbers are never displayed publicly.

---

# 🛠 Tech Stack

Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

Backend

- Supabase
- Supabase Authentication
- Supabase Database
- Supabase Realtime
- Supabase Storage

Libraries

- React Query
- React Hook Form
- Zod
- Lucide React

AI

- OpenAI API / Google Gemini API

---

# 📂 Project Structure

```
src/
 ├── components/
 ├── pages/
 ├── hooks/
 ├── services/
 ├── lib/
 ├── integrations/
 ├── types/
 └── utils/
```

---

# 🚀 Installation

Clone the repository

```bash
git clone https://github.com/your-username/smartclass.git
```

Open the project

```bash
cd smartclass
```

Install dependencies

```bash
npm install
```

Run development server

```bash
npm run dev
```

Build project

```bash
npm run build
```

---

# ⚙ Environment Variables

Create a `.env` file.

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL

VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

VITE_OPENAI_API_KEY=YOUR_OPENAI_KEY
```

or

```env
VITE_GEMINI_API_KEY=YOUR_GEMINI_KEY
```

---

# 📸 Screenshots

Add screenshots here.

- Login
- Dashboard
- Class Feedback
- Captain Feedback
- Seat Planner
- SOS
- Reports
- AI Syllabus

---

# 🎯 Problem Statement

SmartClass addresses common classroom challenges including

- Lack of anonymous feedback
- Classroom transparency
- Captain accountability
- Student safety
- AI-assisted learning
- Digital classroom management

---

# 🔮 Future Improvements

- Mobile App
- QR Attendance
- AI Chat Assistant
- Parent Portal
- Smart Notice Board
- Smart Routine
- Teacher Dashboard

---

# 👨‍💻 Team

Team Name

**[Your Team Name]**

Members

- Member 1
- Member 2
- Member 3
- Member 4

---

# 🏆 Hackathon

Developed for

**BAIUST CSE Spring Fest 2026 Hackathon**

Junior Segment

---

# 📄 License

This project was developed for educational and hackathon purposes.

---

# ❤️ Thank You

Thank you for visiting SmartClass!

If you like this project, consider giving it a ⭐ on GitHub.
