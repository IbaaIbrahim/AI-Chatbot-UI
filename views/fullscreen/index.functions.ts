import React from "react"
import { v4 as uuidv4 } from "uuid"

import { ChatMessage } from "."
import { _connectWithStreaming, _sendMessage } from "../../redux/actions"
import { getAPI } from "../../utilities/API"


/**
 * Handles the logic for sending a user message to the AI and streaming the response.
 * 
 * @param params - Object containing all necessary state setters and refs from the component.
 */
export const sendMessage = async ({
  input,
  setInput,
  isStreaming,
  setIsStreaming,
  setMessages,
  controllerRef,
  conversationIdRef,
  charBufferRef,
  setAnimatingMessageId,
  animatingMessageId,
  setDisplayedChars,
  setStreamingComplete,
  textFromInput,
  resetAnimationState
}: {
  input: string,
  setInput: React.Dispatch<React.SetStateAction<string>>,
  isStreaming: boolean,
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  controllerRef: React.MutableRefObject<AbortController | null>,
  conversationIdRef: React.MutableRefObject<string>,
  charBufferRef: React.MutableRefObject<string>,
  setAnimatingMessageId: React.Dispatch<React.SetStateAction<string | null>>,
  animatingMessageId: string | null,
  setDisplayedChars: React.Dispatch<React.SetStateAction<string>>,
  setStreamingComplete: React.Dispatch<React.SetStateAction<boolean>>,
  textFromInput?: string,
  resetAnimationState?: () => void
}) => {
  const prompt = (textFromInput ?? input).trim()
  if (!prompt || isStreaming) return

  // 1. Reset component-level animation refs if provided
  if (resetAnimationState) {
    resetAnimationState()
  }

  let latestBuffer = ""

  // 2. Prepare Messages
  const userMessage: ChatMessage = {
    id: uuidv4(),
    role: "user",
    content: prompt
  }

  const assistantMessageId = uuidv4()
  const assistantMessage: ChatMessage = {
    id: assistantMessageId,
    role: "assistant", // "assistant" role triggers the markdown rendering in UI
    content: "",       // Starts empty, will be filled by animation
    isStreaming: true  // Mark as streaming until done
  }

  // 3. Update UI instantly with user message and empty assistant bubble
  setMessages((prev) => [...prev, userMessage, assistantMessage])
  setInput("")
  setIsStreaming(true)

  // 4. Initialize animation state
  charBufferRef.current = "" // Direct synchronous reset
  setDisplayedChars("")
  setStreamingComplete(false)
  setAnimatingMessageId(assistantMessageId) // Triggers the animation loop in the component

  // 5. Setup AbortController for cancellation
  const controller = new AbortController()
  controllerRef.current = controller

  // Track job finished state (accessible in finally block)
  const jobFinishedRef: { current: boolean } = { current: false }

  try {
    const API = getAPI()
    const apiBase = API.defaults.baseURL || ""
    console.log("Starting stream to API:", `${apiBase}/chat/stream`)
    console.log("Sending prompt:", prompt)

    const createJobResponse = await _sendMessage(prompt, conversationIdRef.current)
    const createJobData = createJobResponse?.data
    console.log('----------------------', createJobResponse);
    const response = await _connectWithStreaming(createJobData.job_id, controller.signal)

    if (!response.ok || !response.body || typeof response.body.getReader !== "function") {
      throw new Error("Network error")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder("utf-8")
    const responseBody = response.body // Store for cancellation

    let buffer = ""
    let completeText = "" // Local source of truth for the accumulation
    let doneReading = false
    let lastEventId: number | null = null // Track Last-Event-ID for reconnection support
    let jobFinished = false // Flag to break out of reading loop when job completes/fails
    
    // Helper to close the connection
    const closeConnection = async () => {
      try {
        // Cancel the response body stream to close the connection
        if (responseBody && typeof responseBody.cancel === 'function') {
          await responseBody.cancel()
          console.log("✅ SSE connection cancelled")
        }
        // Release the reader lock
        if (reader) {
          reader.releaseLock()
          console.log("✅ SSE reader released")
        }
      } catch (err) {
        console.warn("Error closing SSE connection:", err)
        // Still try to release the reader lock
        try {
          if (reader) {
            reader.releaseLock()
          }
        } catch (releaseErr) {
          // Ignore release errors
        }
      }
    }
    
    // Track tool calls during streaming
    const toolCallsMap = new Map<string, { tool: string; call_id: string; status: string; data?: any }>()

    /**
     * Appends a delta chunk to the local buffer and updates the shared state.
     */
    const applyDelta = (deltaText: string) => {
      // Accumulate locally
      completeText += deltaText

      // Update state directly from local source
      // NOTE: We check aborted signal to prevent updating state after user cancelled
      if (!controller.signal.aborted) {
        charBufferRef.current = completeText // Direct synchronous update to ref
        latestBuffer = completeText // Keep track for finally block
      }
    }

    /**
     * Processes SSE events in the new format:
     * id: {seq}
     * event: {event_type}
     * data: {json}
     */
    const processSSEEvent = (eventId: string | null, eventType: string | null, dataStr: string) => {
      if (!dataStr || dataStr.trim() === "") return

      // Track Last-Event-ID
      if (eventId) {
        const seq = parseInt(eventId, 10)
        if (!isNaN(seq)) {
          lastEventId = seq
        }
      }

      let payload: any
      try {
        payload = JSON.parse(dataStr)
      } catch {
        console.warn("Failed to parse SSE data:", dataStr)
        return
      }

      console.log(`📨 SSE Event: id=${eventId}, event=${eventType}`, payload)

      // Handle different event types from backend
      if (eventType === "agent.delta") {
        // Backend format: payload = {"text": "..."}
        const deltaText = payload.text || ""
        if (deltaText) {
          applyDelta(deltaText)
        }
      } else if (eventType === "agent.message") {
        // Backend format: payload = {"role": "assistant", "content": "..."}
        // This is the complete message - use it if we don't have deltas
        const content = payload.content || ""
        if (content && !completeText) {
          // If we haven't received deltas, use the complete message
          completeText = content
          if (!controller.signal.aborted) {
            charBufferRef.current = completeText
            latestBuffer = completeText
          }
        }
      } else if (eventType === "tool.requested") {
        // Backend format: payload = {"name": "...", "arguments": {...}, "call_id": "..."}
        const toolName = payload.name || "tool"
        const callId = payload.call_id || uuidv4()
        const statusMsg = `Using ${toolName}...`

        // Track this tool call
        toolCallsMap.set(callId, {
          tool: toolName,
          call_id: callId,
          status: "executing",
          data: undefined
        })

        // Update message with status and pending tool call
        setMessages(prev => prev.map(m => {
          if (m.id === assistantMessageId) {
            const pendingToolCalls = Array.from(toolCallsMap.values())
              .filter(tc => !tc.data) // Only pending (not completed)
              .map(tc => ({
                tool: tc.tool,
                status: tc.status,
                data: tc.data
              }))
            
            return { 
              ...m, 
              status: statusMsg,
              pendingToolCalls: pendingToolCalls.length > 0 ? pendingToolCalls : undefined
            }
          }
          return m
        }))
      } else if (eventType === "tool.completed") {
        // Backend format: payload = {"call_id": "...", "result": {...}, "tool_name": "..."}
        const callId = payload.call_id
        const toolResult = payload.result || {}
        const toolName = payload.tool_name || null
        
        if (callId && toolCallsMap.has(callId)) {
          // Update existing tool call with result
          const toolCall = toolCallsMap.get(callId)!
          toolCall.status = "completed"
          toolCall.data = toolResult
          // Update tool name if provided
          if (toolName) {
            toolCall.tool = toolName
          }
          toolCallsMap.set(callId, toolCall)
        } else if (callId) {
          // Tool call not tracked (tool.requested was missed or async tool)
          // Use tool_name from payload, or infer from result structure
          let finalToolName = toolName || "unknown"
          if (!toolName && toolResult && typeof toolResult === 'object') {
            // Infer tool name from result structure as fallback
            if (toolResult.title || toolResult.items) {
              finalToolName = "generate_checklist"
            } else if (toolResult.translated_text) {
              finalToolName = "translate_text"
            }
          }
          
          toolCallsMap.set(callId, {
            tool: finalToolName,
            call_id: callId,
            status: "completed",
            data: toolResult
          })
        }

        // Update message: clear status, update pending/completed tool calls
        setMessages(prev => prev.map(m => {
          if (m.id === assistantMessageId) {
            const pendingToolCalls = Array.from(toolCallsMap.values())
              .filter(tc => !tc.data) // Only pending (not completed)
              .map(tc => ({
                tool: tc.tool,
                status: tc.status,
                data: tc.data
              }))
            
            const completedToolCalls = Array.from(toolCallsMap.values())
              .filter(tc => tc.data) // Only completed (has data)
              .map(tc => ({
                tool: tc.tool,
                status: tc.status,
                data: tc.data
              }))

            console.log("🔧 tool.completed event - updating message:", {
              callId,
              toolName,
              toolResult,
              completedToolCallsCount: completedToolCalls.length,
              completedToolCalls,
              toolCallsMapSize: toolCallsMap.size,
              toolCallsMapEntries: Array.from(toolCallsMap.entries()),
              currentAnimationComplete: m.animationComplete,
              animatingMessageId
            })

            // Don't set animationComplete here - it should only be set when animation actually finishes
            // The useEffect watching animatingMessageId will set it when animation completes
            return { 
              ...m, 
              status: pendingToolCalls.length > 0 ? `Using ${pendingToolCalls[0].tool}...` : undefined,
              pendingToolCalls: pendingToolCalls.length > 0 ? pendingToolCalls : undefined,
              toolCalls: completedToolCalls.length > 0 ? completedToolCalls : (m.toolCalls || undefined) // Preserve existing toolCalls if no new ones
              // animationComplete is only set by the useEffect when animatingMessageId becomes null
            }
          }
          return m
        }))
      } else if (eventType === "job.paused") {
        // Backend format: payload = {"reason": "..."}
        const reason = payload.reason || "Paused for tool execution"
        setMessages(prev => prev.map(m => {
          if (m.id === assistantMessageId) {
            return { ...m, status: reason }
          }
          return m
        }))
      } else if (eventType === "job.resumed") {
        // Backend format: payload = {"reason": "..."}
        const reason = payload.reason || "Resuming..."
        setMessages(prev => prev.map(m => {
          if (m.id === assistantMessageId) {
            // Clear status or show resuming message briefly
            return { ...m, status: undefined }
          }
          return m
        }))
      } else if (eventType === "job.completed") {
        console.log("✅ Job completed. Total content:", completeText)
        // Mark job as finished - will break out of reading loop
        jobFinished = true
        jobFinishedRef.current = true
        
        // Mark message as no longer streaming
        // Move all pending tool calls to completed tool calls
        // Set animationComplete if we have tool calls and message is not currently animating
        setMessages(prev => prev.map(m => {
          if (m.id === assistantMessageId) {
            const allToolCalls = Array.from(toolCallsMap.values())
              .filter(tc => tc.data) // Only completed tool calls
              .map(tc => ({
                tool: tc.tool,
                status: tc.status,
                data: tc.data
              }))
            
            console.log("✅ job.completed - updating message with toolCalls:", {
              allToolCallsCount: allToolCalls.length,
              allToolCalls,
              existingToolCalls: m.toolCalls,
              toolCallsMapSize: toolCallsMap.size,
              toolCallsMapEntries: Array.from(toolCallsMap.entries()),
              currentAnimationComplete: m.animationComplete,
              animatingMessageId
            })
            
            // Don't set animationComplete here - it should only be set when animation actually finishes
            // The useEffect watching animatingMessageId will set it when animation completes
            const finalToolCalls = allToolCalls.length > 0 ? allToolCalls : (m.toolCalls || undefined)
            
            return { 
              ...m, 
              isStreaming: false,
              status: undefined, // Clear any status
              toolCalls: finalToolCalls,
              pendingToolCalls: undefined // Clear pending
              // animationComplete is only set by the useEffect when animatingMessageId becomes null
            }
          }
          return m
        }))
        // Set streaming state to false to hide stop button
        setIsStreaming(false)
        setStreamingComplete(true)
      } else if (eventType === "job.failed") {
        console.error("❌ Job failed:", payload)
        // Mark job as finished - will break out of reading loop
        jobFinished = true
        jobFinishedRef.current = true
        
        const errorMsg = payload.error?.message || "Job failed"
        setMessages(prev => prev.map(m => {
          if (m.id === assistantMessageId) {
            return { ...m, content: completeText || errorMsg, isStreaming: false }
          }
          return m
        }))
        setIsStreaming(false)
        setStreamingComplete(true)
      } else if (eventType === "job.started") {
        console.log("🚀 Job started")
      } else {
        // Unknown event type - log for debugging
        console.log(`⚠️ Unknown event type: ${eventType}`, payload)
      }
    }

    /**
     * Parses SSE format and processes events.
     * SSE format:
     * id: {seq}
     * event: {event_type}
     * data: {json}
     * 
     * (empty line separates events)
     */
    const parseSSE = (text: string) => {
      const lines = text.split("\n")
      let currentEvent: {
        id: string | null
        event: string | null
        data: string[]
      } = {
        id: null,
        event: null,
        data: []
      }

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) {
          // Empty line = end of event, process it
          if (currentEvent.data.length > 0) {
            processSSEEvent(
              currentEvent.id,
              currentEvent.event,
              currentEvent.data.join("\n")
            )
          }
          // Reset for next event
          currentEvent = { id: null, event: null, data: [] }
          continue
        }

        // Parse SSE fields
        if (trimmed.startsWith("id:")) {
          currentEvent.id = trimmed.slice(3).trim()
        } else if (trimmed.startsWith("event:")) {
          currentEvent.event = trimmed.slice(6).trim()
        } else if (trimmed.startsWith("data:")) {
          currentEvent.data.push(trimmed.slice(5).trim())
        } else if (trimmed.startsWith(":")) {
          // Comment/control line (e.g., ": connected", ": ping")
          if (trimmed.includes("connected")) {
            console.log("✅ SSE connection established")
          } else if (trimmed.includes("ping")) {
            // Heartbeat - no action needed
          }
        }
      }

      // Process any remaining event in buffer
      if (currentEvent.data.length > 0) {
        processSSEEvent(
          currentEvent.id,
          currentEvent.event,
          currentEvent.data.join("\n")
        )
      }
    }

    // 6. Stream Reading Loop
    while (!doneReading && !jobFinished) {
      const { done, value } = await reader.read()
      doneReading = done

      const chunk = decoder.decode(value || new Uint8Array(), { stream: !done })
      buffer += chunk

      // Process complete SSE events (separated by double newlines)
      // But also handle single newlines for line-by-line processing
      let doubleNewlineIndex = buffer.indexOf("\n\n")
      while (doubleNewlineIndex !== -1 && !jobFinished) {
        const eventText = buffer.slice(0, doubleNewlineIndex)
        parseSSE(eventText)
        buffer = buffer.slice(doubleNewlineIndex + 2)
        doubleNewlineIndex = buffer.indexOf("\n\n")
      }

      // Also handle single newlines for partial events
      if (done && buffer.trim() && !jobFinished) {
        parseSSE(buffer)
        buffer = ""
      }
      
      // Break out of loop if job finished (job.completed or job.failed received)
      if (jobFinished) {
        console.log("🛑 Job finished, closing SSE connection")
        await closeConnection()
        break
      }
    }

    // If loop ended normally (doneReading), still close the connection
    if (!jobFinished) {
      await closeConnection()
    }
  } catch (err) {
    if (controller.signal.aborted) {
      console.log("Stream aborted by user")
    } else {
      console.error("Streaming error:", err)
    }
  } finally {
    // 7. Cleanup
    if (!controller.signal.aborted) {
      // Only update if not aborted to avoid overwriting state
      charBufferRef.current = latestBuffer
      setIsStreaming(false)
      setStreamingComplete(true) // Signals animation loop to finish up
      
      // Don't set animationComplete here - it should only be set when animation actually finishes
      // The useEffect watching animatingMessageId will set it when animation completes
    }
    if (controllerRef.current === controller) {
      controllerRef.current = null
    }
  }
}

