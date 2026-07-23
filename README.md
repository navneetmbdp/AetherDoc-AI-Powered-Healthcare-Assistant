# 🩺 AetherDoc – AI-Powered Healthcare Assistant

<p align="center">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi" />
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb" />
  <img src="https://img.shields.io/badge/Gemini-AI-blue?logo=google" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

## 📌 Overview

**AetherDoc** is an AI-powered healthcare assistant designed to provide intelligent first-level healthcare guidance through Artificial Intelligence.

The platform combines modern web technologies with Generative AI to help users receive medical guidance, analyze medical reports, perform voice consultations, monitor mental wellness, and obtain emergency first-aid assistance.

> **Disclaimer:** AetherDoc is intended for educational and first-level healthcare guidance only. It is **not** a replacement for professional medical diagnosis or treatment.

---

# ✨ Key Features

## 🤖 AI Medical Consultation

- AI-powered healthcare chatbot
- Symptom-based consultation
- Specialist recommendation
- Personalized responses using user profile
- Conversation history

---

## 🎤 Real-Time Voice Consultation

- Voice-based doctor consultation
- Speech-to-Text (STT)
- Text-to-Speech (TTS)
- WebSocket real-time communication
- Natural conversational experience

---

## 🩻 Medical Image Analysis

Upload medical images for AI analysis.

Supports:

- X-rays
- Skin conditions
- Medical reports
- Image interpretation
- Risk assessment
- AI-generated recommendations

---

## ❤️ Mental Health Support

AI-assisted emotional wellness module featuring:

- Mental health chatbot
- Emotion-aware conversation
- Voice interaction
- Stress support
- Personalized wellness guidance

---

## 🚨 Emergency Rescue Assistant

Provides immediate emergency guidance using AI.

Features include:

- First-aid instructions
- Emergency guidance
- Camera assistance
- Location support
- AI-powered rescue suggestions

---

## 👤 User Profile Management

Maintain complete health information including:

- Medical history
- Allergies
- Medications
- Chronic diseases
- Personal profile

---

## 📊 Reports & History

- Medical report management
- AI-generated analysis
- Consultation history
- Previous diagnoses
- Activity tracking

---

# 🏗️ System Architecture

```
                  User
                    │
                    ▼
         React + TypeScript Frontend
                    │
         REST API / WebSocket
                    │
                    ▼
            FastAPI Backend
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
 MongoDB       Gemini AI      AI Services
 Database     Medical Engine  STT • TTS
                    │
                    ▼
         Medical Recommendations
```

---

# 🛠 Tech Stack

## Frontend

- React.js
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- Axios

---

## Backend

- FastAPI
- Python
- JWT Authentication
- WebSockets
- Pydantic

---

## Database

- MongoDB
- Motor (Async Driver)

---

## Artificial Intelligence

- Google Gemini AI
- Prompt Engineering
- Medical Report Analysis
- AI Consultation

---

## Computer Vision

- OpenCV
- YOLO
- Face API
- Image Processing

---

## Voice Technologies

- Speech-to-Text
- Text-to-Speech
- Voice Streaming

---

# 📂 Project Structure

```
AetherDoc
│
├── frontend
│   ├── src
│   ├── components
│   ├── pages
│   ├── hooks
│   ├── services
│   └── assets
│
├── backend
│   ├── routes
│   ├── services
│   ├── models
│   ├── schemas
│   ├── database
│   ├── prompts
│   └── main.py
│
├── docs
├── README.md
└── requirements.txt
```

---

# 🔄 Workflow

1. User logs into the application.
2. Selects a healthcare service.
3. Frontend sends API/WebSocket request.
4. FastAPI validates request.
5. MongoDB retrieves user data.
6. Gemini AI processes medical information.
7. AI generates response.
8. Results are displayed on the dashboard.
9. Consultation history is saved.

---

# 🔐 Authentication

- JWT Authentication
- Password Hashing
- Secure Login
- Protected APIs
- Session Management

---

# 📸 Modules

✅ Authentication

✅ Dashboard

✅ AI Consultation

✅ Voice Consultation

✅ Medical Image Analysis

✅ Mental Health Assistant

✅ Emergency Rescue

✅ Reports

✅ History

✅ User Profile

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/navneetmbdp/AetherDoc-AI-Powered-Healthcare-Assistant.git
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## Backend

```bash
cd backend

pip install -r requirements.txt

uvicorn main:app --reload
```

---

## Environment Variables

Create a `.env` file.

Example:

```env
MONGODB_URI=your_mongodb_connection

JWT_SECRET_KEY=your_secret

GEMINI_API_KEY=your_api_key
```

---

# 💡 Future Enhancements

- Multi-language healthcare support
- Electronic Health Record (EHR) Integration
- AI-powered appointment booking
- Wearable device integration
- Cloud deployment
- Mobile application
- Predictive disease analytics
- Hospital integration
- Doctor dashboard

---

# 🏆 Highlights

- Full Stack AI Healthcare Platform
- Real-Time Voice Consultation
- Medical Image Analysis
- Emergency AI Assistant
- Mental Health Support
- Secure Authentication
- MongoDB Integration
- FastAPI Backend
- React Frontend
- Gemini AI Integration

---

# 👨‍💻 Team Project

AetherDoc was developed as a collaborative final-year engineering project. Different team members contributed to the design, implementation, testing, and integration of various modules.

---

# 📄 Research

This project is based on our research work in AI-assisted healthcare systems and demonstrates the practical application of Generative AI, Computer Vision, and Full Stack Web Development in healthcare.

---

# 📜 License

This project is developed for educational and research purposes.

---

# ⭐ Support

If you found this project useful,

⭐ Star the repository

🍴 Fork it

🤝 Contribute

📩 Share your feedback

---

## Made with ❤️ using React, FastAPI, MongoDB & Gemini AI
