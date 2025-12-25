import { getAPI } from "../../utilities/API"

const buildChatStreamUrl = (job_id: string) => {
  const API = getAPI()
  const base = API.defaults.baseURL ?? ""
  const normalizedBase = base.replace(/\/$/, "")
  return `${normalizedBase || ""}/v1/jobs/${job_id}/events`
}

const buildHeaders = (): Record<string, string> => {
  const API = getAPI()
  const defaults = API.defaults.headers || {}
  const common = defaults.common || {}
  const post = defaults.post || {}

  // Flatten headers that axios keeps under method-specific keys
  // Filter out undefined values and convert to strings
  const flattened: Record<string, string> = {}
  
  Object.entries(common).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      flattened[key] = String(value)
    }
  })
  
  Object.entries(post).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      flattened[key] = String(value)
    }
  })

  // Pull over any custom top-level headers (ignoring axios's method buckets)
  const methodBuckets = new Set(['common', 'delete', 'get', 'head', 'post', 'put', 'patch'])
  Object.entries(defaults).forEach(([key, value]) => {
    if (!methodBuckets.has(key) && typeof value === "string") {
      flattened[key] = value
    }
  })

  // Ensure we control the content type for JSON payloads
  delete flattened['Content-Type']

  return {
    ...flattened,
    Accept: "text/event-stream",
    "Content-Type": "application/json"
  }
}

export const _connectWithStreaming = async (job_id: string, signal: AbortSignal, lastEventId?: number | null) => {
  const headers = buildHeaders()
  
  // Add Last-Event-ID header for reconnection support
  if (lastEventId !== undefined && lastEventId !== null) {
    headers["Last-Event-ID"] = lastEventId.toString()
  }

  const response = await fetch(buildChatStreamUrl(job_id), {
    method: "GET",
    headers,
    signal
  })

  if (!response.ok) {
    throw new Error(`Chat stream failed with status ${response.status}`)
  }

  if (!response.body) {
    throw new Error("Readable stream not supported in this environment")
  }

  return response
}

export const _sendMessage = async (message: string, conversation_id: string) => {
  const API = getAPI()
  const response: { job_id: string } = await API.post(`/v1/jobs`, {
    user_message: message,
    conversation_id
  },
    {
      headers: {
        "Idempotency-Key": crypto.randomUUID()
      }
    })
  return response
}
