# Unifit

Unifit is a comprehensive fitness and organization tracking system designed to monitor and manage physical health metrics, primarily focusing on running activities for personnel. 

The system consists of two main components: an **Admin Dashboard** and a **Mobile Client**. Both components share a common backend driven by Firebase for seamless data synchronization and user authentication.

## System Overview

### 1. Admin Web Dashboard (`/admin`)
A web-based administration panel that provides a high-level overview of the organization's fitness metrics, personnel, and document reports.
- **Tech Stack**: Next.js 16, React 19, Tailwind CSS, Lucide React, Firebase.
- **Key Features**:
  - **Live Run Logs**: Real-time tracking of personnel activities, recent runs, distance, and duration.
  - **Organization Metrics**: Dashboards displaying Total Personnel, Total Weekly Distance, Compliance Rates, and Average Pace.
  - **Personnel & Document Management**: Viewing personnel lists, mission tracking, and document/report viewing with department-based filtering (including PCE reports).
  - **Secure Authentication**: Firebase-powered user login and registration.
  - **Custom Branding**: Integrated custom Unifit logos for a consistent visual identity.

### 2. Mobile Client (`/mobile_client`)
A fitness tracking application for end-users to monitor their individual workout sessions and record their running statistics.
- **Tech Stack**: React Native, Expo, React Navigation, React Native Maps, Expo Location, Firebase.
- **Key Features**:
  - **Run Tracker**: GPS-based outdoor run tracking with live map overlays and path polylines.
  - **Real-time Stats**: Calculates distance (km), active duration, and pace during workouts.
  - **Secure Login**: Authenticated user sessions to safely store and retrieve individual fitness data.
  - **Customized UI**: Custom Unifit app launch icons and branding.

## Getting Started

### Prerequisites
Both applications require a connection to Firebase. Ensure you have your Firebase configuration keys ready and saved in a `.env` file within both the `admin/` and `mobile_client/` directories.

### Admin Dashboard
1. Navigate to the `admin` directory: `cd admin`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Access the dashboard at `http://localhost:3000`.

### Mobile Client
1. Navigate to the `mobile_client` directory: `cd mobile_client`
2. Install dependencies: `npm install`
3. Start the Expo server using npx: `npx expo start` (or `npx expo start -c` to clear the cache)
4. Use the Expo Go app on your physical device or run an emulator (iOS/Android) to interact with the app.

> **Note on Local Network Testing:** If you are testing the mobile client on a physical device and your API or WebSocket connections are failing, you may need to use **Ngrok** to create a secure tunnel to your local backend (e.g., tunneling `http://localhost:3000` to an `https://<hash>.ngrok.app` URL and using that URL in the mobile app environment).

## Core Technologies
- **Frontend**: Next.js, React Native (Expo)
- **Backend/Database**: Firebase (Authentication & Realtime Database)
- **Styling**: Tailwind CSS, React Native StyleSheets
- **Location Services**: React Native Maps, Expo Location
