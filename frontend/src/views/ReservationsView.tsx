import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, query, errorMessage } from '../api'
import { useToast } from '../providers'
import type { Reservation, Page, Status, Equipment } from '../types'
import { statusLabels, slotLabels, timeText } from '../types'
import PaginationBar from '../components/PaginationBar'
import ConfirmDialog from '../components/ConfirmDialog'
import AppIcon from '../components/AppIcon'

type ActionKind = 'cancel' | 'pickup' | 'return'
const actionLabels = { cancel: '取消预约', pickup: '确认领用', return: '确认归还' }
const blankFilters = { date: '', status: '', equipmentId: '', member: '' }
export default function ReservationsView({ admin }: { admin: boolean }) {
  const notify = useToast()
  const [data, setData] = useState<Page<Reservation>>({ items: [], total: 0, page: 1, size: 10 })
  const [equipmentOptions, setEquipmentOptions] = useState<Equipment[]>([])
  const [filters, setFilters] = useState(blankFilters),
    [applied, setApplied] = useState(blankFilters)
  const [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState('')
  const [action, setAction] = useState<{ row: Reservation; kind: ActionKind }>()
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const params = {
      page,
      size: 10,
      date: applied.date,
      status: applied.status,
      ...(admin ? { equipmentId: applied.equipmentId, member: applied.member } : {}),
    }
    api<Page<Reservation>>((admin ? '/admin/reservations' : '/reservations/mine') + query(params))
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
  }, [admin, page, applied, refresh])
  useEffect(() => {
    if (!admin) return
    let active = true
    async function loadEquipment() {
      const items: Equipment[] = []
      let page = 1,
        total = 0
      do {
        const result = await api<Page<Equipment>>('/equipment' + query({ page, size: 100 }))
        items.push(...result.items)
        total = result.total
        page++
      } while (items.length < total)
      if (active) setEquipmentOptions(items)
    }
    loadEquipment().catch((error) => {
      if (active) setError(errorMessage(error))
    })
    return () => {
      active = false
    }
  }, [admin])
  function choose(row: Reservation, kind: ActionKind) {
    setActionError('')
    setAction({ row, kind })
  }
  async function confirm() {
    if (!action || busy) return
    setBusy(true)
    setActionError('')
    const { row, kind } = action
    try {
      await api(`${kind === 'cancel' ? '' : '/admin'}/reservations/${row.id}/${kind}`, {
        method: 'POST',
      })
      notify(
        kind === 'cancel'
          ? '预约已取消，时段已释放。'
          : kind === 'pickup'
            ? '已确认领用，请提醒成员按时归还。'
            : '已确认归还，实际归还时间已记录。',
      )
      setAction(undefined)
      setRefresh((value) => value + 1)
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  function changeFilter(key: keyof typeof blankFilters, value: string) {
    setFilters((old) => ({ ...old, [key]: value }))
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{admin ? 'TEAM RESERVATIONS' : 'YOUR PLANS & HISTORY'}</p>
          <h1>
            {admin ? '预约与借还' : '我的预约'}
            <span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            {admin
              ? '从预约到归还，让每一次设备流转都有记录。'
              : '管理接下来的安排，也留住每一次创作的足迹。'}
          </p>
        </div>
        {!admin && (
          <Link className="button" to="/equipment">
            预约设备
            <AppIcon name="arrow" size={17} />
          </Link>
        )}
      </div>
      <div className="info-strip">
        <AppIcon name="calendar" size={20} />
        <span>
          {admin
            ? '请核对设备实物和成员信息后确认领用；同一设备需先归还，才可再次领出。'
            : '已预约的设备可在领用前取消。领用与归还请联系现场管理员确认。'}
        </span>
      </div>
      <section className="panel records-panel">
        <form
          className="filter-form"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            setApplied({ ...filters })
          }}
        >
          <label>
            预约日期
            <input
              value={filters.date}
              onChange={(event) => changeFilter('date', event.target.value)}
              type="date"
            />
          </label>
          <label>
            预约状态
            <select
              value={filters.status}
              onChange={(event) => changeFilter('status', event.target.value)}
            >
              <option value="">全部状态</option>
              {(Object.keys(statusLabels) as Status[]).map((key) => (
                <option key={key} value={key}>
                  {statusLabels[key]}
                </option>
              ))}
            </select>
          </label>
          {admin && (
            <>
              <label>
                设备
                <select
                  value={filters.equipmentId}
                  onChange={(event) => changeFilter('equipmentId', event.target.value)}
                >
                  <option value="">全部设备</option>
                  {equipmentOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.assetCode} · {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                成员
                <input
                  value={filters.member}
                  onChange={(event) => changeFilter('member', event.target.value)}
                  placeholder="姓名或账号"
                  maxLength={80}
                />
              </label>
            </>
          )}
          <button className="button" disabled={loading}>
            筛选
          </button>
          <button
            className="button secondary"
            type="button"
            disabled={loading}
            onClick={() => {
              setFilters(blankFilters)
              setApplied({ ...blankFilters })
              setPage(1)
            }}
          >
            重置
          </button>
        </form>
        {error && (
          <div className="alert error" role="alert">
            {error}
            <button onClick={() => setRefresh((value) => value + 1)}>重试</button>
          </div>
        )}
        {loading ? (
          <div className="empty-state" role="status">
            正在加载预约记录…
          </div>
        ) : !error && !data.items.length ? (
          <div className="empty-state">
            <AppIcon name="calendar" size={38} />
            <h3>这里还没有预约记录</h3>
            <p>调整筛选条件，或去设备库安排一次预约。</p>
          </div>
        ) : (
          !error && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>设备 / 预约编号</th>
                    {admin && <th>预约成员</th>}
                    <th>预约时段</th>
                    <th>状态</th>
                    <th>借还时间</th>
                    <th className="actions-cell">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link to={`/equipment/${row.equipmentId}`} className="table-title">
                          {row.equipmentName}
                        </Link>
                        <small>
                          {row.assetCode}
                          <span className="divider">/</span>#{row.id}
                        </small>
                      </td>
                      {admin && (
                        <td>
                          <strong>{row.memberName}</strong>
                          <small>{row.username}</small>
                        </td>
                      )}
                      <td>
                        <strong>{row.date}</strong>
                        <small>{slotLabels[row.slot]}</small>
                      </td>
                      <td>
                        <span className={`status ${row.status}`}>
                          <i />
                          {statusLabels[row.status]}
                        </span>
                      </td>
                      <td>
                        <small>领用 {timeText(row.pickedUpAt)}</small>
                        <small>归还 {timeText(row.returnedAt)}</small>
                      </td>
                      <td className="actions-cell">
                        {!admin && row.status === 'RESERVED' ? (
                          <button
                            className="text-button danger-text"
                            onClick={() => choose(row, 'cancel')}
                          >
                            取消预约
                          </button>
                        ) : admin && row.status === 'RESERVED' ? (
                          <button className="button small" onClick={() => choose(row, 'pickup')}>
                            确认领用
                          </button>
                        ) : admin && row.status === 'PICKED_UP' ? (
                          <button
                            className="button secondary small"
                            onClick={() => choose(row, 'return')}
                          >
                            确认归还
                          </button>
                        ) : (
                          <span className="muted">—</span>
                        )}
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
      {action && (
        <ConfirmDialog
          title={`${actionLabels[action.kind]}？`}
          confirmText={actionLabels[action.kind]}
          busy={busy}
          error={actionError}
          danger={action.kind === 'cancel'}
          onClose={() => setAction(undefined)}
          onConfirm={confirm}
        >
          <p>
            <strong>
              {action.row.equipmentName} · {action.row.assetCode}
            </strong>
          </p>
          <p>
            {action.row.date} · {slotLabels[action.row.slot]}
          </p>
          {admin && (
            <p>
              预约成员：{action.row.memberName}（{action.row.username}）
            </p>
          )}
          <p className="muted">
            {action.kind === 'cancel'
              ? '取消后会立即释放该时段，其他成员可以重新预约。'
              : action.kind === 'pickup'
                ? '请确认设备已交给该成员，并核对配件是否齐全。'
                : '请确认设备与配件已收到。系统将记录当前时间为实际归还时间。'}
          </p>
        </ConfirmDialog>
      )}
    </>
  )
}
