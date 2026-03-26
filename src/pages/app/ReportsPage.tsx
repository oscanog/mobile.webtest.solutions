import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { OrgRole } from '../../auth-context'
import { useAuth } from '../../auth-context'
import { DetailPair, SectionCard } from '../../components/ui'
import { canPerformIssueAction, type IssueWorkflowActionKey } from '../../lib/access'
import { getErrorMessage } from '../../lib/api'
import {
  createIssue,
  deleteIssue,
  fetchIssue,
  fetchIssues,
  formatIssueWorkflowLabel,
  performIssueAction,
  type IssueDetailResponse,
  type IssueRecord,
  type IssuesResponse,
  type WorkflowStatus,
} from '../../features/issues/api'
import { fetchOrganizationMembers, type OrganizationMember } from '../../features/organizations/api'
import { EmptySection, FormMessage, LoadingSection, formatDateTime } from '../shared'

type IssueViewMode = 'kanban' | 'list'
type IssueStatusFilter = 'all' | 'open' | 'closed'

type ReportLane = {
  key: 'open' | WorkflowStatus
  label: string
  overview?: boolean
  statuses: WorkflowStatus[]
}

const REPORT_LANES: ReportLane[] = [
  {
    key: 'open',
    label: 'Open',
    overview: true,
    statuses: [
      'unassigned',
      'with_senior',
      'with_junior',
      'done_by_junior',
      'with_qa',
      'with_senior_qa',
      'with_qa_lead',
      'approved',
      'rejected',
    ],
  },
  { key: 'unassigned', label: 'Unassigned', statuses: ['unassigned'] },
  { key: 'with_senior', label: 'With Senior', statuses: ['with_senior'] },
  { key: 'with_junior', label: 'With Junior', statuses: ['with_junior'] },
  { key: 'done_by_junior', label: 'Ready for QA', statuses: ['done_by_junior'] },
  { key: 'with_qa', label: 'With QA', statuses: ['with_qa'] },
  { key: 'with_senior_qa', label: 'With Senior QA', statuses: ['with_senior_qa'] },
  { key: 'with_qa_lead', label: 'With QA Lead', statuses: ['with_qa_lead'] },
  { key: 'approved', label: 'Approved', statuses: ['approved'] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected'] },
  { key: 'closed', label: 'Closed', statuses: ['closed'] },
]

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function isImageAttachment(attachment: { mime_type: string }) {
  return attachment.mime_type.startsWith('image/')
}

function getReportCardTone(workflowStatus: WorkflowStatus) {
  return `reports-issue-card--${workflowStatus.replace(/_/g, '-')}`
}

function getVisibleLanes(filter: IssueStatusFilter) {
  if (filter === 'closed') {
    return REPORT_LANES.filter((lane) => lane.key === 'closed')
  }
  if (filter === 'open') {
    return REPORT_LANES.filter((lane) => lane.key !== 'closed')
  }
  return REPORT_LANES
}

function getLaneIssues(issues: IssueRecord[], lane: ReportLane) {
  return issues.filter((issue) => lane.statuses.includes(issue.workflow_status))
}

function ReportIssueCard({
  issue,
  compact = false,
}: {
  issue: IssueRecord
  compact?: boolean
}) {
  return (
    <Link to={`/app/reports/${issue.id}`} className={`reports-issue-card ${getReportCardTone(issue.workflow_status)} ${compact ? 'is-compact' : ''}`}>
      <div className="reports-issue-card__top">
        <span className="reports-issue-card__status">{formatIssueWorkflowLabel(issue.workflow_status)}</span>
        <span className="reports-issue-card__id">#{issue.id}</span>
      </div>
      <div className="reports-issue-card__title">{issue.title}</div>
      <div className="reports-issue-card__meta">
        <span>{issue.org_name}</span>
        <span>{issue.author_username}</span>
      </div>
      <div className="reports-issue-card__meta">
        <span>{formatDateTime(issue.created_at, issue.created_at_iso)}</span>
        <span>{issue.attachments.length} evidence</span>
      </div>
    </Link>
  )
}

export function ReportsPage() {
  const { activeOrgId, activeScope, lastOrgId, memberships, session } = useAuth()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const kanbanRef = useRef<HTMLDivElement | null>(null)
  const [createOrgId, setCreateOrgId] = useState(0)
  const [viewMode, setViewMode] = useState<IssueViewMode>('kanban')
  const [status, setStatus] = useState<IssueStatusFilter>('all')
  const [data, setData] = useState<IssuesResponse | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [kanbanNav, setKanbanNav] = useState({ prev: false, next: false })

  useEffect(() => {
    const fallbackOrgId = activeOrgId || lastOrgId || memberships[0]?.org_id || 0
    setCreateOrgId((current) => current || fallbackOrgId)
  }, [activeOrgId, lastOrgId, memberships])

  useEffect(() => {
    if (!isCreateModalOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) {
        setIsCreateModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCreateModalOpen, pending])

  const load = useCallback(async (nextStatus = status) => {
    if (!session?.accessToken || (activeScope === 'org' && !activeOrgId) || activeScope === 'none') {
      setData(null)
      return
    }
    try {
      const result = await fetchIssues(session.accessToken, activeScope === 'org' ? activeOrgId : null, nextStatus)
      setData(result)
      setError('')
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load issues.'))
    }
  }, [activeOrgId, activeScope, session?.accessToken, status])

  useEffect(() => {
    void load(status)
  }, [load, status])

  const visibleLanes = useMemo(() => getVisibleLanes(status), [status])

  const syncKanbanNav = useCallback(() => {
    const node = kanbanRef.current
    if (!node || viewMode !== 'kanban') {
      setKanbanNav((current) => (current.prev || current.next ? { prev: false, next: false } : current))
      return
    }

    const maxScrollLeft = Math.max(node.scrollWidth - node.clientWidth, 0)
    const nextState = {
      prev: maxScrollLeft > 6 && node.scrollLeft > 6,
      next: maxScrollLeft > 6 && node.scrollLeft < maxScrollLeft - 6,
    }

    setKanbanNav((current) => (current.prev === nextState.prev && current.next === nextState.next ? current : nextState))
  }, [viewMode])

  useEffect(() => {
    if (viewMode !== 'kanban') {
      setKanbanNav({ prev: false, next: false })
      return
    }

    const node = kanbanRef.current
    if (!node) {
      return
    }

    const handleScroll = () => syncKanbanNav()
    const frame = window.requestAnimationFrame(handleScroll)

    node.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.cancelAnimationFrame(frame)
      node.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [data?.issues.length, syncKanbanNav, viewMode, visibleLanes.length])

  const scrollKanban = useCallback((direction: -1 | 1) => {
    const node = kanbanRef.current
    if (!node) {
      return
    }

    node.scrollBy({
      left: Math.max(node.clientWidth * 0.82, 220) * direction,
      behavior: 'smooth',
    })
  }, [])

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAttachments(Array.from(event.target.files ?? []))
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const targetOrgId = activeScope === 'all' ? createOrgId : activeOrgId
    if (!session?.accessToken || !targetOrgId || !title.trim()) {
      return
    }

    setPending(true)
    setMessage('')
    setError('')
    try {
      await createIssue(
        session.accessToken,
        {
          org_id: targetOrgId,
          title: title.trim(),
          description: description.trim(),
          labels: [1],
        },
        attachments,
      )
      setTitle('')
      setDescription('')
      setAttachments([])
      setStatus('all')
      setMessage('Issue created.')
      setIsCreateModalOpen(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await load('all')
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'Unable to create issue.'))
    } finally {
      setPending(false)
    }
  }

  if (activeScope === 'none') {
    return <EmptySection title="Issues" message="Set an active organization first." />
  }

  return (
    <div className="page-stack">
      {message ? <FormMessage tone="success">{message}</FormMessage> : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <SectionCard title="Issues" subtitle="Workflow queue">
        <div className="reports-toolbar">
          <div className="reports-toolbar__copy">
            <span className="reports-toolbar__eyebrow">{activeScope === 'all' ? 'ALL ORGANIZATIONS' : 'ACTIVE ORGANIZATION'}</span>
            <strong>Track issue flow from intake through closure.</strong>
            <p className="body-copy">Kanban is the default view for every org member, and cards open the existing detail page.</p>
          </div>

          <div className="reports-toolbar__actions">
            <div className="reports-segmented" role="tablist" aria-label="Issue view mode">
              <button type="button" className={`reports-segmented__button ${viewMode === 'kanban' ? 'is-active' : ''}`} onClick={() => setViewMode('kanban')}>
                Kanban
              </button>
              <button type="button" className={`reports-segmented__button ${viewMode === 'list' ? 'is-active' : ''}`} onClick={() => setViewMode('list')}>
                List
              </button>
            </div>

            <button type="button" className="button button--primary" onClick={() => setIsCreateModalOpen(true)}>
              Create Issue
            </button>
          </div>
        </div>

        <div className="reports-filter-row">
          <button type="button" className={`pill-button ${status === 'all' ? 'is-active' : ''}`} onClick={() => setStatus('all')}>
            All Statuses
          </button>
          <button type="button" className={`pill-button ${status === 'open' ? 'is-active' : ''}`} onClick={() => setStatus('open')}>
            Open Only
          </button>
          <button type="button" className={`pill-button ${status === 'closed' ? 'is-active' : ''}`} onClick={() => setStatus('closed')}>
            Closed Only
          </button>
        </div>

        {!data && !error ? <LoadingSection title="Issues" subtitle="Workflow queue" /> : null}

        {data ? (
          <>
            <div className="reports-summary">
              <span>{data.counts.open} open</span>
              <span>{data.counts.closed} closed</span>
              <span>{data.issues.length} visible</span>
            </div>

            {viewMode === 'kanban' ? (
              <div className="reports-kanban-shell">
                <button
                  type="button"
                  className="reports-kanban-nav reports-kanban-nav--prev"
                  aria-label="Scroll issue lanes left"
                  disabled={!kanbanNav.prev}
                  onClick={() => scrollKanban(-1)}
                >
                  <span aria-hidden="true">&lt;</span>
                </button>
                <div ref={kanbanRef} className="reports-kanban" role="list" aria-label="Issue workflow board">
                  {visibleLanes.map((lane) => {
                    const laneIssues = getLaneIssues(data.issues, lane)
                    return (
                      <section key={lane.key} className={`reports-lane reports-lane--${lane.key.replace(/_/g, '-')}`}>
                        <div className="reports-lane__header">
                          <div>
                            <strong>{lane.label}</strong>
                            <p>{laneIssues.length} issue{laneIssues.length === 1 ? '' : 's'}</p>
                          </div>
                        </div>
                        <div className="reports-lane__body">
                          {laneIssues.length ? (
                            laneIssues.map((issue) => <ReportIssueCard key={`${lane.key}-${issue.id}`} issue={issue} compact />)
                          ) : (
                            <div className="reports-lane__empty">No issues in this lane.</div>
                          )}
                        </div>
                      </section>
                    )
                  })}
                </div>
                <button
                  type="button"
                  className="reports-kanban-nav reports-kanban-nav--next"
                  aria-label="Scroll issue lanes right"
                  disabled={!kanbanNav.next}
                  onClick={() => scrollKanban(1)}
                >
                  <span aria-hidden="true">&gt;</span>
                </button>
              </div>
            ) : (
              <div className="reports-list">
                {data.issues.length ? (
                  data.issues.map((issue) => <ReportIssueCard key={issue.id} issue={issue} />)
                ) : (
                  <EmptySection title="Issues" message="No issues matched the current filter." />
                )}
              </div>
            )}
          </>
        ) : null}
      </SectionCard>

      {isCreateModalOpen ? (
        <div className="manage-users-modal-backdrop" role="presentation" onClick={() => !pending && setIsCreateModalOpen(false)}>
          <div
            className="manage-users-modal reports-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reports-create-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="manage-users-modal__header">
              <h2 id="reports-create-title">Create Issue</h2>
              <p>Any authenticated org member can open a new issue.</p>
            </div>

            <form className="auth-stack" onSubmit={handleCreate}>
              {activeScope === 'all' ? (
                <label className="manage-users-modal__field">
                  <span>Organization</span>
                  <select className="input-inline select-inline" value={createOrgId} onChange={(event) => setCreateOrgId(Number(event.target.value) || 0)}>
                    {memberships.map((membership) => (
                      <option key={membership.org_id} value={membership.org_id}>
                        {membership.org_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="manage-users-modal__field">
                <span>Issue Title</span>
                <input className="input-inline" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Issue title" />
              </label>

              <label className="manage-users-modal__field">
                <span>Issue Description</span>
                <textarea className="input-inline textarea-inline" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Issue description" />
              </label>

              <div className="reports-create-evidence">
                <button type="button" className="button button--ghost" onClick={() => fileInputRef.current?.click()} disabled={pending}>
                  Add Evidence
                </button>
                <span className="body-copy">{attachments.length ? `${attachments.length} file${attachments.length === 1 ? '' : 's'} selected` : 'Images are optional.'}</span>
              </div>

              {attachments.length ? (
                <div className="file-pill-list">
                  {attachments.map((file) => (
                    <span key={`${file.name}-${file.size}`} className="pill">{file.name} • {formatFileSize(file.size)}</span>
                  ))}
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                hidden
                onChange={handleAttachmentChange}
              />

              <div className="reports-create-actions">
                <button type="button" className="button button--ghost" disabled={pending} onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button--primary" disabled={pending || !title.trim()}>
                  {pending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ActionButton({
  label,
  onRun,
  pending,
  tone = 'default',
}: {
  label: string
  onRun: () => void
  pending: boolean
  tone?: 'default' | 'danger'
}) {
  return (
    <div className="action-row">
      <strong>{label}</strong>
      <button type="button" className={`button ${tone === 'danger' ? 'button--ghost' : 'button--primary'}`} disabled={pending} onClick={onRun}>
        {pending ? 'Working...' : label}
      </button>
    </div>
  )
}

function ActionPicker({
  label,
  options,
  selected,
  onSelect,
  onRun,
  pending,
}: {
  label: string
  options: OrganizationMember[]
  selected: number
  onSelect: (value: number) => void
  onRun: () => void
  pending: boolean
}) {
  return (
    <div className="action-row">
      <strong>{label}</strong>
      <div className="action-row__controls">
        <select className="input-inline select-inline" value={selected} onChange={(event) => onSelect(Number(event.target.value))}>
          <option value={0}>Select member</option>
          {options.map((option) => (
            <option key={option.user_id} value={option.user_id}>
              {option.username}
            </option>
          ))}
        </select>
        <button type="button" className="button button--primary" disabled={pending || !selected} onClick={onRun}>
          {pending ? 'Working...' : 'Run'}
        </button>
      </div>
    </div>
  )
}

export function ReportDetailPage() {
  const { issueId } = useParams()
  const navigate = useNavigate()
  const { activeOrgId, activeScope, getMembershipForOrg, session } = useAuth()
  const [data, setData] = useState<IssueDetailResponse | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [selections, setSelections] = useState<Record<string, number>>({})

  const numericIssueId = Number(issueId)

  const load = useCallback(async () => {
    if (!session?.accessToken || (activeScope === 'org' && !activeOrgId) || !numericIssueId) {
      setData(null)
      setMembers([])
      return
    }

    try {
      const issueResult = await fetchIssue(session.accessToken, activeScope === 'org' ? activeOrgId : null, numericIssueId)
      setData(issueResult)
      setError('')

      try {
        const membersResult = await fetchOrganizationMembers(session.accessToken, issueResult.issue.org_id)
        setMembers(membersResult.members)
      } catch {
        setMembers([])
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load issue detail.'))
    }
  }, [activeOrgId, activeScope, numericIssueId, session?.accessToken])

  useEffect(() => {
    void load()
  }, [load])

  const memberOptions = (role: OrgRole) => members.filter((member) => member.org_role === role)
  const issueMembership = data ? getMembershipForOrg(data.issue.org_id) : null
  const actionVisibility = data?.issue
    ? (canPerformIssueAction(session, data.issue, issueMembership) as Record<IssueWorkflowActionKey, boolean>)
    : null

  const runAction = async (action: string, payload: Record<string, unknown>) => {
    if (!session?.accessToken || !data) {
      return
    }

    setPending(true)
    setError('')
    setMessage('')
    try {
      await performIssueAction(session.accessToken, data.issue.id, action, payload)
      setMessage('Issue workflow updated.')
      await load()
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'Unable to update issue workflow.'))
    } finally {
      setPending(false)
    }
  }

  const handleDelete = async () => {
    if (!session?.accessToken || !data) {
      return
    }

    setPending(true)
    setError('')
    setMessage('')
    try {
      await deleteIssue(session.accessToken, data.issue.id, data.issue.org_id)
      navigate('/app/reports', { replace: true })
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'Unable to delete issue.'))
    } finally {
      setPending(false)
    }
  }

  if (!numericIssueId) {
    return <EmptySection title="Issue Detail" message="Issue id is invalid." />
  }

  if (!data && !error) {
    return <LoadingSection title="Issue Detail" subtitle={`Issue #${numericIssueId}`} />
  }

  return (
    <div className="page-stack">
      {message ? <FormMessage tone="success">{message}</FormMessage> : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      {data ? (
        <>
          <SectionCard title={data.issue.title} subtitle={formatIssueWorkflowLabel(data.issue.workflow_status)}>
            <div className="detail-pairs">
              <DetailPair label="Status" value={data.issue.status} />
              <DetailPair label="Workflow" value={formatIssueWorkflowLabel(data.issue.workflow_status)} />
              <DetailPair label="Organization" value={data.issue.org_name} />
              <DetailPair label="Author" value={data.issue.author_username} />
              <DetailPair label="Active Role" value={issueMembership?.role ?? 'No org'} />
              <DetailPair label="Created" value={formatDateTime(data.issue.created_at, data.issue.created_at_iso)} />
            </div>
            <p className="body-copy">{data.issue.description || 'No issue description provided.'}</p>
          </SectionCard>

          <SectionCard title="Evidence" subtitle={`${data.issue.attachments.length} file${data.issue.attachments.length === 1 ? '' : 's'}`}>
            {data.issue.attachments.length ? (
              <>
                {data.issue.attachments.filter(isImageAttachment).length ? (
                  <div className="checklist-batch-gallery">
                    {data.issue.attachments.filter(isImageAttachment).map((attachment) => (
                      <a
                        key={attachment.id}
                        className="checklist-batch-gallery__item"
                        href={attachment.file_path || '#'}
                        target={attachment.file_path ? '_blank' : undefined}
                        rel={attachment.file_path ? 'noreferrer noopener' : undefined}
                      >
                        <img src={attachment.file_path} alt={attachment.original_name} loading="lazy" />
                        <span>{attachment.original_name}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
                {data.issue.attachments.filter((attachment) => !isImageAttachment(attachment)).length ? (
                  <div className="checklist-attachment-list">
                    {data.issue.attachments.filter((attachment) => !isImageAttachment(attachment)).map((attachment) => (
                      <a
                        key={attachment.id}
                        className="checklist-attachment"
                        href={attachment.file_path || '#'}
                        target={attachment.file_path ? '_blank' : undefined}
                        rel={attachment.file_path ? 'noreferrer noopener' : undefined}
                      >
                        <strong>{attachment.original_name}</strong>
                        <span>{attachment.mime_type} • {formatFileSize(attachment.file_size)}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="body-copy">No evidence uploaded for this issue yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Workflow Actions">
            <div className="list-stack">
              {actionVisibility?.['assign-dev'] ? (
                <ActionPicker
                  label="Assign Senior Developer"
                  options={memberOptions('Senior Developer')}
                  selected={selections['assign-dev'] ?? 0}
                  onSelect={(value) => setSelections((current) => ({ ...current, 'assign-dev': value }))}
                  onRun={() => void runAction('assign-dev', { org_id: data.issue.org_id, dev_id: selections['assign-dev'] })}
                  pending={pending}
                />
              ) : null}
              {actionVisibility?.['assign-junior'] ? (
                <ActionPicker
                  label="Assign Junior Developer"
                  options={memberOptions('Junior Developer')}
                  selected={selections['assign-junior'] ?? 0}
                  onSelect={(value) => setSelections((current) => ({ ...current, 'assign-junior': value }))}
                  onRun={() => void runAction('assign-junior', { org_id: data.issue.org_id, junior_id: selections['assign-junior'] })}
                  pending={pending}
                />
              ) : null}
              {actionVisibility?.['junior-done'] ? <ActionButton label="Mark Junior Done" onRun={() => void runAction('junior-done', { org_id: data.issue.org_id })} pending={pending} /> : null}
              {actionVisibility?.['assign-qa'] ? (
                <ActionPicker
                  label="Assign QA Tester"
                  options={memberOptions('QA Tester')}
                  selected={selections['assign-qa'] ?? 0}
                  onSelect={(value) => setSelections((current) => ({ ...current, 'assign-qa': value }))}
                  onRun={() => void runAction('assign-qa', { org_id: data.issue.org_id, qa_id: selections['assign-qa'] })}
                  pending={pending}
                />
              ) : null}
              {actionVisibility?.['report-senior-qa'] ? (
                <ActionPicker
                  label="Report to Senior QA"
                  options={memberOptions('Senior QA')}
                  selected={selections['report-senior-qa'] ?? 0}
                  onSelect={(value) => setSelections((current) => ({ ...current, 'report-senior-qa': value }))}
                  onRun={() => void runAction('report-senior-qa', { org_id: data.issue.org_id, senior_qa_id: selections['report-senior-qa'] })}
                  pending={pending}
                />
              ) : null}
              {actionVisibility?.['report-qa-lead'] ? (
                <ActionPicker
                  label="Report to QA Lead"
                  options={memberOptions('QA Lead')}
                  selected={selections['report-qa-lead'] ?? 0}
                  onSelect={(value) => setSelections((current) => ({ ...current, 'report-qa-lead': value }))}
                  onRun={() => void runAction('report-qa-lead', { org_id: data.issue.org_id, qa_lead_id: selections['report-qa-lead'] })}
                  pending={pending}
                />
              ) : null}
              {actionVisibility?.['qa-lead-approve'] ? <ActionButton label="Approve Issue" onRun={() => void runAction('qa-lead-approve', { org_id: data.issue.org_id })} pending={pending} /> : null}
              {actionVisibility?.['qa-lead-reject'] ? <ActionButton label="Reject Issue" onRun={() => void runAction('qa-lead-reject', { org_id: data.issue.org_id })} pending={pending} tone="danger" /> : null}
              {actionVisibility?.['pm-close'] ? <ActionButton label="Close Issue" onRun={() => void runAction('pm-close', { org_id: data.issue.org_id })} pending={pending} /> : null}
              {actionVisibility?.delete ? <ActionButton label="Delete Issue" onRun={() => void handleDelete()} pending={pending} tone="danger" /> : null}
              {!Object.values(actionVisibility ?? {}).some(Boolean) ? <p className="body-copy">No workflow action is available for your role and the current issue state.</p> : null}
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  )
}
