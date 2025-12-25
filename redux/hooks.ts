import { useSelector, useDispatch, TypedUseSelectorHook } from 'react-redux'
import { ChatbotStore } from '../assets/data/types/vm'
import { ActionStore } from '../assets/data/types/redux'
import { CHATBOT_STORE_ACTION_TYPES } from './reducers/actions'

// Type the hooks to use our internal store
export const useChatbotDispatch = () => useDispatch()
export const useChatbotSelector: TypedUseSelectorHook<ChatbotStore> = useSelector

// Convenience hooks for common state access
export const useChatbotState = () => {
  return useChatbotSelector((state) => state)
}

// export const useChatbotModal = () => {
//   const isOpen = useChatbotSelector((state) => state.aiModalOpen)
//   const dispatch = useChatbotDispatch()
  
//   return {
//     isOpen,
//     open: () => dispatch({ type: CHATBOT_STORE_ACTION_TYPES.OPEN_AI_MODAL } as ActionStore),
//     close: () => dispatch({ type: CHATBOT_STORE_ACTION_TYPES.CLOSE_AI_MODAL } as ActionStore),
//   }
// }

// export const useChatbotChecklist = () => {
//   const checklist = useChatbotSelector((state) => state.checklist)
//   const dispatch = useChatbotDispatch()
  
//   return {
//     ...checklist,
//     openPreview: (data: any) => dispatch({ type: CHATBOT_STORE_ACTION_TYPES.OPEN_PREVIEW_MODAL, payload: data } as ActionStore),
//     closePreview: () => dispatch({ type: CHATBOT_STORE_ACTION_TYPES.CLOSE_PREVIEW_MODAL } as ActionStore),
//   }
// }

