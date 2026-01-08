# Google Maps Reviews Setup

## Environment Variables Required

Create a `.env.local` file in your project root and add:

```env
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

## Google Places API Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Enable Places API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Places API"
   - Click "Enable"

3. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

4. **Get Your Place ID**
   - Use Google Place ID Finder: https://developers.google.com/maps/documentation/places/web-service/place-id
   - Search for your business/location
   - Copy the Place ID

5. **Update Component**
   - Replace `PLACE_ID` in GoogleReviews.tsx with your actual Place ID
   - Add your API key to `.env.local`

## Current Configuration

- **Place ID**: `ChIJN1t_tDeuEmsRUsoyG83frY4` (Update this!)
- **API Endpoint**: Google Places Details API
- **Fields**: `reviews` (gets review data)

## Fallback System

If API fails, component will show mock reviews as fallback.

## Security Notes

- Never commit `.env.local` to version control
- Restrict API key to your domain in production
- Monitor API usage in Google Cloud Console
