import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, query, errorMessage } from '../api'
import { useToast } from '../providers'
import type { Equipment, Page } from '../types'
import PaginationBar from '../components/PaginationBar'
import AppIcon from '../components/AppIcon'

type EquipmentInput = Omit<Equipment, 'id'>
const blank = (): EquipmentInput => ({
  assetCode: '',
  name: '',
  category: '相机',
  location: '',
  description: '',
  enabled: true,
})
function EquipmentEditor({
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
  const [error, setError] = useState(''),
    [saving, setSaving] = useState(false)
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
    if (saving) return
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
        if (!saving) onClose()
      }}
    >
      <form className="dialog-body" onSubmit={save}>
        <p className="eyebrow">EQUIPMENT DETAILS</p>
        <h2>{item ? '编辑设备' : '添加一台新设备'}</h2>
        {error && (
          <div className="alert error" role="alert">
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
          <button className="button secondary" type="button" disabled={saving} onClick={onClose}>
            取消
          </button>
          <button className="button" disabled={saving}>
            {saving ? '正在保存…' : '保存设备'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
export default function EquipmentAdminView() {
  const [data, setData] = useState<Page<Equipment>>({ items: [], total: 0, page: 1, size: 10 })
  const [name, setName] = useState(''),
    [appliedName, setAppliedName] = useState('')
  const [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  const [editor, setEditor] = useState<{ item: Equipment | null }>()
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api<Page<Equipment>>('/equipment' + query({ page, size: 10, name: appliedName }))
      .then((result) => {
        if (active) setData(result)
      })
      .catch((error) => {
        if (active) setError(errorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, appliedName, refresh])
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EQUIPMENT MANAGEMENT</p>
          <h1>
            设备管理<span className="heading-dot">.</span>
          </h1>
          <p className="muted">每台实物独立编号，清晰管理团队的共享资产。</p>
        </div>
        <button className="button" onClick={() => setEditor({ item: null })}>
          ＋ 新增设备
        </button>
      </div>
      <div className="info-strip">
        <AppIcon name="settings" size={20} />
        <span>暂停预约只影响新预约，已有预约、领用与归还仍可正常处理。</span>
      </div>
      <section className="panel records-panel">
        <form
          className="filter-form"
          onSubmit={(event) => {
            event.preventDefault()
            setAppliedName(name)
            setPage(1)
            setRefresh((value) => value + 1)
          }}
        >
          <label>
            设备名称
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="输入名称搜索"
              maxLength={100}
            />
          </label>
          <button className="button" disabled={loading}>
            搜索
          </button>
        </form>
        {error && (
          <div className="alert error" role="alert">
            {error}
            <button onClick={() => setRefresh((value) => value + 1)}>重试</button>
          </div>
        )}
        {loading ? (
          <div className="empty-state">正在加载设备…</div>
        ) : !error && !data.items.length ? (
          <div className="empty-state">没有找到设备，试试其他关键词或新增一台。</div>
        ) : (
          !error && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>设备</th>
                    <th>实物编号</th>
                    <th>分类</th>
                    <th>存放位置</th>
                    <th>预约设置</th>
                    <th className="actions-cell">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link className="table-title" to={`/equipment/${item.id}`}>
                          {item.name}
                        </Link>
                      </td>
                      <td>
                        <code>{item.assetCode}</code>
                      </td>
                      <td>{item.category}</td>
                      <td>{item.location}</td>
                      <td>
                        <span className={`status ${item.enabled ? 'available' : 'CANCELLED'}`}>
                          <i />
                          {item.enabled ? '开放预约' : '暂停预约'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button className="text-button" onClick={() => setEditor({ item })}>
                          编辑设备
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        <PaginationBar
          page={page}
          size={data.size}
          total={data.total}
          loading={loading}
          onChange={setPage}
        />
      </section>
      {editor && (
        <EquipmentEditor
          item={editor.item}
          onClose={() => setEditor(undefined)}
          onSaved={() => {
            setEditor(undefined)
            setRefresh((value) => value + 1)
          }}
        />
      )}
    </>
  )
}
