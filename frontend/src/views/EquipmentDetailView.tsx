import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, errorMessage } from '../api'
import { useToast } from '../providers'
import type { Equipment, CalendarInfo, Availability, Slot } from '../types'
import { slotLabels } from '../types'
import EquipmentArt from '../components/EquipmentArt'
import AppIcon from '../components/AppIcon'
import ConfirmDialog from '../components/ConfirmDialog'

export default function EquipmentDetailView() {
  const { id } = useParams()
  const navigate = useNavigate(),
    notify = useToast()
  const [equipment, setEquipment] = useState<Equipment>(),
    [calendar, setCalendar] = useState<CalendarInfo>(),
    [availability, setAvailability] = useState<Availability>()
  const [date, setDate] = useState(''),
    [selected, setSelected] = useState<Slot>()
  const [loading, setLoading] = useState(true),
    [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState(''),
    [slotsError, setSlotsError] = useState(''),
    [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false),
    [confirming, setConfirming] = useState(false),
    [refresh, setRefresh] = useState(0),
    [slotsRefresh, setSlotsRefresh] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([api<Equipment>(`/equipment/${id}`), api<CalendarInfo>('/calendar')])
      .then(([item, info]) => {
        if (active) {
          setEquipment(item)
          setCalendar(info)
          setDate(info.today)
        }
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
  }, [id, refresh])
  useEffect(() => {
    let active = true
    setSelected(undefined)
    setAvailability(undefined)
    setSlotsError('')
    if (!date) {
      setSlotsLoading(false)
      return
    }
    setSlotsLoading(true)
    api<Availability>(`/equipment/${id}/availability?date=${date}`)
      .then((result) => {
        if (active) setAvailability(result)
      })
      .catch((error) => {
        if (active) setSlotsError(errorMessage(error))
      })
      .finally(() => {
        if (active) setSlotsLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, date, slotsRefresh])
  async function book() {
    if (busy || !selected || !equipment) return
    setBusy(true)
    setSubmitError('')
    try {
      await api('/reservations', {
        method: 'POST',
        body: JSON.stringify({ equipmentId: equipment.id, date, slot: selected }),
      })
      notify('预约成功！请在领用时联系管理员。')
      navigate('/mine')
    } catch (error) {
      setSubmitError(errorMessage(error))
      setSelected(undefined)
      setSlotsRefresh((value) => value + 1)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Link className="back-link" to="/equipment">
        ← 返回设备库
      </Link>
      {error && (
        <div className="alert error" role="alert">
          {error}
          <button onClick={() => setRefresh((value) => value + 1)}>重试</button>
        </div>
      )}
      {loading ? (
        <div className="empty-state">正在加载设备…</div>
      ) : (
        equipment &&
        calendar &&
        !error && (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  {equipment.assetCode} / {equipment.category}
                </p>
                <h1>{equipment.name}</h1>
                <p className="location">
                  <AppIcon name="pin" size={16} />
                  {equipment.location}
                </p>
              </div>
              <span className={`status ${equipment.enabled ? 'available' : 'CANCELLED'}`}>
                <i />
                {equipment.enabled ? '开放预约' : '暂停预约'}
              </span>
            </div>
            <div className="detail-grid">
              <section className="panel detail-info">
                <EquipmentArt category={equipment.category} code={equipment.assetCode} />
                <div className="panel-body">
                  <h3>关于这台设备</h3>
                  <p className="description">{equipment.description || '暂无补充说明。'}</p>
                  <hr />
                  <h3>借用小提醒</h3>
                  <ul className="tips">
                    <li>每条预约对应一台实物设备、一个固定时段。</li>
                    <li>到现场后由管理员确认领用，归还也请当面确认。</li>
                    <li>暂时用不上时，请及时取消预约，让给需要的伙伴。</li>
                  </ul>
                </div>
              </section>
              <section className="panel booking-panel">
                <p className="eyebrow">PLAN YOUR NEXT SESSION</p>
                <h2>安排使用时间</h2>
                <p className="muted">所有时间均为北京时间（Asia/Shanghai）。</p>
                <label className="date-field">
                  选择日期
                  <input
                    value={date}
                    onChange={(event) => {
                      setSelected(undefined)
                      setAvailability(undefined)
                      setDate(event.target.value)
                    }}
                    type="date"
                    min={calendar.today}
                    max={calendar.maxDate}
                    disabled={busy}
                    required
                  />
                </label>
                <div className="field-heading">
                  选择时段<span>可预约尚未结束的时段</span>
                </div>
                {slotsLoading ? (
                  <div className="empty-state compact">正在查询时段…</div>
                ) : slotsError ? (
                  <div className="alert error">
                    {slotsError}
                    <button onClick={() => setSlotsRefresh((value) => value + 1)}>重试</button>
                  </div>
                ) : (
                  availability && (
                    <div className="slot-options">
                      {availability.slots.map((slot) => (
                        <button
                          key={slot.slot}
                          className={`slot-option ${selected === slot.slot ? 'selected' : ''}`}
                          disabled={!slot.bookable || busy}
                          onClick={() => setSelected(slot.slot)}
                        >
                          <span>
                            <strong>{slot.label}</strong>
                            <small>
                              {slot.start} — {slot.end}
                            </small>
                          </span>
                          <span className="slot-availability">
                            {slot.bookable
                              ? selected === slot.slot
                                ? '已选择 ✓'
                                : '可预约'
                              : slot.reason}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                )}
                <div className="booking-summary">
                  <span>本次预约</span>
                  <strong>
                    {date || '请选择日期'} · {selected ? slotLabels[selected] : '请选择时段'}
                  </strong>
                  <small>
                    {equipment.name} · {equipment.assetCode}
                  </small>
                </div>
                <button
                  className="button full"
                  disabled={!selected || busy || slotsLoading}
                  onClick={() => {
                    setConfirming(true)
                    setSubmitError('')
                  }}
                >
                  确认预约
                  <AppIcon name="arrow" size={18} />
                </button>
                <p className="form-footnote">预约后可在「我的预约」查看，领用前可自行取消。</p>
              </section>
            </div>
          </>
        )
      )}
      {confirming && equipment && (
        <ConfirmDialog
          title="确认这次设备预约？"
          confirmText="提交预约"
          confirmDisabled={!selected}
          busy={busy}
          error={submitError}
          onClose={() => setConfirming(false)}
          onConfirm={book}
        >
          <p>
            <strong>
              {equipment.name} · {equipment.assetCode}
            </strong>
          </p>
          <p>
            {date} · {selected ? slotLabels[selected] : '时段已刷新，请关闭弹窗重新选择'}
          </p>
          <p className="muted">预约成功后，请联系管理员办理领用。</p>
        </ConfirmDialog>
      )}
    </>
  )
}
