// ================================================
// ADD THIS CODE TO YOUR FLAPPYHTML V2 SERVER FILE
// ================================================
// 
// Find your main Express server file (server.js, index.js, etc.)
// and add this code NEAR THE TOP, right after you create the Express app.
//
// Example: If your file has "const app = express();" 
//          add this code right after that line.
// ================================================

const path = require('path');

// Serve .well-known files for iOS Universal Links and Android App Links
// This MUST come BEFORE your other static file serving or catch-all routes
app.use('/.well-known', express.static(path.join(__dirname, '.well-known'), {
  setHeaders: (res, filePath) => {
    // Apple requires application/json content type
    res.setHeader('Content-Type', 'application/json');
  }
}));

// ================================================
// THAT'S IT! Save your file and restart your server.
// ================================================
//
// To verify it works, visit:
// https://roachy.games/.well-known/apple-app-site-association
//
// You should see JSON content (not your website HTML).
// ================================================
