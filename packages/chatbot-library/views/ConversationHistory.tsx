import React, { useEffect, useState } from 'react'
import { getAPI } from '../utilities/API'

export interface Conversation {
    conversation_id: string
    title?: string
    created_at: string
    updated_at: string
    message_count: number
}

interface ConversationHistoryProps {
    onSelectConversation?: (conversationId: string) => void
    embedMode: 'with_history' | 'without_history'
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
    onSelectConversation,
    embedMode
}) => {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Only fetch if embedMode is 'with_history'
        if (embedMode !== 'with_history') {
            return
        }

        const fetchConversations = async () => {
            setLoading(true)
            setError(null)

            try {
                const api = getAPI()
                const response = await api.get('/v1/conversations')
                setConversations(response.data || [])
            } catch (err: any) {
                console.error('Failed to fetch conversations:', err)
                setError(err?.response?.data?.detail || 'Failed to load conversations')
            } finally {
                setLoading(false)
            }
        }

        fetchConversations()
    }, [embedMode])

    // Don't render anything if embedMode is 'without_history'
    if (embedMode !== 'with_history') {
        return null
    }

    return (
        <div className="conversation-history" style={{
            width: '250px',
            height: '100%',
            borderRight: '1px solid #e0e0e0',
            padding: '16px',
            overflowY: 'auto',
            backgroundColor: '#f9f9f9'
        }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
                History
            </h3>

            {loading && (
                <div style={{ color: '#666', fontSize: '14px' }}>Loading...</div>
            )}

            {error && (
                <div style={{ color: '#d32f2f', fontSize: '14px', marginBottom: '16px' }}>
                    {error}
                </div>
            )}

            {!loading && conversations.length === 0 && (
                <div style={{ color: '#999', fontSize: '14px' }}>
                    No conversations yet
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {conversations.map((conv) => (
                    <div
                        key={conv.conversation_id}
                        onClick={() => onSelectConversation?.(conv.conversation_id)}
                        style={{
                            padding: '12px',
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: '1px solid #e0e0e0',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0f0f0'
                            e.currentTarget.style.borderColor = '#ccc'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff'
                            e.currentTarget.style.borderColor = '#e0e0e0'
                        }}
                    >
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {conv.title || `Conversation ${conv.conversation_id.slice(0, 8)}`}
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: '#999'
                        }}>
                            {conv.message_count} messages
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
