import { ActionStore } from "../../../assets/data/types/redux"
import { ChatbotStore } from "../../../assets/data/types/vm"

// export const handleOpenAiModal = (state: ChatbotStore, action: ActionStore): ChatbotStore => {
//   const tempState = { ...state }
//   tempState.aiModalOpen = true
//   return tempState
// }

// export const handleCloseAiModal = (state: ChatbotStore, action: ActionStore): ChatbotStore => {
//   const tempState = { ...state }
//   tempState.aiModalOpen = false
//   return tempState
// }

export const ChatbotGeneralCases = {
  // OPEN_AI_MODAL: handleOpenAiModal,
  // CLOSE_AI_MODAL: handleCloseAiModal
}

export type ChatbotGeneralActionType = keyof typeof ChatbotGeneralCases
export const CHATBOT_GENERAL_ACTION_TYPES: { [K in ChatbotGeneralActionType]: K } = Object.fromEntries(
  Object.keys(ChatbotGeneralCases).map((key) => [key, key])
) as { [K in ChatbotGeneralActionType]: K }

export type ChatbotGeneralActionHandler = typeof ChatbotGeneralCases[ChatbotGeneralActionType]