interface Props {
  page: number
  size: number
  total: number
  loading?: boolean
  onChange: (page: number) => void
}
export default function PaginationBar({ page, size, total, loading, onChange }: Props) {
  return (
    <div className="pagination">
      <span>共 {total} 条记录</span>
      <div>
        <button
          className="button secondary small"
          disabled={page <= 1 || loading}
          onClick={() => onChange(page - 1)}
        >
          上一页
        </button>
        <span>
          {page} / {Math.max(1, Math.ceil(total / size))}
        </span>
        <button
          className="button secondary small"
          disabled={page * size >= total || loading}
          onClick={() => onChange(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  )
}
