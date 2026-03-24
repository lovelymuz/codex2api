interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  pageSize: number
}

export default function Pagination({ page, totalPages, onPageChange, totalItems, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div className="pagination">
      <span className="pagination-info">
        显示 {start}-{end} / 共 {totalItems} 条
      </span>
      <div className="pagination-controls">
        <button
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          上一页
        </button>
        <span className="pagination-page">{page} / {totalPages}</span>
        <button
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  )
}
