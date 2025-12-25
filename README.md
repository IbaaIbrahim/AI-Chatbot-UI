# @flowdit/chatbot-library

A React chatbot library with streaming support, tool integration, and modern UI. Built with TypeScript, Redux, and React.

## Features

- 🚀 **Streaming Support**: Real-time streaming responses with character-by-character animation
- 🎨 **Modern UI**: ChatGPT-like interface with dark theme
- 🔧 **Tool Integration**: Support for custom tool handlers (checklists, translations, etc.)
- 📦 **TypeScript**: Fully typed for better developer experience
- 🔄 **Self-Contained Redux**: Uses its own internal Redux store - no setup required!
- 🎯 **Flexible**: Easy to customize and extend

## Installation

```bash
npm install @flowdit/chatbot-library
# or
yarn add @flowdit/chatbot-library
```

## Peer Dependencies

This library requires the following peer dependencies:

```bash
npm install react react-dom react-redux redux reactstrap react-markdown axios lodash
```

## Quick Start

### 1. Import Styles

First, import the CSS styles in your application:

```tsx
import '@flowdit/chatbot-library/dist/styles.css'
```

### 2. Initialize API

Configure the API connection before using the chatbot:

```tsx
import { initializeAPI } from '@flowdit/chatbot-library'

// Initialize API
initializeAPI({
  baseURL: 'https://your-api-url.com',
  token: 'your-auth-token', // Optional
  timeout: 300000 // 5 minutes
})
```

### 3. Use the Chatbot Component

The library uses its own internal Redux store, so no setup is needed! Just use the component:

```tsx
import React from 'react'
import { FullScreenChat } from '@flowdit/chatbot-library'

function App() {
  return (
    <div>
      <FullScreenChat />
    </div>
  )
}
```

## Components

### FullScreenChat

The main chat interface component (used inside ChatModal).

```tsx
import { FullScreenChat } from '@flowdit/chatbot-library'

<FullScreenChat />
```

## Configuration

### API Configuration

```tsx
import { initializeAPI } from '@flowdit/chatbot-library'

initializeAPI({
  baseURL: 'https://api.example.com',
  token: 'your-token',
  timeout: 300000,
  headers: {
    'Custom-Header': 'value'
  },
  withCredentials: false
})
```

### Environment Variables

You can also use environment variables:

- `REACT_APP_CHAT_AI_ASSISTANT_API_URL` - API base URL
- `REACT_APP_CHAT_AI_TOKEN` - Authentication token
- `NEXT_PUBLIC_CHAT_AI_ASSISTANT_API_URL` - For Next.js applications

## Using the Internal Redux Store

The library uses its own internal Redux store, so you don't need to set up Redux in your app. However, you can still access and control the chatbot state using the provided hooks:

### Using Hooks (Recommended)

```tsx
import { useChatbotModal, useChatbotChecklist } from '@flowdit/chatbot-library'

function MyComponent() {
  const { isOpen, open, close } = useChatbotModal()
  const { isPreviewModalOpen, data } = useChatbotChecklist()

  return (
    <div>
      <button onClick={open}>Open Chat</button>
      <button onClick={close}>Close Chat</button>
      {isOpen && <p>Chat is open!</p>}
    </div>
  )
}
```

### Direct Store Access (Advanced)

If you need direct access to the store:

```tsx
import { getStore, CHATBOT_STORE_ACTION_TYPES } from '@flowdit/chatbot-library'

const store = getStore()

// Dispatch actions
store.dispatch({ type: CHATBOT_STORE_ACTION_TYPES.OPEN_AI_MODAL })
```

### Available Hooks

- `useChatbotModal()` - Control the chat modal (open/close)
- `useChatbotState()` - Get the entire chatbot state
- `useChatbotSelector()` - Custom selector hook
- `useChatbotDispatch()` - Dispatch hook

## Types

The library exports TypeScript types for better type safety:

```tsx
import type { 
  ChatbotStore, 
  ChatMessage, 
  ToolCall,
  ChatbotAPIConfig 
} from '@flowdit/chatbot-library'
```

## Custom Tool Handlers

You can customize tool handlers by modifying the `TOOL_HANDLERS` object in the `FullScreenChat` component or by providing your own implementation.

Example tool handler:

```tsx
const TOOL_HANDLERS = {
  generate_checklist: (data) => {
    // Your custom logic
    console.log('Generate checklist:', data)
  },
  translate_text: (data) => {
    // Your custom logic
    console.log('Translate text:', data)
  }
}
```

## Building

To build the library:

```bash
npm run build
```

This will:
- Compile TypeScript to CommonJS and ES modules
- Compile SCSS to CSS
- Generate type definitions

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

