import type { ChangeEvent } from 'react'
import { useCallback, useState } from 'react'
import { api } from '../api'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import StateShell from '../components/StateShell'
import StatusBadge from '../components/StatusBadge'
import { useDataLoader } from '../hooks/useDataLoader'
import { useToast } from '../hooks/useToast'
import type { AccountRow, AddAccountRequest } from '../types'
import { getErrorMessage } from '../utils/error'
import { formatRelativeTime } from '../utils/time'

export default function Accounts() {
  const [showAdd, setShowAdd] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [addForm, setAddForm] = useState<AddAccountRequest>({
    refresh_token: '',
    proxy_url: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)
  const { toast, showToast } = useToast()

  const loadAccounts = useCallback(async () => {
    const data = await api.getAccounts()
    return data.accounts ?? []
  }, [])

  const { data: accounts, loading, error, reload } = useDataLoader<AccountRow[]>({
    initialData: [],
    load: loadAccounts,
  })

  const totalPages = Math.max(1, Math.ceil(accounts.length / PAGE_SIZE))
  const pagedAccounts = accounts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const allPageSelected = pagedAccounts.length > 0 && pagedAccounts.every((a) => selected.has(a.id))

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const a of pagedAccounts) next.delete(a.id)
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const a of pagedAccounts) next.add(a.id)
        return next
      })
    }
  }

  const handleAdd = async () => {
    if (!addForm.refresh_token.trim()) return
    setSubmitting(true)
    try {
      const result = await api.addAccount(addForm)
      showToast(result.message || '账号添加成功')
      setShowAdd(false)
      setAddForm({ refresh_token: '', proxy_url: '' })
      void reload()
    } catch (error) {
      showToast(`添加失败: ${getErrorMessage(error)}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (account: AccountRow) => {
    if (!confirm(`确定删除账号 "${account.email || account.id}" 吗？`)) return
    try {
      await api.deleteAccount(account.id)
      showToast('已删除')
      void reload()
    } catch (error) {
      showToast(`删除失败: ${getErrorMessage(error)}`, 'error')
    }
  }

  const handleRefresh = async (account: AccountRow) => {
    try {
      await api.refreshAccount(account.id)
      showToast('刷新成功')
      void reload()
    } catch (error) {
      showToast(`刷新失败: ${getErrorMessage(error)}`, 'error')
    }
  }

  const handleBatchDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`确定删除选中的 ${selected.size} 个账号吗？`)) return
    setBatchLoading(true)
    let success = 0
    let fail = 0
    for (const id of selected) {
      try {
        await api.deleteAccount(id)
        success++
      } catch {
        fail++
      }
    }
    showToast(`批量删除完成：成功 ${success}，失败 ${fail}`)
    setSelected(new Set())
    setBatchLoading(false)
    void reload()
  }

  const handleBatchRefresh = async () => {
    if (selected.size === 0) return
    setBatchLoading(true)
    let success = 0
    let fail = 0
    for (const id of selected) {
      try {
        await api.refreshAccount(id)
        success++
      } catch {
        fail++
      }
    }
    showToast(`批量刷新完成：成功 ${success}，失败 ${fail}`)
    setBatchLoading(false)
    void reload()
  }

  return (
    <StateShell
      variant="page"
      loading={loading}
      error={error}
      onRetry={() => void reload()}
      loadingTitle="正在加载账号列表"
      loadingDescription="账号池和实时状态正在同步。"
      errorTitle="账号页加载失败"
    >
      <>
        <PageHeader
          title="账号管理"
          description="管理 Codex 反代账号（Refresh Token）"
          onRefresh={() => void reload()}
          actions={(
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              添加账号
            </button>
          )}
        />

      {selected.size > 0 && (
        <div className="batch-bar">
          <span>已选 {selected.size} 项</span>
          <div className="btn-group">
            <button className="btn btn-secondary btn-sm" disabled={batchLoading} onClick={() => void handleBatchRefresh()}>
              批量刷新
            </button>
            <button className="btn btn-danger btn-sm" disabled={batchLoading} onClick={() => void handleBatchDelete()}>
              批量删除
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
              取消选择
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <StateShell
          variant="section"
          isEmpty={accounts.length === 0}
          emptyTitle="还没有账号"
          emptyDescription="导入 Refresh Token 后，账号会立即加入号池并显示在这里。"
          action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}>添加账号</button>}
        >
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} />
                  </th>
                  <th>ID</th>
                  <th>邮箱</th>
                  <th>套餐</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pagedAccounts.map((account) => (
                  <tr key={account.id} className={selected.has(account.id) ? 'row-selected' : ''}>
                    <td>
                      <input type="checkbox" checked={selected.has(account.id)} onChange={() => toggleSelect(account.id)} />
                    </td>
                    <td className="text-mono text-muted">{account.id}</td>
                    <td className="text-secondary">{account.email || '-'}</td>
                    <td><span className="text-mono">{account.plan_type || '-'}</span></td>
                    <td><StatusBadge status={account.status} /></td>
                    <td className="text-muted">{formatRelativeTime(account.updated_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => void handleRefresh(account)} title="刷新 AT">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                          刷新
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => void handleDelete(account)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={accounts.length}
            pageSize={PAGE_SIZE}
          />
        </StateShell>
      </div>

      <Modal
        show={showAdd}
        title="添加账号"
        onClose={() => setShowAdd(false)}
        footer={(
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>取消</button>
            <button className="btn btn-primary" onClick={() => void handleAdd()} disabled={submitting || !addForm.refresh_token.trim()}>
              {submitting ? '添加中...' : '添加'}
            </button>
          </>
        )}
      >
        <div className="form-group">
          <label>Refresh Token *</label>
          <textarea
            className="form-input"
            placeholder="每行一个 Refresh Token，支持批量粘贴"
            value={addForm.refresh_token}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setAddForm((form) => ({ ...form, refresh_token: event.target.value }))
            }
            rows={3}
          />
        </div>
        <div className="form-group">
          <label>代理地址（可选）</label>
          <input
            className="form-input"
            placeholder="例如：http://127.0.0.1:7890"
            value={addForm.proxy_url}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setAddForm((form) => ({ ...form, proxy_url: event.target.value }))
            }
          />
        </div>
      </Modal>

        {toast ? <div className={`toast toast-${toast.type}`}>{toast.msg}</div> : null}
      </>
    </StateShell>
  )
}
