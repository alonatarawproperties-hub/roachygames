# Roachy Games Web Integration Files

Copy these files to your **FlappyHtml v2** (roachy.games) project to enable deep linking between the web marketplace and the mobile app.

## Quick Setup

### Step 1: Create the .well-known folder

In your web project root, create a folder called `.well-known`

### Step 2: Copy the files

1. Copy `apple-app-site-association` to `.well-known/apple-app-site-association`
   - **Important**: This file must have NO file extension
   - Must be served with `Content-Type: application/json`

2. Copy `assetlinks.json` to `.well-known/assetlinks.json`

### Step 3: Update the placeholder values

**In apple-app-site-association:**
- Replace `YOUR_TEAM_ID` with your Apple Developer Team ID
  - Find it at: https://developer.apple.com/account → Membership → Team ID
  - Example: If your Team ID is `ABC123DEF4`, the appID becomes `ABC123DEF4.com.cryptocreatures.app`

**In assetlinks.json:**
- Replace `YOUR_SHA256_FINGERPRINT_HERE` with your Android signing key fingerprint
  - Get it by running: `npx eas-cli credentials --platform android`
  - Look for "SHA256 Fingerprint" in the output
  - Format: `12:34:56:78:90:AB:CD:EF:...`

### Step 4: Ensure proper serving

Your web server must:
- Serve `.well-known/apple-app-site-association` without file extension
- Return `Content-Type: application/json` for both files
- Serve over HTTPS

**For Express.js:**
```javascript
const express = require('express');
const path = require('path');

app.use('/.well-known', express.static(path.join(__dirname, '.well-known'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Type', 'application/json');
  }
}));
```

### Step 5: Add "Open in App" buttons

Copy the code from `open-in-app-button.html` to your web pages where you want users to open the mobile app.

## Deep Link URLs

The mobile app responds to these URL patterns:

| Web URL | Deep Link | Opens |
|---------|-----------|-------|
| `https://roachy.games/app/home` | `roachy-games://home` | Home screen |
| `https://roachy.games/app/hunt` | `roachy-games://hunt` | Hunt game |
| `https://roachy.games/app/inventory` | `roachy-games://inventory` | Inventory |
| `https://roachy.games/app/profile` | `roachy-games://profile` | Profile |

## Shared Identity via Wallet

Both apps share user identity through the Solana wallet address:

1. User connects wallet on web (roachy.games)
2. Web generates a deep link: `roachy-games://home?wallet=ABC123...`
3. Mobile app reads the wallet parameter and looks up the same user profile
4. Both apps show the same inventory, earnings, and progress

## Validation Tools

After setup, verify your configuration:

- **iOS**: https://search.developer.apple.com/appsearch-validation-tool/
- **Android**: https://developers.google.com/digital-asset-links/tools/generator

## Troubleshooting

**Links open in browser instead of app:**
- Ensure apple-app-site-association has no file extension
- Verify the Team ID is correct
- Check that associated domains are configured in app.json
- Wait 24-48 hours for Apple to cache the file

**Android links not working:**
- Verify SHA256 fingerprint matches your signing key
- Ensure autoVerify is true in app.json
- Test with: `adb shell am start -a android.intent.action.VIEW -d "https://roachy.games/app/home"`
