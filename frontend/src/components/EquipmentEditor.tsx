import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from '../api'
import { useToast } from '../providers'
import type { Equipment } from '../types'

type EquipmentInput = Omit<Equipment, 'id'>
const blank = (): EquipmentInput => ({
  assetCode: '',
  name: '',
  category: '相机',
  location: '',
  description: '',
  enabled: true,
})

export default function EquipmentEditor({
  item,
  onClose,
  onSaved,
}: {
  item: Equipment | null
  onClose: () => void
  onSaved: () => void
}) {
  const notify = useToast()
  const [form, setForm] = useState<EquipmentInput>(item || blank())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])

  function change(key: keyof EquipmentInput, value: string | boolean) {
    setForm((old) => ({ ...old, [key]: value }))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving) {
      return
    }
    setSaving(true)
    setError('')
    try {
      await api('/admin/equipment' + (item ? `/${item.id}` : ''), {
        method: item ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      })
      notify(item ? '设备信息已更新。' : '设备已添加，可开始预约。')
      onSaved()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="dialog equipment-dialog"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) {
          onClose()
        }
      }}
    >
      <form
        className="dialog-body"
        onSubmit={save}
      >
        <p className="eyebrow">EQUIPMENT DETAILS</p>
        <h2>{item ? '编辑设备' : '添加一台新设备'}</h2>
        {error && (
          <div
            className="alert error"
            role="alert"
          >
            {error}
          </div>
        )}
        <div className="form-grid">
          <label>
            实物编号
            <input
              value={form.assetCode}
              onChange={(event) => change('assetCode', event.target.value)}
              placeholder="例如 CAM-004"
              required
              maxLength={40}
              disabled={saving}
            />
          </label>
          <label>
            设备名称
            <input
              value={form.name}
              onChange={(event) => change('name', event.target.value)}
              placeholder="例如 索尼 A7 IV"
              required
              maxLength={100}
              disabled={saving}
            />
          </label>
          <label>
            分类
            <input
              value={form.category}
              onChange={(event) => change('category', event.target.value)}
              list="category-suggestions"
              required
              maxLength={40}
              disabled={saving}
            />
            <datalist id="category-suggestions">
              <option>相机</option>
              <option>投影仪</option>
              <option>测试手机</option>
              <option>音频设备</option>
            </datalist>
          </label>
          <label>
            存放位置
            <input
              value={form.location}
              onChange={(event) => change('location', event.target.value)}
              placeholder="例如 器材室 · A01"
              required
              maxLength={100}
              disabled={saving}
            />
          </label>
        </div>
        <label>
          设备说明
          <textarea
            value={form.description}
            onChange={(event) => change('description', event.target.value)}
            placeholder="配件、使用提示与注意事项"
            rows={4}
            maxLength={1000}
            disabled={saving}
          />
        </label>
        <label className="checkbox-label">
          <input
            checked={form.enabled}
            onChange={(event) => change('enabled', event.target.checked)}
            type="checkbox"
            disabled={saving}
          />
          开放新预约
        </label>
        <p className="muted small-text">取消勾选后暂停新预约，已有借还记录不受影响。</p>
        <div className="dialog-actions">
          <button
            className="button secondary"
            type="button"
            disabled={saving}
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="button"
            disabled={saving}
          >
            {saving ? '正在保存…' : '保存设备'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
