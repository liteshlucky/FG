# Environment Setup for AI Features

## Gemini API Key

To enable AI-powered diet and workout plan generation, you need a Gemini API key.

### Getting Your Free Gemini API Key:

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### Adding the API Key:

1. Create a `.env.local` file in the project root (if it doesn't exist)
2. Add the following line:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Replace `your_api_key_here` with your actual API key
4. Restart the development server (`npm run dev`)

### Testing:

1. Navigate to any member's detail page
2. Scroll to the "AI-Powered Personalized Plan" section
3. Click "Generate AI Plan"
4. Wait 10-20 seconds for the plan to generate

The system will create a personalized Indian diet plan and workout chart based on the member's profile!
