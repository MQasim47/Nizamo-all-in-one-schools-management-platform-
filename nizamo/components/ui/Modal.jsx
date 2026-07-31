'use client'

import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = '440px', actions }) {
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') onClose?.()
    }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-[rgba(44,24,16,0.45)] z-[200] flex items-center justify-center backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        className="bg-warm-white rounded-[18px] p-[30px] w-[90%] animate-modal"
        style={{ maxWidth }}
      >
        {title && (
          <div className="font-serif text-xl text-text-dark mb-2.5">{title}</div>
        )}
        <div className="text-text-light text-[13px] leading-relaxed">{children}</div>
        {actions && (
          <div className="flex gap-2.5 justify-end mt-5">{actions}</div>
        )}
      </div>
    </div>
  )
}
