import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
interface Props {
  title: string
  confirmText: string
  busy: boolean
  error?: string
  danger?: boolean
  confirmDisabled?: boolean
  onClose: () => void
  onConfirm: () => void
  children: ReactNode
}
export default function ConfirmDialog({
  title,
  confirmText,
  busy,
  error,
  danger,
  confirmDisabled,
  onClose,
  onConfirm,
  children,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="dialog"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <div className="dialog-body">
        <p className="eyebrow">操作确认</p>
        <h2>{title}</h2>
        <div className="dialog-content">{children}</div>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button className="button secondary" disabled={busy} onClick={onClose}>
            再想一下
          </button>
          <button
            className={`button ${danger ? 'danger' : ''}`}
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {busy ? '正在提交…' : confirmText}
          </button>
        </div>
      </div>
    </dialog>
  )
}
