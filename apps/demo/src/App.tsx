import { FullScreenChat, ChatbotProvider } from 'flowdit-chatbot-library'
// Import source SCSS directly for HMR support
import 'flowdit-chatbot-library/assets/scss/styles.scss'

function App() {
  return (
    <ChatbotProvider>
      <FullScreenChat />
    </ChatbotProvider>
  )
}

export default App
