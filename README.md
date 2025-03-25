# 🏢 Sjobergska RoD - Room Display System

<div align="center">

![React](https://img.shields.io/badge/React-18.2.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.3.0-38B2AC.svg)
![Supabase](https://img.shields.io/badge/Supabase-Latest-green.svg)
![PWA](https://img.shields.io/badge/PWA-Enabled-purple.svg)

A modern, responsive room display and booking system with real-time updates, sci-fi inspired UI and Google Calendar integration.

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Documentation](#documentation)

</div>

## ✨ Features

<div align="center">

| 🎯 Core Features | 🎨 UI/UX | 🔧 Technical |
|----------------|----------|-------------|
| • Real-time booking system | • Sci-Fi inspired themes | • TypeScript support |
| • Quick booking functionality | • Responsive design | • Supabase integration |
| • Google Calendar sync | • Modern interactive UI | • PWA support |
| • Room display system | • Light/Dark themes | • Real-time updates |

</div>

### 🚀 Quick Booking
- Instant "beam me up" one-click booking
- Smart time slot allocation
- Automatic conflict detection
- User-friendly confirmation

### 🔄 Google Calendar Integration
- Two-way sync with Google Calendar
- Fetch existing meetings
- Push room bookings to calendar
- Sync status monitoring

### 📱 Room Display
- Dedicated display mode for tablets/screens
- Real-time room availability status
- Next upcoming meeting info
- Sci-fi inspired visual design

## 🛠️ Tech Stack

<div align="center">

| Frontend | Backend | Styling | Database |
|----------|---------|---------|----------|
| React 18 | Supabase | Tailwind CSS | PostgreSQL |
| TypeScript | REST API | CSS Animations | Row Level Security |
| Vite | Google API | Responsive Design | Real-time Subscriptions |

</div>

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or newer)
- npm or yarn
- Supabase account
- Google Developer account (for Calendar integration)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/Sjobergska_RoD.git

# Navigate to project directory
cd Sjobergska_RoD

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

## ⚙️ Configuration

### Environment Variables
Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

### Database Setup
1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Navigate to SQL Editor
4. Run the setup scripts:

```sql
-- Initialize tables and security policies
-- (See src/scripts/setupDatabase.sql)

-- Set up Google Calendar integration
-- (See src/scripts/updateDatabaseForGoogleCalendar.sql)
```

## 📚 Documentation

### Project Structure
```
src/
├── components/     # React components
│   ├── RoomDisplay.tsx    # Room display component
│   └── GoogleCalendarSync.tsx  # Calendar sync component
├── contexts/       # React contexts
├── lib/            # Utility functions
│   ├── api.ts      # API client for Supabase
│   └── googleCalendarApi.ts  # Google Calendar integration
├── hooks/          # Custom hooks
├── types/          # TypeScript types
└── scripts/        # Setup scripts
```

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🔒 Security

- Row Level Security (RLS) with Supabase
- OAuth2 authentication for Google API
- Environment variable protection
- Secure API endpoints

## 🎨 Customization

### Themes
The application supports both dark and light sci-fi inspired themes. Theme selection is saved per room for a consistent experience.

```javascript
// Example of theme switching in RoomDisplay component
const toggleTheme = () => {
  const newTheme = displayTheme === 'light' ? 'dark' : 'light';
  setDisplayTheme(newTheme);
  localStorage.setItem(`display_theme_${roomName}`, newTheme);
};
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by Sjobergska Development Team

</div> 