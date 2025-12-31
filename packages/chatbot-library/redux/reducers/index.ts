import { UnknownAction } from 'redux'
import { ActionStore } from '../../assets/data/types/redux'
import { ChatbotStore } from '../../assets/data/types/vm'
import { cases } from './actions'

const initialState: ChatbotStore = new ChatbotStore()

// Type for action handlers
type ActionHandler = (state: ChatbotStore, action: ActionStore) => ChatbotStore

export const chatbotReducer = (state: ChatbotStore = initialState, action: UnknownAction): ChatbotStore => {
  // Type guard to check if action is ActionStore and has a valid type
  if ('type' in action && typeof action.type === 'string' && action.type in cases) {
    const handler = cases[action.type as keyof typeof cases] as ActionHandler | undefined
    if (handler && typeof handler === 'function') {
      // Convert through unknown first to avoid type mismatch
      return handler(state, action as unknown as ActionStore)
    }
  }
  return state
}
