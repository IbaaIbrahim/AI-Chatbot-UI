import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

// Configuration interface for API setup
export interface ChatbotAPIConfig {
  baseURL?: string
  token?: string
  timeout?: number
  headers?: Record<string, string>
  withCredentials?: boolean
  embedMode?: 'with_history' | 'without_history'  // Feature 1: Embedding mode
}

// Helper function to get environment variables (works with Vite, React, Next.js)
const getEnvVar = (key: string): string => {
  // Vite uses import.meta.env
  try {
    // @ts-ignore - import.meta may not be available in all environments
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key] || ''
    }
  } catch (e) {
    // import.meta not available, fall through to process.env
  }
  // Node.js/React uses process.env (wrap in try-catch for browser safety)
  try {
    // @ts-ignore - process may not be available in browser
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env[key] || ''
    }
  } catch (e) {
    // process not available in browser, ignore
  }
  return ''
}

// Default API instance - can be configured by the consuming application
let API: AxiosInstance | undefined

/**
 * Initialize the API instance with configuration
 * This should be called before using the chatbot components
 */
export const initializeAPI = (config: ChatbotAPIConfig = {}) => {
  const baseURL = config.baseURL ||
    getEnvVar('VITE_CHAT_AI_ASSISTANT_API_URL') ||
    getEnvVar('REACT_APP_CHAT_AI_ASSISTANT_API_URL') ||
    getEnvVar('NEXT_PUBLIC_CHAT_AI_ASSISTANT_API_URL') ||
    ""

  const token = config.token ||
    getEnvVar('VITE_CHAT_AI_TOKEN') ||
    getEnvVar('REACT_APP_CHAT_AI_TOKEN') ||
    ""

  const baseConfig: AxiosRequestConfig = {
    baseURL,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...config.headers
    },
    withCredentials: config.withCredentials ?? false,
    timeout: config.timeout ?? 5 * 60 * 1000
  }

  API = axios.create(baseConfig)
  return API
}

// Initialize with defaults if not already initialized
if (!API) {
  API = initializeAPI()
}

// Helper function to get API instance (ensures it's defined)
export const getAPI = (): AxiosInstance => {
  if (!API) {
    API = initializeAPI()
  }
  return API
}

export { API }
