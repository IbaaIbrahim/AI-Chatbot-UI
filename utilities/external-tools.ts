import _ from "lodash"
import { CHATBOT_STORE_ACTION_TYPES } from "../redux/reducers/actions"
import { getStore } from "../redux/store"

// Type for tool data - users should provide their own types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolData = any

// Tool handler function type
export type ToolHandler = (data: ToolData) => void

/**
 * Set the Redux store reference for tool actions (for backward compatibility)
 * Now uses internal store, but kept for API compatibility
 * @deprecated No longer needed - library uses internal Redux store
 */
export const setStore = (store?: { dispatch: (action: { type: string; payload?: any }) => void }) => {
  // No-op - library now uses internal store
  console.warn('setStore() is deprecated. The library now uses its own internal Redux store.')
}

/**
 * Open checklist preview modal
 * Uses the internal Redux store
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const openChecklistPreview = (data: any) => {
  console.log('Open checklist preview', data)
  
  const store = getStore()
  
  // Default implementation - users can override this
  if (data && typeof data === 'object') {
    // store.dispatch({ 
    //   type: CHATBOT_STORE_ACTION_TYPES.OPEN_PREVIEW_MODAL, 
    //   payload: data 
    // })
  }
}