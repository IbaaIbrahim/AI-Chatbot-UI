import React, { useState, useRef, useEffect } from "react"
// Styles should be imported separately: import '@flowdit/chatbot-library/dist/styles.css'
import { sendMessage, stopStreaming } from "./index.functions"
import ReactMarkdown from "react-markdown"
import { openChecklistPreview } from "../../utilities/external-tools"
import { v4 as uuidv4 } from "uuid";

// External types - users should provide their own types for tool handlers
// import { TemplateHistoryItemStore, TemplateVM } from "@csrc/modules/checklist/assets/data/types"

type Role = "user" | "assistant";

type ToolCall = {
  tool: string;
  status: string;
  data?: any;
}

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  status?: string; // Current agent status (e.g. "Thinking...", "Generating...")
  toolCalls?: ToolCall[]; // Completed tool calls with results (visible to user)
  pendingToolCalls?: ToolCall[]; // Tool calls received but not yet displayed (during streaming)
  isStreaming?: boolean; // Whether this message is currently being streamed
  animationComplete?: boolean; // Whether character-by-character animation has finished
}

// Tool handlers should be provided by the consuming application
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOOL_HANDLERS: Record<string, (data: any) => void> = {
  generate_checklist: (data) => {
    console.log("Routing to Checklist Module:", data)
    openChecklistPreview(data)
  },
  preview_generated_checklist: (data) => {
    console.log("Preview Checklist Module:", data)
  },
  translate_text: (data) => {
    console.log("Routing to Translation Module:", data)
  }
}

export type { ChatMessage, ToolCall }


const MAX_TEXTAREA_LINES = 5
const LINE_HEIGHT_PX = 24 // Updated for new font size

