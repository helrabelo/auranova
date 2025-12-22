# Spotify Developer Setup

This guide explains how to set up Spotify API access for Auranova.

## 1. Create a Spotify Developer Account

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account (or create one)
3. Accept the Developer Terms of Service

## 2. Create a New App

1. Click "Create app"
2. Fill in the details:
   - **App name**: Auranova (or your preferred name)
   - **App description**: 3D visualization of your music listening history
   - **Redirect URI**: `http://localhost:5173/callback`
   - Check "Web API" under APIs used
3. Click "Save"

## 3. Get Your Credentials

1. Once created, click on your app
2. Click "Settings"
3. Copy your **Client ID** (you'll need this)
4. Note: We don't need Client Secret because we use PKCE flow

## 4. Configure Redirect URIs

1. In your app settings, under "Redirect URIs"
2. Add: `http://localhost:5173/callback`
3. For production, also add your deployed URL (e.g., `https://auranova.example.com/callback`)
4. Click "Save"

## 5. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Client ID:
   ```
   VITE_SPOTIFY_CLIENT_ID=your_actual_client_id
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
   ```

## Required Scopes

Auranova requests the following Spotify scopes:

| Scope | Purpose |
|-------|---------|
| `user-top-read` | Access your top artists and tracks |
| `user-read-recently-played` | Access your recently played tracks |
| `streaming` | Control playback for audio previews |
| `user-read-email` | Display your profile info |
| `user-read-private` | Access your subscription details |

## PKCE Authentication Flow

Auranova uses **PKCE (Proof Key for Code Exchange)** for authentication. This is a more secure OAuth flow that doesn't require a backend server or client secret.

### How it works:

1. **Start**: User clicks "Connect with Spotify"
2. **Code Verifier**: App generates a random string (code verifier)
3. **Code Challenge**: App creates a SHA256 hash of the verifier
4. **Redirect**: User is sent to Spotify with the code challenge
5. **Authorization**: User approves the app on Spotify's site
6. **Callback**: Spotify redirects back with an authorization code
7. **Token Exchange**: App exchanges code + verifier for access token
8. **Refresh**: App uses refresh token to get new access tokens

### Why PKCE?

- No backend server needed
- No client secret exposure in frontend code
- Secure against authorization code interception attacks
- Recommended by OAuth 2.0 security best practices

## Troubleshooting

### "Invalid client ID"
- Make sure you copied the Client ID correctly
- Check that `.env` has no extra spaces

### "Invalid redirect URI"
- Ensure the redirect URI in `.env` matches exactly what's in Spotify Dashboard
- Include the protocol (`http://` or `https://`)
- Include the path (`/callback`)

### "User not registered"
- If your app is in Development Mode, only users you've added can use it
- Go to your app settings → User Management → Add users by their Spotify email

### Token Refresh Issues
- Tokens expire after 1 hour
- The app automatically refreshes tokens
- If issues persist, try logging out and back in

## Production Deployment

When deploying to production:

1. Add your production URL to Redirect URIs in Spotify Dashboard
2. Update `VITE_SPOTIFY_REDIRECT_URI` in your production environment
3. Consider applying for Quota Extension if expecting >25 users
