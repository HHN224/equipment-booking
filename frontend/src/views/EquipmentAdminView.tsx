import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, query, errorMessage } from '../api'
import type { Equipment, Page } from '../types'
import PaginationBar from '../components/PaginationBar'
import AppIcon from '../components/AppIcon'
import EquipmentEditor from '../components/EquipmentEditor'

export default function EquipmentAdminView() {
  const [data, setData] = useState<Page<Equipment>>({ items: [], total: 0, page: 1, size: 10 })
  const [name, setName] = useState('')
  const [appliedName, setAppliedName] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<{ item: Equipment | null }>()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api<Page<Equipment>>('/equipment' + query({ page, size: 10, name: appliedName }))
      .then((result) => {
        if (active) {
          setData(result)
        }
      })
      .catch((error) => {
        if (active) {
          setError(errorMessage(error))
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
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
        <button
          className="button"
          onClick={() => setEditor({ item: null })}
        >
          ＋ 新增设备
        </button>
      </div>
      <div className="info-strip">
        <AppIcon
          name="settings"
          size={20}
        />
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
          <button
            className="button"
            disabled={loading}
          >
            搜索
          </button>
        </form>
        {error && (
          <div
            className="alert error"
            role="alert"
          >
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
                        <Link
                          className="table-title"
                          to={`/equipment/${item.id}`}
                        >
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
                        <button
                          className="text-button"
                          onClick={() => setEditor({ item })}
                        >
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
