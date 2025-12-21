# SPA Fallback Routing Setup

This document explains the SPA (Single Page Application) routing configuration implemented for the Sten frontend.

## Problem
Direct navigation to routes like `/view/:id` on the production frontend returns 404 because the server tries to find matching files instead of serving the React app.

## Solution Implemented

### 1. Render Hosting (_redirects)
Created `public/_redirects` file:
```
/*    /index.html   200
```
This ensures all routes fallback to index.html with a 200 status.

### 2. Netlify Hosting (netlify.toml)
Created `public/netlify.toml`:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. Vite Build Configuration
Updated `vite.config.ts` to ensure proper SPA handling:
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  }
})
```

### 4. Express Server (server.js)
Created custom Express server for full control:
```javascript
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

## Routes Handled
- `/` - Create Sten page
- `/create` - Create Sten page  
- `/inbox` - Inbox page
- `/ready/:id` - Sten Ready page
- `/solve/:id` - Solve Sten page
- `/view/:id` - View Sten page
- `/solved/:id` - Already Solved page

## Deployment Instructions

### For Render:
1. Use the `_redirects` file (already configured)
2. Build command: `npm run build`
3. Publish directory: `dist`

### For Netlify:
1. Use the `netlify.toml` file (already configured)
2. Build command: `npm run build`
3. Publish directory: `dist`

### For Custom Server:
1. Use `server.js` file
2. Set start script: `"start": "node server.js"`
3. Ensure `dist` directory exists

## Testing
After deployment, test direct navigation to:
- `https://your-domain.com/view/abc123`
- `https://your-domain.com/solve/abc123`
- `https://your-domain.com/create`

All should load the React app and display the correct pages via React Router.
