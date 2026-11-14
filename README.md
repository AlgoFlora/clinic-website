# 🏥 Devaki Clinic & Day Care Centre

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D16-brightgreen?logo=node.js)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

> A modern, responsive healthcare clinic website and real-time clinic management system featuring instant patient appointment booking, live slot synchronization, and a dedicated doctor consultation portal with electronic medical records (EMR) and digital prescription (Rx) generation.

---

## 🌟 Key Features

### 👨‍⚕️ Patient Experience
- **Responsive Landing Portal**: Clean, patient-friendly presentation of clinical services, doctor profiles, clinic hours, location details, and patient FAQs.
- **Real-Time Appointment Booking**: Interactive appointment scheduling interface that displays available time slots for doctors.
- **Live Slot Synchronization**: Real-time slot locking via Server-Sent Events (SSE). When a slot is booked by one patient, it immediately updates for all active visitors.
- **Multilingual Support**: Instant on-the-fly language switching across English, Hindi, and Marathi.

### 🩺 Doctor & Staff Dashboard
- **Secure Authentication**: Protected doctor portal with scrypt-salted password hashing and bearer token session management.
- **Live Consultation Queue**: Instant push notifications and real-time list updates when appointments are booked or rescheduled.
- **Electronic Medical Records (EMR)**: Complete patient history tracking, past visits, clinical notes, and vital statistics.
- **Digital Prescription (Rx) Generator**: Quickly create and format customized digital prescriptions with dosage instructions and advice.
- **Backup & Data Export**: One-click database download and atomic snapshot restoration.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: Pure HTML5, CSS3 (CSS Variables, Flexbox, CSS Grid), Vanilla ES6+ JavaScript.
- **Backend**: Lightweight Node.js HTTP server built completely with native standard libraries (`http`, `crypto`, `fs`, `path`) — **zero npm runtime dependencies** required!
- **Real-Time Engine**: Built-in Server-Sent Events (SSE) broadcast channel for instant multi-client push notifications.
- **Persistence Layer**: Atomic transactional JSON storage engine with write-ahead temp file renaming to prevent corruptions during concurrent writes.

---

## 📁 Repository Structure

```text
├── assets/
│   ├── icons/               # Clinic UI icons and vector graphics
│   └── images/              # Clinic photography, doctor portraits, illustrations
├── css/
│   ├── booking.css          # Slot picker & booking wizard styling
│   ├── components.css       # Buttons, cards, modals, and badge components
│   ├── dashboard.css        # Doctor management portal layouts
│   ├── dashboard-extra.css  # EMR and prescription viewer styling
│   ├── global.css           # Global typography and base CSS reset
│   ├── lang-switch.css      # Language selection toggle controls
│   ├── public-pages.css     # Home, services, about, and contact layouts
│   ├── responsive.css       # Mobile, tablet, and widescreen breakpoints
│   ├── site-updates.css     # Announcements and dynamic banner styling
│   └── variables.css        # Color palette, spacing scales, and theme tokens
├── js/
│   ├── appointment.js       # Client-side appointment booking flow
│   ├── core.js              # State schema, migrations, and core business rules
│   ├── dashboard.js         # Doctor dashboard controllers and queue logic
│   ├── dashboard-mr.js      # Medical records (EMR) management module
│   ├── dashboard-rx.js      # Prescription builder and print formatter
│   ├── navigation.js        # Smooth scrolling, mobile drawer, and menu handling
│   ├── site-updates.js      # Dynamic clinic alerts and banner ticker
│   ├── store.js             # Data synchronization store (Local & API sync)
│   ├── translations.js      # Primary localization dictionary (EN, MR, HI)
│   └── translations-extra.js# Extended clinical terms and specialty translations
├── appointment.html         # Patient booking page
├── dashboard.html           # Doctor consultation and clinic admin portal
├── doctor-login.html        # Doctor authentication view
├── index.html               # Main clinic landing page
├── HOW-TO-RUN.txt           # Quick run instructions
├── package.json             # Project metadata and start scripts
└── server.js                # Real-time Node.js HTTP and SSE server
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 16 or newer)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AlgoFlora/clinic-website.git
   cd clinic-website
   ```

2. **Start the server**:
   ```bash
   npm start
   # or directly with Node:
   node server.js
   ```

3. **Access the application**:
   - **Patient Website**: Open [http://localhost:3000](http://localhost:3000)
   - **Doctor Portal**: Open [http://localhost:3000/doctor-login.html](http://localhost:3000/doctor-login.html)
     - *Default Credentials*: `doctor@devaki.in` / `doctor123` (configurable in settings)

---

## ⚙️ Operating Modes

- **Live Mode (Recommended)**: Running via `node server.js` provides shared real-time state across all users and devices via Server-Sent Events and server-side atomic file persistence (`data/db.json`).
- **Static / Local Mode**: Opening `index.html` or `appointment.html` directly in any web browser without Node.js operates seamlessly using `localStorage`, ideal for demoing or offline exploration.

---

## 🌐 Deployment Options

Because the application has **zero native build steps or external dependencies**, it can be deployed in seconds on any cloud platform:
- **Render / Railway / VPS**: Deploy as a Node.js web service running `node server.js`.
- **Vercel / Netlify / GitHub Pages**: Can be hosted statically for client-side demonstrations.

---

## 👤 Author

Developed by **[Shravani Suryawanshi (AlgoFlora)](https://github.com/AlgoFlora)**  
*Full Stack Developer | AIDS Engineering Student*  
LinkedIn: [shravani-suryavanshi](https://www.linkedin.com/in/shravani-suryavanshi-ba7268305)

---

## 📄 License

This project is licensed under the MIT License.
