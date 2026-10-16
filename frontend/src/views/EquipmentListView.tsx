import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, query, errorMessage } from '../api'
import type { Equipment, Page } from '../types'
import EquipmentArt from '../components/EquipmentArt'
import AppIcon from '../components/AppIcon'
import PaginationBar from '../components/PaginationBar'

export default function EquipmentListView() {
  const [data, setData] = useState<Page<Equipment>>({ items: [], total: 0, page: 1, size: 8 })
  const [categories, setCategories] = useState<string[]>([])
  // 输入中的关键词与已提交的关键词分开，点击搜索时才重新请求。
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [appliedName, setAppliedName] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api<string[]>('/equipment/categories')
      .then(setCategories)
      .catch((error) => setError(errorMessage(error)))
  }, [])

  useEffect(() => {
    let active = true
    // 清理函数使上一次筛选请求失效，避免较慢的旧响应覆盖新结果。
    setLoading(true)
    setError('')
    api<Page<Equipment>>('/equipment' + query({ page, size: 8, name: appliedName, category }))
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
  }, [page, appliedName, category, refresh])

  function selectCategory(value: string) {
    setCategory(value)
    setPage(1)
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE EQUIPMENT LIBRARY</p>
          <h1>
            设备库<span className="heading-dot">.</span>
          </h1>
          <p className="muted">找到趁手的设备，让下一个想法开始发生。</p>
        </div>
        <span className="count-pill">{data.total} 台设备</span>
      </div>
      <section className="welcome-banner">
        <div>
          <span className="banner-tag">共享有序 · 创作自由</span>
          <h2>先预约，再出发。</h2>
          <p>
            每天上午、下午两个时段，可预约未来 30 天。
            <br className="desktop-only" />
            到现场后，请联系管理员确认领用与归还。
          </p>
        </div>
        <div className="banner-illustration">
          <span className="outline-card">
            <AppIcon
              name="calendar"
              size={64}
            />
            <span>
              MAKE ROOM
              <br />
              FOR IDEAS.
            </span>
          </span>
          <span className="banner-spark">✳</span>
        </div>
      </section>
      <div className="list-toolbar">
        <div
          className="category-tabs"
          aria-label="设备分类"
        >
          <button
            className={!category ? 'active' : ''}
            onClick={() => selectCategory('')}
          >
            全部设备
          </button>
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? 'active' : ''}
              onClick={() => selectCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <form
          className="search-form"
          onSubmit={(event) => {
            event.preventDefault()
            setAppliedName(name)
            setPage(1)
            setRefresh((value) => value + 1)
          }}
        >
          <AppIcon
            name="search"
            size={18}
          />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="搜索设备名称"
            aria-label="搜索设备名称"
            maxLength={100}
          />
          <button type="submit">搜索</button>
        </form>
      </div>
      {error && (
        <div
          className="alert error"
          role="alert"
        >
          {error}
          <button onClick={() => setRefresh((value) => value + 1)}>重新加载</button>
        </div>
      )}
      {loading ? (
        <div
          className="empty-state"
          role="status"
        >
          正在寻找好设备…
        </div>
      ) : !error && !data.items.length ? (
        <div className="empty-state">
          <AppIcon
            name="search"
            size={36}
          />
          <h3>没有找到匹配的设备</h3>
          <p>试试其他名称或分类。</p>
        </div>
      ) : (
        !error && (
          <div className="equipment-grid">
            {data.items.map((item) => (
              <Link
                key={item.id}
                to={`/equipment/${item.id}`}
                className="equipment-card"
              >
                <EquipmentArt
                  category={item.category}
                  code={item.assetCode}
                />
                <div className="equipment-card-body">
                  <div className="card-meta">
                    <span>{item.category}</span>
                    <span className={`status ${item.enabled ? 'available' : 'CANCELLED'}`}>
                      <i />
                      {item.enabled ? '开放预约' : '暂停预约'}
                    </span>
                  </div>
                  <h3>{item.name}</h3>
                  <p className="location">
                    <AppIcon
                      name="pin"
                      size={14}
                    />
                    {item.location}
                  </p>
                  <div className="card-bottom">
                    <span>查看设备与可用时段</span>
                    <AppIcon
                      name="arrow"
                      size={18}
                    />
                  </div>
                </div>
              </Link>
            ))}
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
    </>
  )
}