/**
 * Stops the active stream explicitly.
 * Used when the user clicks the "Stop" button.
 */
export const stopStreaming = ({
  controllerRef,
  setIsStreaming,
  animatingMessageId,
  charBufferRef,
  setMessages,
  setAnimatingMessageId,
  setDisplayedChars,
  setStreamingComplete
}: {
  controllerRef: React.MutableRefObject<AbortController | null>,
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>,
  animatingMessageId: string | null,
  charBufferRef: React.MutableRefObject<string>,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setAnimatingMessageId: React.Dispatch<React.SetStateAction<string | null>>,
  setDisplayedChars: React.Dispatch<React.SetStateAction<string>>,
  setStreamingComplete: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  if (controllerRef.current) {
    controllerRef.current.abort()
    controllerRef.current = null
  }

  setIsStreaming(false)

  const finalContent = charBufferRef.current

  // Force-complete the animation: show all buffered content immediately
  if (animatingMessageId) {
    setMessages((msgs) => {
      return msgs.map((m) => {
        if (m.id === animatingMessageId) {
          return { ...m, content: finalContent }
        }
        return m
      })
    })
    setAnimatingMessageId(null)
    setDisplayedChars(finalContent)

    // Explicitly clear ref
    charBufferRef.current = ""
    setStreamingComplete(false)
  }
}
