# React + TypeScript Frontend & Node.js Backend Connection Fix

## Problem Identified
- **Error**: `POST http://localhost:3003/api/sten/create net::ERR_CONNECTION_REFUSED`
- **Root Cause**: Backend server not running and port mismatch configuration

## ✅ Fixed Configuration

### 1. Backend Port Configuration (Fixed)
**File**: `sten/server/.env`
```env
DATABASE_URL=mongodb+srv://sunnatilloraimov660_db_user:mZZUiRVcxb49SJTH@cluster0.ww3fx2w.mongodb.net/?appName=Cluster0
PORT=3003
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:5173
```

### 2. CORS Configuration (Enhanced)
**File**: `sten/server/src/app.js`
```javascript
// CORS middleware - more permissive for development
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## 🚀 How to Start the Backend Server

### Step 1: Navigate to Backend Directory
```bash
cd sten/server
```

### Step 2: Install Dependencies (if not already done)
```bash
npm install
```

### Step 3: Start the Server
```bash
npm start
```

**Expected Output:**
```
Server is running on port 3003
```

### Alternative: Start with Nodemon (for development)
```bash
npm run dev
```

## 🌐 Frontend Configuration

### Frontend API URL (Already Correct)
**File**: `sten/client/src/api/stenApi.ts`
```typescript
const API_BASE_URL = 'http://localhost:3003/api/sten';
```

## 🧪 Testing the Connection

### Method 1: Using curl (Test Backend First)
```bash
# Test if backend is running
curl http://localhost:3003

# Test the specific endpoint
curl -X POST http://localhost:3003/api/sten/create \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test message",
    "isPasswordProtected": false,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "maxWinners": 1,
    "oneTime": true
  }'
```

### Method 2: Using Browser
1. Start backend: `cd sten/server && npm start`
2. Open browser: `http://localhost:3003`
3. Should see: `{"message": "STEN Backend API", "version": "1.0.0"}`

## 🔧 Working Frontend POST Request Example

Your current `CreateSten.tsx` is already well-implemented. Here's a simplified version for testing:

```typescript
// Simple test function
const testCreateSten = async () => {
  try {
    const response = await fetch('http://localhost:3003/api/sten/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test STEN message',
        isPasswordProtected: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        maxWinners: 1,
        oneTime: true
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('STEN created:', data);
    return data;
  } catch (error) {
    console.error('Error creating STEN:', error);
    throw error;
  }
};
```

## 🐧 Fedora Linux Note (127.0.0.1)

If you're on Fedora Linux and experiencing connection issues:

### Use 127.0.0.1 instead of localhost
Update `sten/client/src/api/stenApi.ts`:
```typescript
const API_BASE_URL = 'http://127.0.0.1:3003/api/sten';
```

### Or update CORS to include 127.0.0.1 (already done)
The CORS configuration already includes:
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

## 🔍 Troubleshooting Steps

### 1. Check if Backend is Running
```bash
# Check if port 3003 is in use
lsof -i :3003

# Or with netstat
netstat -tulpn | grep :3003
```

### 2. Test Backend Health
```bash
curl http://localhost:3003
```

### 3. Check MongoDB Connection
Ensure your MongoDB connection string is valid and the database is accessible.

### 4. Firewall Issues (Fedora)
```bash
# Check firewall status
sudo firewall-cmd --list-all

# Allow port 3003 if needed
sudo firewall-cmd --add-port=3003/tcp --permanent
sudo firewall-cmd --reload
```

## 📋 Complete Startup Sequence

1. **Start MongoDB** (if running locally)
2. **Start Backend Server**:
   ```bash
   cd sten/server
   npm start
   ```
3. **Start Frontend**:
   ```bash
   cd sten/client
   npm run dev
   ```
4. **Test in Browser**:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3003`

## 🎯 Expected Flow

1. User fills out the form in `CreateSten.tsx`
2. Frontend sends POST request to `http://localhost:3003/api/sten/create`
3. Backend receives request, processes data, saves to MongoDB
4. Backend responds with `{ stenId: "...", publicUrl: "..." }`
5. Frontend navigates to `/ready/${stenId}`

## ✅ Verification

After following these steps, you should be able to:
1. Start the backend server without errors
2. Access `http://localhost:3003` in browser
3. Create a STEN from your React frontend
4. No more `ERR_CONNECTION_REFUSED` errors

The connection issue should now be resolved!
