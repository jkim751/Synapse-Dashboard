'use client'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const variants = {
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: '🗑️',
      iconBg: 'bg-red-100',
      confirmBtn: 'bg-red-500 hover:bg-red-600'
    },
    warning: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: '⚠️',
      iconBg: 'bg-orange-100',
      confirmBtn: 'bg-orange-500 hover:bg-orange-600'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'ℹ️',
      iconBg: 'bg-blue-100',
      confirmBtn: 'bg-blue-500 hover:bg-blue-600'
    }
  }

  const style = variants[variant]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className={`relative ${style.bg} border-2 ${style.border} rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200`}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`${style.iconBg} rounded-full p-3 text-2xl flex-shrink-0`}>
            {style.icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${style.confirmBtn} text-white rounded-lg transition-colors font-medium`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
