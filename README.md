# 🏢 Conference Room Booking System

<div align="center">

![React](https://img.shields.io/badge/React-18.2.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.3.0-38B2AC.svg)
![Supabase](https://img.shields.io/badge/Supabase-Latest-green.svg)

A modern, responsive conference room booking system with real-time updates and an intuitive interface.

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Documentation](#documentation)

</div>

## ✨ Features

<div align="center">

| 🎯 Core Features | 🎨 UI/UX | 🔧 Technical |
|----------------|----------|-------------|
| • Real-time booking system | • Dark/Light theme | • TypeScript support |
| • Emergency booking | • Responsive design | • Supabase integration |
| • Calendar views | • Modern UI | • Real-time updates |
| • Room management | • Intuitive interface | • Secure authentication |

</div>

### 🚀 Emergency Booking
- One-click booking of the largest available room
- Automatic time slot detection
- Instant confirmation dialog
- Priority booking system

## 🛠️ Tech Stack

<div align="center">

| Frontend | Backend | Styling | Database |
|----------|---------|---------|----------|
| React 18 | Supabase | Tailwind CSS | PostgreSQL |
| TypeScript | REST API | CSS Modules | Row Level Security |
| Vite | Real-time | Custom Themes | Indexed Queries |

</div>

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or newer)
- npm or yarn
- Supabase account

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/conference-room-booking.git

# Navigate to project directory
cd conference-room-booking

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
```

### Database Setup
1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Navigate to SQL Editor
4. Run the setup script:

```sql
-- Create tables and set up security policies
-- (See full SQL script in src/scripts/setupDatabase.sql)
```

## 📚 Documentation

### Project Structure
```
src/
├── components/     # React components
├── contexts/       # React contexts
├── lib/           # Utility functions
├── hooks/         # Custom hooks
├── types/         # TypeScript types
└── scripts/       # Setup scripts
```

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🔒 Security

- Row Level Security (RLS) enabled
- Secure authentication
- Protected API endpoints
- Environment variable protection

## 🎨 Customization

### Themes
The application supports both dark and light themes. Customize colors in `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          // ... more colors
        }
      }
    }
  }
}
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

Made with ❤️ by [Your Name]

[![Twitter](https://img.shields.io/badge/Twitter-@yourhandle-blue.svg)](https://twitter.com/yourhandle)
[![GitHub](https://img.shields.io/badge/GitHub-@yourusername-black.svg)](https://github.com/yourusername)

</div> 