export const FullScreenChat: React.FC = () => {
  // =========================================
  // State Definitions
  // =========================================

  // Stores the list of chat messages (user and assistant)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Current value of the input textarea
  const [input, setInput] = useState("")

  // Flag indicating if a response is currently being streamed from the API
  const [isStreaming, setIsStreaming] = useState(false)

  // -- Animation States --
  // Holds the complete raw text received from the API so far


  // The text currently visible to the user (animated char-by-char)
  const [displayedChars, setDisplayedChars] = useState<string>("")

  // ID of the message currently being animated; null if none
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null)

  // Flag indicating if the network stream has fully finished
  const [streamingComplete, setStreamingComplete] = useState(false)

  // -- Scroll States --
  // Tracks if the user has manually scrolled up to pause auto-scrolling
  const [userScrolledUp, setUserScrolledUp] = useState(false)

  // -- UI States --
  // Tracks which dropdown menu is currently open (Tools, Mode, or Model)
  const [activeDropdown, setActiveDropdown] = useState<'tools' | 'mode' | 'model' | null>(null)

  // =========================================
  // Refs
  // =========================================

  // AbortController to cancel active network requests
  const controllerRef = useRef<AbortController | null>(null)

  // ID of the current requestAnimationFrame loop
  const animationFrameRef = useRef<number | null>(null)

  // Timestamp of the last character added for animation timing control
  const lastCharTimeRef = useRef<number>(0)

  // Unique ID for the current conversation session
  const conversationIdRef = useRef<string>(uuidv4())

  // Reference to the textarea element for auto-resizing
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Tracks the previous animation ID to detect message switches
  const prevAnimatingIdRef = useRef<string | null>(null)

  // Reference to the dummy div at the bottom of the chat for scrolling
  const scrollEndRef = useRef<HTMLDivElement | null>(null)

  // Reference to the main chat scroll container
  const chatContainerRef = useRef<HTMLDivElement | null>(null)

  // -- Stable Refs for Animation Loop --
  // These refs allow the animation loop to access fresh state without triggering re-renders
  const displayedContentRef = useRef("")
  const charBufferRef = useRef("")
  const streamingCompleteRef = useRef(false)

  // =========================================
  // Effects
  // =========================================

  /**
   * Effect: Handle clicks outside of dropdowns to close them.
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If click is inside a dropdown trigger or menu, ignore it
      if ((event.target as HTMLElement).closest('.dropdown-trigger') || (event.target as HTMLElement).closest('.custom-dropdown-menu')) return
      setActiveDropdown(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /**
   * Effect: Auto-scroll when new content (displayedChars) or messages update.
   */
  const scrollToBottom = () => {
    if (!userScrolledUp) {
      scrollEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, displayedChars])


  useEffect(() => {
    streamingCompleteRef.current = streamingComplete
  }, [streamingComplete])

  // CLEANUP: Reset animation refs when no message is animating (e.g. Stop clicked or Finished)
  useEffect(() => {
    if (!animatingMessageId) {
      displayedContentRef.current = ""
      charBufferRef.current = ""
      streamingCompleteRef.current = false
    }
  }, [animatingMessageId])

  /**
   * Effect: Main Character-by-Character Animation Loop.
   * Logic:
   * 1. Detaches from React render cycle using refs to prevent race conditions.
   * 2. Adds characters from `charBufferRef` to `displayedContentRef` at a fixed speed.
   * 3. Syncs the visual state `setDisplayedChars` and message content.
   * 4. Stops when all characters are displayed AND the stream is marked complete.
   */
  useEffect(() => {
    if (!animatingMessageId) return

    // -- Setup for a NEW message --
    if (prevAnimatingIdRef.current !== animatingMessageId) {
      lastCharTimeRef.current = 0

      setDisplayedChars("")
      displayedContentRef.current = ""
      setStreamingComplete(false)
      charBufferRef.current = ""
      streamingCompleteRef.current = false
      prevAnimatingIdRef.current = animatingMessageId
    }

    const CHARS_PER_FRAME = 2 // Number of characters to type per frame
    const FRAME_DELAY = 15    // Milliseconds between frames (controls typing speed)

    const animate = (currentTime: number) => {
      // NOTE: Always read from refs to get latest data inside the loop
      const targetBuffer = charBufferRef.current
      const isComplete = streamingCompleteRef.current

      // Fail-safe: Detect if target buffer shrank (e.g. new stream started), force reset
      if (targetBuffer.length < displayedContentRef.current.length) {
        displayedContentRef.current = ""
        lastCharTimeRef.current = 0
      }

      if (!lastCharTimeRef.current) lastCharTimeRef.current = currentTime

      const elapsed = currentTime - lastCharTimeRef.current

      // Frame execution logic
      if (elapsed >= FRAME_DELAY) {
        const currentLength = displayedContentRef.current.length
        const targetLength = targetBuffer.length

        // If we have more characters to type...
        if (currentLength < targetLength) {
          const newLength = Math.min(currentLength + CHARS_PER_FRAME, targetLength)
          const newContent = targetBuffer.slice(0, newLength)

          displayedContentRef.current = newContent

          // Sync UI state
          setDisplayedChars(newContent)
          setMessages((msgs) => msgs.map((m) => {
            if (m.id === animatingMessageId) {
              return { ...m, content: newContent }
            }
            return m
          }))

          lastCharTimeRef.current = currentTime
        }
      }

      // -- Completion Check --
      const currentDisplayedLen = displayedContentRef.current.length
      const currentTargetLen = targetBuffer.length

      if (currentDisplayedLen < currentTargetLen) {
        // Case 1: Still catching up to the buffer -> Continue animation
        animationFrameRef.current = requestAnimationFrame(animate)
      } else if (isComplete) {
        // Case 2: Caught up AND stream is finished -> Cleanup and Stop
        animationFrameRef.current = null
        lastCharTimeRef.current = 0
        // Don't reset prevAnimatingIdRef here - let the completion handler use it

        // Clear all animation states
        setAnimatingMessageId(null)

        setDisplayedChars("")
        displayedContentRef.current = ""
        setStreamingComplete(false)

        // Refocus text area for next input
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 0)
      } else {
        // Case 3: Caught up but stream is NOT finished -> Wait for more data (Keep loop alive)
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    // Start the loop
    animationFrameRef.current = requestAnimationFrame(animate)

    // Cleanup on unmount or ID change
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animatingMessageId])

  // =========================================
  // Animation Completion Handler
  // =========================================

  /**
   * When animation completes (animatingMessageId becomes null),
   * move any pendingToolCalls to toolCalls and set isStreaming to false
   */
  useEffect(() => {
    console.log("Animation completion check:", {
      animatingMessageId,
      prevAnimatingId: prevAnimatingIdRef.current
    })

    // Only run when animation stops (becomes null from a non-null value)
    if (animatingMessageId === null && prevAnimatingIdRef.current !== null) {
      const completedMessageId = prevAnimatingIdRef.current

      console.log("Animation completed for message:", completedMessageId)

      setMessages(prev => prev.map(m => {
        if (m.id === completedMessageId) {
          // When animation completes, mark animation as complete and ensure tool calls are properly set
          // If there are pending tool calls, move them to toolCalls only if they're completed
          // (toolCalls should already be set from tool.completed events, but this is a fallback)
          if (m.pendingToolCalls && m.pendingToolCalls.length > 0) {
          console.log("Moving pending tool calls to visible for message:", m.id, m.pendingToolCalls)
            // Only move if they have data (completed)
            const completedPending = m.pendingToolCalls.filter(tc => tc.data)
          return {
            ...m,
            isStreaming: false,
              animationComplete: true, // Mark animation as complete
              toolCalls: completedPending.length > 0 ? completedPending : m.toolCalls,
            pendingToolCalls: undefined
            }
          } else {
            // Mark animation as complete - buttons will show if toolCalls exist
            return {
              ...m,
              isStreaming: false,
              animationComplete: true // Mark animation as complete
            }
          }
        }
        return m
      }))

      // Reset for next animation
      prevAnimatingIdRef.current = null
    }
  }, [animatingMessageId])

  // =========================================
  // Helper Functions
  // =========================================

  /**
   * Scroll Handling Logic
   * Detects if the user is scrolling up to disable auto-scroll.
   */
  const handleScroll = () => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    // If user is within 50px of the bottom, we consider them "at the bottom"
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

    if (isAtBottom) {
      setUserScrolledUp(false)
    } else {
      setUserScrolledUp(true)
    }
  }

  /**
   * Manually scrolls the chat to the absolute bottom.
   */
  const handleScrollToBottom = () => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" })
    setUserScrolledUp(false)
  }

  /**
   * Auto-resizes the textarea based on content height.
   * Capped at MAX_TEXTAREA_LINES to prevent it from growing too large.
   */
  const adjustTextareaHeight = () => {
    const el = textareaRef.current
    if (!el) return

    const maxHeight = LINE_HEIGHT_PX * MAX_TEXTAREA_LINES
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, maxHeight)
    const finalHeight = Math.max(newHeight, LINE_HEIGHT_PX)
    el.style.height = `${finalHeight}px`
  }

  // Trigger resize whenever input changes
  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

  /**
   * Handles the action of sending a message.
   * 1. Validates that input is not empty and no stream is active.
   * 2. Resets the user scroll state so the chat follows the new stream.
   * 3. Calls the core `sendMessage` logic.
   * 
   * @param text - Optional text to send. If not provided, uses `input` state.
   */
  const handleSend = (text?: string) => {
    const textToSend = text || input
    if (!textToSend.trim() || isStreaming) return

    // Reset scroll state and follow stream immediately
    setUserScrolledUp(false)
    setTimeout(() => {
      scrollEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 0)

    // FORCE CLEAR REFS to prevent ghost text from previous sessions
    charBufferRef.current = ""
    displayedContentRef.current = ""

    sendMessage({
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
      textFromInput: textToSend,
      resetAnimationState: () => {
        // Callback to clear the detached ref state from outside
        displayedContentRef.current = ""
      }
    })
  }

  /**
   * Stops the current stream immediately.
   * Aborts the network request and finalizes the message state.
   */
  const handleStop = () => {
    stopStreaming({
      controllerRef,
      setIsStreaming,
      animatingMessageId,
      charBufferRef,
      setMessages,
      setAnimatingMessageId,
      setDisplayedChars,
      setStreamingComplete
    })
  }

  return (
    <div className="chat-gpt-interface">
      <div
        className="chat-scroll-area"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="empty-state-container">
            <div className="empty-state-content">
              <div className="logo-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h2>How can I help you today?</h2>
              <div className="capabilities-grid">
                <div className="capability-card">Generate a checklist for a project</div>
                <div className="capability-card">Analyze this data set</div>
                <div className="capability-card">Translate text to Spanish</div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === "user"
            return (
              <div key={m.id} className={`message-row ${m.role}`}>
                <div className="message-content-container">
                  <div className={`avatar ${isUser ? 'user-avatar' : 'assistant-avatar'}`}>
                    {isUser ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                        <circle cx="12" cy="5" r="2"></circle>
                        <path d="M12 7v4"></path>
                        <line x1="8" y1="16" x2="8" y2="16"></line>
                        <line x1="16" y1="16" x2="16" y2="16"></line>
                      </svg>
                    )}
                  </div>
                  <div className="text-content">
                    {isUser ? (
                      <p style={{ whiteSpace: 'pre-wrap' }}>{m.content}</p>
                    ) : (
                      <>
                        {/* Typing Indicator - Show when waiting for response */}
                        {!m.content && !m.status && (
                          <div className="typing-indicator" style={{
                            display: 'flex',
                            gap: '4px',
                            padding: '8px 0'
                          }}>
                            <span className="dot" style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#94a3b8',
                              borderRadius: '50%',
                              animation: 'typingDot 1.4s infinite ease-in-out',
                              animationDelay: '0s'
                            }}></span>
                            <span className="dot" style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#94a3b8',
                              borderRadius: '50%',
                              animation: 'typingDot 1.4s infinite ease-in-out',
                              animationDelay: '0.2s'
                            }}></span>
                            <span className="dot" style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#94a3b8',
                              borderRadius: '50%',
                              animation: 'typingDot 1.4s infinite ease-in-out',
                              animationDelay: '0.4s'
                            }}></span>
                            <style>{`
                              @keyframes typingDot {
                                0%, 60%, 100% {
                                  transform: translateY(0);
                                  opacity: 0.7;
                                }
                                30% {
                                  transform: translateY(-10px);
                                  opacity: 1;
                                }
                              }
                            `}</style>
                          </div>
                        )}
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                        {/* Tool Result Buttons - Only show after character-by-character animation completes */}
                        {m.role === 'assistant' && (() => {
                          console.log(`🔍 Button visibility for message ${m.id}:`, {
                            hasToolCalls: !!m.toolCalls,
                            toolCallsLength: m.toolCalls?.length || 0,
                            toolCalls: m.toolCalls,
                            animationComplete: m.animationComplete,
                            shouldShow: !!(m.toolCalls && m.toolCalls.length > 0 && m.animationComplete)
                          })
                          return null
                        })()}
                        {m.toolCalls && m.toolCalls.length > 0 && m.animationComplete && (
                          <div className="tool-actions" style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {m.toolCalls.map((tool, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  const handler = TOOL_HANDLERS[tool.tool]
                                  if (handler && tool.data) handler(tool.data)
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '8px',
                                  color: 'white',
                                  fontSize: '0.85rem',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
                                  transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                View {tool.tool === 'generate_checklist' ? 'Checklist' : 'Result'}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Agent Living Status */}
                        {m.status && (
                          <div className="agent-status-indicator" style={{
                            marginTop: '8px',
                            fontSize: '0.8rem',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontStyle: 'italic'
                          }}>
                            <span className="pulsing-dot" style={{
                              width: '6px',
                              height: '6px',
                              backgroundColor: '#6366f1',
                              borderRadius: '50%',
                              display: 'inline-block',
                              animation: 'pulse 1.5s infinite'
                            }}></span>
                            {m.status}
                            <style>{`
                              @keyframes pulse {
                                0% { transform: scale(0.95); opacity: 0.7; }
                                50% { transform: scale(1.15); opacity: 1; }
                                100% { transform: scale(0.95); opacity: 0.7; }
                              }
                            `}</style>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* Scroll to Bottom Button */}


      <div className="input-area-container">
        {/* Scroll to Bottom Button */}
        {userScrolledUp && messages.length > 0 && (
          <button className="scroll-bottom-btn" onClick={handleScrollToBottom}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
          </button>
        )}

        {/* New Chat Button (Floating or Header) - Visible only when conversation has started */}
        {messages.length > 0 && (
          <div className="new-chat-floater">
            <button className="new-chat-btn" onClick={() => {
              setMessages([])
              charBufferRef.current = ""
              setDisplayedChars("")
              setStreamingComplete(false)
              setAnimatingMessageId(null)
              setUserScrolledUp(false)
              conversationIdRef.current = uuidv4()
            }} title="Start new chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>New Chat</span>
            </button>
          </div>
        )}

        <div className="input-wrapper">
          <div className="input-box user-specific-design">

            {/* Top Row: Text Input */}
            <div className="input-top-row">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Ask anything (Ctrl+L), @ to mention, / for workflows"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isStreaming || animatingMessageId !== null}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isStreaming && !animatingMessageId) {
                    e.preventDefault()
                    handleSend(input)
                  }
                }}
              />
            </div>

            {/* Bottom Row: Controls */}
            <div className="input-bottom-row">
              <div className="left-controls">
                {/* Tools Toggle */}
                <div className="tools-section">
                  <div className={`tools-menu custom-dropdown-menu ${activeDropdown === 'tools' ? 'show' : ''}`}>
                    <div className="tool-option" onClick={() => setActiveDropdown(null)}>
                      <span className="icon-box purple">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                      </span>
                      <div className="text"><span className="title">Checklist</span></div>
                    </div>
                    <div className="tool-option" onClick={() => setActiveDropdown(null)}>
                      <span className="icon-box blue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                      </span>
                      <div className="text"><span className="title">Translate</span></div>
                    </div>
                    <div className="tool-option" onClick={() => setActiveDropdown(null)}>
                      <div className="text" style={{ paddingLeft: '4px', fontSize: '11px', color: '#666' }}>More coming soon...</div>
                    </div>
                  </div>

                  <button
                    className={`control-btn plus-btn dropdown-trigger ${activeDropdown === 'tools' ? 'active' : ''}`}
                    onClick={() => setActiveDropdown(activeDropdown === 'tools' ? null : 'tools')}
                    title="Add attachment / Tools"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>

                {/* Mode Selectors with Dropup */}

                {/* Mode Dropdown */}
                <div className="tools-section">
                  <div className={`tools-menu custom-dropdown-menu ${activeDropdown === 'mode' ? 'show' : ''}`} style={{ width: '120px' }}>
                    <div className="tool-option" onClick={() => setActiveDropdown(null)}>
                      <div className="text"><span className="title">Fast</span></div>
                    </div>
                    <div className="tool-option" onClick={() => setActiveDropdown(null)}>
                      <div className="text"><span className="title">Balanced</span></div>
                    </div>
                  </div>

                  <button
                    className={`mode-pill-btn dropdown-trigger ${activeDropdown === 'mode' ? 'active-mode' : ''}`}
                    onClick={() => setActiveDropdown(activeDropdown === 'mode' ? null : 'mode')}
                  >
                    <span className="chevron">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    </span>
                    <span>Fast</span>
                  </button>
                </div>

                {/* Model Dropdown */}
                <div className="tools-section">
                  <div className={`tools-menu custom-dropdown-menu ${activeDropdown === 'model' ? 'show' : ''}`} style={{ width: '200px' }}>
                    <div className="tool-option" onClick={() => setActiveDropdown(null)}>
                      <div className="text"><span className="title">GPT 4o-mini</span></div>
                    </div>
                    <div className="tool-option" onClick={() => setActiveDropdown(null)}>
                      <div className="text"><span className="title">GPT 4o</span></div>
                    </div>
                    <div className="tool-option" onClick={() => setActiveDropdown(null)}>
                      <div className="text"><span className="title">Gemini Pro 1.5</span></div>
                    </div>
                  </div>

                  <button
                    className={`mode-pill-btn active-mode dropdown-trigger ${activeDropdown === 'model' ? 'active-mode' : ''}`}
                    onClick={() => setActiveDropdown(activeDropdown === 'model' ? null : 'model')}
                  >
                    <span className="chevron">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    </span>
                    <span>GPT 4o-mini (High)</span>
                  </button>
                </div>
              </div>

              <div className="right-controls">
                <button
                  className={`send-btn-circle ${input.trim() || isStreaming || animatingMessageId ? 'active' : ''}`}
                  onClick={(isStreaming || animatingMessageId) ? handleStop : () => handleSend(input)}
                  disabled={(!input.trim() && !isStreaming && !animatingMessageId)}
                >
                  {(isStreaming || animatingMessageId) ? (
                    // Stop Square
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    </svg>
                  ) : (
                    // Right Arrow
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-text">
          Allowed to generate up to 2000 tokens per request.
        </div>
      </div>
    </div>
  )
}
