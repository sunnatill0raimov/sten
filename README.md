# Sten - Secure Text Sharing Platform

Sten is a secure text sharing platform that allows users to create and share encrypted messages with password protection, expiration settings, and winner limits.

## Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Modern ES6+ modules** with import/export syntax
- **CORS** enabled for frontend integration
- **Environment variables** for configuration

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **React Router** for client-side routing
- **Tailwind CSS** for styling
- **Custom UI Components**

## Project Structure

```
sten/
├── backend/                 # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Custom middleware functions
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API routes
│   │   └── utils/          # Utility functions
│   ├── server.js           # Application entry point
│   └── package.json
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/           # API calls and configurations
│   │   ├── app/           # App structure and routing
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   └── styles/        # Global styles
│   └── package.json
└── README.md
```

## Features

- **Secure Message Creation**: Create encrypted messages with optional password protection
- **Flexible Expiration**: Set messages to expire after viewing, time limits, or manual deletion
- **Winner Limits**: Control how many users can successfully view your message
- **One-time View**: Messages that disappear after first successful view
- **Real-time Notifications**: Get notified about unclaimed prizes and new messages
- **Responsive Design**: Works perfectly on desktop and mobile devices

## API Endpoints

All API endpoints are prefixed with `/api/sten`:

- `GET /` - Health check and API information
- `POST /create` - Create a new encrypted message
- `POST /solve` - Attempt to solve/view a message
- `GET /:id` - Get message information (without content)
- `DELETE /:id` - Delete a message (if you're the creator)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/sten
FRONTEND_URL=http://localhost:5173
```

5. Start the backend server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The backend will be running on `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be running on `http://localhost:5173`

### Production Build

To build the frontend for production:

```bash
cd frontend
npm run build
```

The built files will be in the `dist/` directory.

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `FRONTEND_URL` - Frontend URL for CORS configuration

### Frontend
No environment variables required for basic setup. The frontend automatically connects to the backend at `http://localhost:3000/api`.

## Development

### Backend Development
- Uses ES6+ modules with `.js` extension
- Hot reload enabled with nodemon
- Comprehensive error handling and logging
- CORS enabled for frontend integration

### Frontend Development
- TypeScript for type safety
- Vite for fast development experience
- React 19 with latest features
- Tailwind CSS for utility-first styling

## Security Features

- Password-protected messages with strong encryption
- Input validation and sanitization
- Rate limiting to prevent abuse
- Secure CORS configuration
- Environment variable protection for sensitive data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository.
