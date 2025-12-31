import React from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { getStore } from './store'

interface ChatbotProviderProps {
  children: React.ReactNode
}

/**
 * ChatbotProvider wraps the chatbot components with its own Redux store
 * This makes the library self-contained and doesn't require the parent app to set up Redux
 */
export const ChatbotProvider: React.FC<ChatbotProviderProps> = ({ children }) => {
  const store = getStore()
  
  return (
    <ReduxProvider store={store}>
      {children}
    </ReduxProvider>
  )
}

