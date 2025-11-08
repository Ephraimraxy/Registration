# REGISTRATION MANAGEMENT SYSTEM

## Overview

This is a full-stack registration management system built with React, Express, and Firebase. The application handles user registration, room assignment, and administrative management for accommodation. Users can register and automatically receive room and tag number assignments based on their gender and availability, while administrators can manage the entire system through a comprehensive dashboard.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client is built using React with TypeScript and follows a component-based architecture:
- **UI Framework**: Utilizes shadcn/ui components with Radix UI primitives for consistent, accessible design
- **Styling**: Tailwind CSS with custom theme variables for light/dark mode support
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter library for client-side routing
- **Form Handling**: React Hook Form with Zod schema validation for type-safe form management
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
The server follows a minimal Express.js setup with TypeScript:
- **Framework**: Express.js with TypeScript for type safety
- **Architecture Pattern**: Simple REST API structure with route separation
- **Storage Interface**: Abstracted storage layer with in-memory implementation (designed to be replaced with database)
- **Development Setup**: Hot-reloading with tsx and Vite middleware integration

### Data Storage Solutions
The application uses a hybrid approach:
- **Primary Database**: Firebase Firestore for real-time data synchronization and scalability
- **Schema Management**: Drizzle ORM configured for PostgreSQL (as backup/alternative option)
- **Local Storage**: In-memory storage implementation for development/testing
- **File Handling**: Excel file processing for bulk data imports (rooms and tags)

### Authentication and Authorization
- **Authentication**: Firebase Authentication (configured but not actively implemented in current codebase)
- **Session Management**: Prepared for session-based authentication with connect-pg-simple
- **Access Control**: Admin dashboard access without authentication barriers (suitable for internal use)

### Data Schema Design
The system uses Zod schemas for runtime validation and type safety:
- **User Schema**: Complete student information including personal details, contact info, and assignment data
- **Room Schema**: Room management with wing, gender restrictions, and bed availability tracking  
- **Tag Schema**: Tag assignment system with availability status tracking

## External Dependencies

### Core Technologies
- **Firebase**: Primary backend service providing Firestore database, authentication, and real-time updates
- **Neon Database**: PostgreSQL database service (configured as alternative to Firebase)
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL interactions

### UI and Styling
- **shadcn/ui**: Pre-built component library based on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom theming
- **Radix UI**: Accessible component primitives for complex UI elements
- **Lucide React**: Icon library for consistent iconography

### Development and Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across the entire application stack
- **ESBuild**: Fast JavaScript bundler for production builds

### Data Processing Libraries
- **XLSX**: Excel file parsing and generation for bulk operations
- **jsPDF**: PDF generation for student registration details
- **date-fns**: Date manipulation and formatting utilities

### Real-time Features
- **Firebase Firestore**: Real-time database updates for live admin dashboard
- **TanStack Query**: Intelligent caching and synchronization for optimal user experience

The architecture emphasizes type safety, real-time capabilities, and scalability while maintaining simplicity for easy maintenance and feature additions.