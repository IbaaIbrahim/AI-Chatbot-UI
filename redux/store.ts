import { createStore, Store, UnknownAction } from 'redux'
import { chatbotReducer } from './reducers'
import { ChatbotStore } from '../assets/data/types/vm'

// Create the internal Redux store
let store: Store<ChatbotStore, UnknownAction> | null = null

/**
 * Get or create the internal Redux store
 */
export const getStore = (): Store<ChatbotStore, UnknownAction> => {
  if (!store) {
    store = createStore(chatbotReducer) as Store<ChatbotStore, UnknownAction>
  }
  return store
}

/**
 * Reset the store (useful for testing)
 */
export const resetStore = () => {
  store = null
}

