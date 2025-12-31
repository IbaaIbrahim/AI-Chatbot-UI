import { CHATBOT_GENERAL_ACTION_TYPES, ChatbotGeneralActionType, ChatbotGeneralCases } from "./general"

export const cases = {
  ...ChatbotGeneralCases,
}

export const CHATBOT_STORE_ACTION_TYPES = {
  ...CHATBOT_GENERAL_ACTION_TYPES,
}

export type ActionType = ChatbotGeneralActionType
