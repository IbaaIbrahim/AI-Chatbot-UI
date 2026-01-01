// Main entry point for the Chatbot Library

// Components
export { FullScreenChat } from './views/fullscreen'
export { default as ChatbotToolsWrapper } from './views/tools'
export { ConversationHistory } from './views/ConversationHistory'
export type { Conversation } from './views/ConversationHistory'

// Redux Provider (wraps components with internal store)
export { ChatbotProvider } from './redux/Provider'

// Redux Hooks (for accessing internal store)
export {
  useChatbotDispatch,
  useChatbotSelector,
  useChatbotState
} from './redux/hooks'

// Redux Store (for advanced usage)
export { getStore, resetStore } from './redux/store'

// Redux (for backward compatibility or advanced usage)
export { chatbotReducer } from './redux/reducers'
export { CHATBOT_STORE_ACTION_TYPES } from './redux/reducers/actions'
export { _sendMessage, _connectWithStreaming } from './redux/actions'

// Types
export type { ChatbotStore } from './assets/data/types/vm'
export type { ActionStore } from './assets/data/types/redux'
export type { ChatMessage, ToolCall } from './views/fullscreen'

// Utilities
export { API, initializeAPI, type ChatbotAPIConfig } from './utilities/API'
export { setStore, openChecklistPreview, type ToolHandler, type ToolData } from './utilities/external-tools'

// Styles - users should import this in their application
// import '@flowdit/chatbot-library/dist/styles.css'

