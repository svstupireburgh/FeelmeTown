# AI Assistant Integration - OpenRouter with DeepSeek Model

## Overview
The FeelMe Town website now features an intelligent AI assistant integrated into the floating navigation. The assistant uses the DeepSeek model (`deepseek/deepseek-chat`) via OpenRouter to provide human-like conversational responses about theater services, bookings, and general inquiries.

## Features

### 🤖 Human-like AI Assistant
- **Model**: DeepSeek Chat via OpenRouter (`deepseek/deepseek-chat`)
- **Provider**: OpenRouter (access to multiple AI models)
- **Behavior**: Conversational, friendly, and professional
- **Context**: Specialized for FeelMe Town theater services
- **Responses**: Natural language with emojis and engaging tone

### 💬 Real-time Chat Interface
- **Typing Indicators**: Shows when AI is processing
- **Loading States**: Disabled inputs during AI response
- **Error Handling**: Graceful fallbacks if API fails
- **Conversation History**: Maintains context across messages

### 🎯 Theater-Specific Knowledge
The AI assistant is trained to help with:
- Movie showtimes and bookings
- Theater facilities and amenities
- Pricing and special offers
- Contact information and support
- General theater-related questions

## Setup Instructions

### 1. Environment Configuration
Create a `.env.local` file in your project root:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 2. Get OpenRouter API Key
1. Visit [OpenRouter Platform](https://openrouter.ai/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env.local` file

**Benefits of OpenRouter:**
- Access to multiple AI models including DeepSeek
- Competitive pricing
- Easy model switching
- Unified API interface

### 3. Test the Integration
Run the test script to verify everything works:

```bash
node test-ai-api.js
```

## API Endpoint

### POST `/api/ai-chat`

**Request Body:**
```json
{
  "message": "Hello! Can you tell me about FeelMe Town?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous user message"
    },
    {
      "role": "assistant", 
      "content": "Previous AI response"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Hello! I'd be happy to tell you about FeelMe Town! 😊 We're a premium theater and entertainment venue offering...",
  "model": "deepseek/deepseek-chat",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

## Usage

### For Users
1. Click the floating navigation button (bottom right)
2. Select "AI Help" option
3. Start chatting with the AI assistant
4. Ask questions about FeelMe Town services, bookings, or general inquiries

### For Developers
The AI assistant is integrated into the `FloatingNavigation` component:

```typescript
// Key functions:
- handleChatSend(): Sends user message to AI API
- Loading states: Shows typing indicator during AI response
- Error handling: Graceful fallbacks for API failures
```

## Technical Details

### Model Configuration
- **Model**: `deepseek/deepseek-chat` (via OpenRouter)
- **Provider**: OpenRouter API
- **Temperature**: 0.7 (balanced creativity and consistency)
- **Max Tokens**: 1000 (reasonable response length)
- **System Prompt**: Specialized for FeelMe Town context

### Error Handling
- **API Failures**: Fallback responses with contact information
- **Network Issues**: User-friendly error messages
- **Rate Limiting**: Graceful degradation

### Performance
- **Response Time**: Typically 1-3 seconds
- **Context Window**: Last 10 messages for conversation history
- **Caching**: No caching implemented (real-time responses)

## Customization

### System Prompt
The AI's behavior can be customized by modifying the system prompt in `/api/ai-chat/route.ts`:

```typescript
const systemPrompt = `You are a helpful AI assistant for FeelMe Town...`;
```

### Response Formatting
Modify the response handling in `FloatingNavigation.tsx` to change how messages are displayed.

### Fallback Messages
Update fallback responses in both the API endpoint and frontend component.

## Troubleshooting

### Common Issues

1. **"AI service configuration error"**
   - Check if `OPENROUTER_API_KEY` is set in `.env.local`
   - Verify the API key is valid and active

2. **"Service temporarily unavailable"**
   - Check OpenRouter API status
   - Verify network connectivity
   - Check API key permissions

3. **Slow responses**
   - Normal for AI models (1-3 seconds)
   - Check network latency
   - Consider implementing response caching

### Debug Mode
Enable console logging by checking browser developer tools for detailed error messages.

## Future Enhancements

### Planned Features
- [ ] Voice input/output capabilities
- [ ] Multi-language support
- [ ] Integration with booking system
- [ ] Analytics and conversation tracking
- [ ] Custom AI personalities
- [ ] File upload support for images/documents

### Performance Optimizations
- [ ] Response caching
- [ ] Streaming responses
- [ ] Offline fallback mode
- [ ] Progressive loading

## Support

For technical support or questions about the AI integration:
- Check the console for error messages
- Verify API key configuration
- Test with the provided test script
- Review the API documentation

---

**Note**: This integration provides a human-like conversational experience while maintaining the professional standards expected from FeelMe Town's customer service.
