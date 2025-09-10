# Student Registration System

A modern student registration system built with React, TypeScript, Firebase, and Tailwind CSS.

## Features

- **Student Registration**: Complete registration form with validation
- **Admin Dashboard**: Manage students, rooms, and tags
- **Real-time Updates**: Live data synchronization with Firebase
- **Excel Import/Export**: Bulk operations for rooms and tags
- **Responsive Design**: Mobile-friendly interface
- **Modern UI**: Built with Radix UI and Tailwind CSS

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Radix UI, Tailwind CSS
- **Backend**: Firebase Firestore
- **State Management**: React Query
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Ephraimraxy/Registration.git
cd Registration
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a Firebase project
   - Enable Firestore
   - Add your Firebase config to `client/src/lib/firebase.ts`

4. Start the development server:
```bash
npm run dev
```

## Deployment

### Netlify Deployment

This project is configured for easy deployment on Netlify:

1. **Connect to GitHub**: Link your GitHub repository to Netlify
2. **Build Settings**: 
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Environment Variables**: Add your Firebase configuration as environment variables
4. **Deploy**: Netlify will automatically build and deploy your app

### Environment Variables

Set these environment variables in your Netlify dashboard:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/           # Utilities and configurations
│   │   ├── pages/         # Page components
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend server (if needed)
├── shared/                # Shared types and schemas
├── netlify.toml          # Netlify configuration
└── package.json          # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check` - Type checking
- `npm run db:push` - Push database schema

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details