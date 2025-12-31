// This component has dependencies on the parent project
// Users should provide their own ChecklistPreview component or use the default placeholder
import React, { useState } from 'react'
// import { useChatbotChecklist } from '../../redux/hooks'

const ChecklistPreview = () => {
  // const { isPreviewModalOpen, data, closePreview } = useChatbotChecklist()
  const [loading, setLoading] = useState(false)

  // const data = {} as TemplateHistoryItemStore
  // const isPreviewModalOpen = true

  // if (!isPreviewModalOpen) {
  //   return null
  // }

  // Placeholder implementation - users should provide their own preview component
  return (
    <div className='position-fixed w-100 h-100 d-flex flex-column justify-content-center align-items-center chatbot-checklist-preview py-2' style={{ zIndex: 9999, top: 0, backgroundColor: '#000000b9' }}>
      <div className={'d-block position-fixed rounded'}
        style={{ right: 0, top: 0, zIndex: 99999, backgroundColor: '#64646441' }}>
        <button
          // size={'lg'}
          className={'btn-icon'}
          color={'flat-dark'}
          // onClick={closePreview}
          disabled={loading}
        >
          <span style={{ color: 'white', fontSize: '1.5rem' }}>×</span>
        </button>
      </div>
      <div className='flex-1 d-flex align-items-center justify-content-center' style={{ color: 'white' }}>
        <div>
          <p>Checklist Preview</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            Provide your own ChecklistPreview component to customize this view.
          </p>
          <pre style={{ fontSize: '0.8rem', textAlign: 'left', maxWidth: '500px', overflow: 'auto' }}>
            {/* {JSON.stringify(data, null, 2)} */}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default ChecklistPreview