import { createPortal } from 'react-dom'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth-context'
import { DetailPair, Icon, SectionCard } from '../../components/ui'
import {
  deleteChecklistItem,
  fetchChecklistItem,
  getChecklistAttachmentUrl,
  uploadChecklistItemAttachments,
  updateChecklistItem,
  updateChecklistItemStatus,
  type ChecklistAttachment,
  type ChecklistItemDetailResponse,
} from '../../features/checklist/api'
import { canManageChecklist } from '../../lib/access'
import { getErrorMessage } from '../../lib/api'
import { EmptySection, FormMessage, LoadingSection, formatDateTime } from '../shared'

const CHECKLIST_PRIORITY_OPTIONS = ['low', 'medium', 'high']
const CHECKLIST_REQUIRED_ROLE_OPTIONS = [
  'QA Lead',
  'Senior QA',
  'QA Tester',
  'Project Manager',
  'Senior Developer',
  'Junior Developer',
  'Junior Developer',
  'member',
  'owner',
]
const CHECKLIST_STATUS_OPTIONS = [
  'open',
  'in_progress',
  'passed',
  'failed',
  'blocked',
]
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.qt'])

type ItemTab = 'overview' | 'evidence' | 'history' | 'edit'

type MenuPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
  placement: 'top' | 'bottom'
}

interface ItemDraftState {
  sequenceNo: string
  title: string
  moduleName: string
  submoduleName: string
  description: string
  priority: string
  requiredRole: string
}

interface HistoryEvent {
  id: string
  title: string
  detail: string
  value: string
  isoValue?: string | null
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatStatusLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function buildDraft(data: ChecklistItemDetailResponse): ItemDraftState {
  return {
    sequenceNo: `${data.item.sequence_no}`,
    title: data.item.title,
    moduleName: data.item.module_name,
    submoduleName: data.item.submodule_name ?? '',
    description: data.item.description ?? '',
    priority: data.item.priority,
    requiredRole: data.item.required_role,
  }
}

function compactPageLinkLabel(pageUrl: string) {
  try {
    const url = new URL(pageUrl)
    const path = url.pathname === '/' ? '' : url.pathname
    return `${url.hostname}${path}`.replace(/\/$/, '')
  } catch {
    return pageUrl.replace(/^https?:\/\//i, '')
  }
}

function getAttachmentExtension(attachment: ChecklistAttachment) {
  const source = attachment.original_name || attachment.file_url || attachment.file_path || ''
  const cleanSource = source.split('?')[0]
  const lastDot = cleanSource.lastIndexOf('.')
  if (lastDot < 0) {
    return ''
  }
  return cleanSource.slice(lastDot).toLowerCase()
}

function isImageAttachment(attachment: ChecklistAttachment) {
  const mimeType = (attachment.mime_type || '').toLowerCase()
  if (mimeType.startsWith('image/')) {
    return true
  }
  return IMAGE_EXTENSIONS.has(getAttachmentExtension(attachment))
}

function isVideoAttachment(attachment: ChecklistAttachment) {
  const mimeType = (attachment.mime_type || '').toLowerCase()
  if (mimeType.startsWith('video/')) {
    return true
  }
  return VIDEO_EXTENSIONS.has(getAttachmentExtension(attachment))
}

function buildAttachmentMeta(attachment: ChecklistAttachment) {
  return [
    attachment.uploaded_by_name || 'Unknown uploader',
    attachment.created_at ? formatDateTime(attachment.created_at, attachment.created_at_iso) : null,
    attachment.file_size ? formatFileSize(attachment.file_size) : null,
  ].filter(Boolean).join(' | ')
}

function ChecklistItemActionMenu({
  open,
  anchorElement,
  menuId,
  itemTitle,
  pending,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean
  anchorElement: HTMLButtonElement | null
  menuId: string
  itemTitle: string
  pending: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<MenuPosition | null>(null)

  const updatePosition = useCallback(() => {
    if (!open || !anchorElement || typeof window === 'undefined') {
      return
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const margin = 8
    const gap = 8
    const anchorRect = anchorElement.getBoundingClientRect()
    const measuredHeight = menuRef.current?.offsetHeight ?? Math.min(220, Math.round(viewportHeight * 0.35))
    const width = Math.min(Math.max(228, anchorRect.width + 164), Math.max(220, viewportWidth - margin * 2))
    const spaceBelow = Math.max(viewportHeight - anchorRect.bottom - margin - gap, 0)
    const spaceAbove = Math.max(anchorRect.top - margin - gap, 0)
    const openUpward = spaceBelow < measuredHeight && spaceAbove > spaceBelow
    const maxHeight = Math.max(Math.min(openUpward ? spaceAbove : spaceBelow, 320), 120)
    const visibleHeight = Math.min(measuredHeight, maxHeight)
    const left = Math.min(
      Math.max(anchorRect.right - width, margin),
      Math.max(margin, viewportWidth - width - margin),
    )
    const top = openUpward
      ? Math.max(margin, anchorRect.top - visibleHeight - gap)
      : Math.min(anchorRect.bottom + gap, Math.max(margin, viewportHeight - visibleHeight - margin))

    setPosition({
      top,
      left,
      width,
      maxHeight,
      placement: openUpward ? 'top' : 'bottom',
    })
  }, [anchorElement, open])

  useEffect(() => {
    if (!open) {
      return
    }

    let frameId = 0
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(updatePosition)
    }

    scheduleUpdate()
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, true)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (target && (menuRef.current?.contains(target) || anchorElement?.contains(target))) {
        return
      }
      onClose()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [anchorElement, onClose, open])

  if (!open || !anchorElement || typeof document === 'undefined') {
    return null
  }

  const style: CSSProperties = position
    ? {
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        maxHeight: `${position.maxHeight}px`,
      }
    : {
        top: '0',
        left: '0',
        width: '228px',
        visibility: 'hidden',
      }

  return createPortal(
    <div
      ref={menuRef}
      id={menuId}
      className={`checklist-assignee-menu checklist-item-action-menu ${position?.placement === 'top' ? 'checklist-assignee-menu--top' : 'checklist-assignee-menu--bottom'}`}
      role="menu"
      aria-label={`Actions for ${itemTitle}`}
      style={style}
    >
      <div className="checklist-assignee-menu__header">
        <strong>Item actions</strong>
        <span>{itemTitle}</span>
      </div>
      <div className="checklist-assignee-menu__list">
        <button
          type="button"
          className="checklist-assignee-menu__option checklist-item-action-menu__option"
          role="menuitem"
          disabled={pending}
          onClick={() => {
            onClose()
            onEdit()
          }}
        >
          <span className="checklist-item-action-menu__icon" aria-hidden="true">
            <Icon name="checklist" />
          </span>
          <span className="checklist-item-action-menu__copy">
            <strong>Edit item</strong>
            <small>Open the manager edit tab for this checklist item.</small>
          </span>
        </button>
        <button
          type="button"
          className="checklist-assignee-menu__option checklist-item-action-menu__option is-danger"
          role="menuitem"
          disabled={pending}
          onClick={() => {
            onClose()
            onDelete()
          }}
        >
          <span className="checklist-item-action-menu__icon" aria-hidden="true">
            <Icon name="alert" />
          </span>
          <span className="checklist-item-action-menu__copy">
            <strong>Delete item</strong>
            <small>Remove it from the batch after a confirmation prompt.</small>
          </span>
        </button>
      </div>
    </div>,
    document.body,
  )
}

export function ChecklistItemDetailPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { activeOrgId, activeScope, getMembershipForOrg, session } = useAuth()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [data, setData] = useState<ChecklistItemDetailResponse | null>(null)
  const [draft, setDraft] = useState<ItemDraftState | null>(null)
  const [assignmentUserId, setAssignmentUserId] = useState('0')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<ItemTab>('overview')
  const [actionMenuAnchor, setActionMenuAnchor] = useState<HTMLButtonElement | null>(null)
  const [lightboxAttachment, setLightboxAttachment] = useState<ChecklistAttachment | null>(null)
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [statusDraft, setStatusDraft] = useState('open')

  const numericItemId = Number(itemId)
  const itemMembership = data ? getMembershipForOrg(data.item.org_id) : null
  const canManageItem = canManageChecklist(session, itemMembership)

  const load = useCallback(async () => {
    if (!session?.accessToken || (activeScope === 'org' && !activeOrgId) || activeScope === 'none' || !numericItemId) {
      setData(null)
      return
    }

    const result = await fetchChecklistItem(session.accessToken, activeScope === 'org' ? activeOrgId : null, numericItemId)
    setData(result)
    setDraft(buildDraft(result))
    setAssignmentUserId(`${result.item.assigned_to_user_id ?? 0}`)
    setStatusDraft(result.item.status)
  }, [activeOrgId, activeScope, numericItemId, session?.accessToken])

  useEffect(() => {
    const run = async () => {
      if (!session?.accessToken || (activeScope === 'org' && !activeOrgId) || activeScope === 'none' || !numericItemId) {
        setData(null)
        return
      }

      try {
        await load()
        setError('')
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load checklist item detail.'))
      }
    }

    void run()
  }, [activeOrgId, activeScope, load, numericItemId, session?.accessToken])

  useEffect(() => {
    if (!canManageItem && activeTab === 'edit') {
      setActiveTab('overview')
    }
    if (!canManageItem) {
      setActionMenuAnchor(null)
    }
  }, [activeTab, canManageItem])

  useEffect(() => {
    if (!lightboxAttachment) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxAttachment(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxAttachment])

  if (!numericItemId) {
    return <EmptySection title="Checklist Item" message="Checklist item id is invalid." />
  }

  if (!data && !error) {
    return <LoadingSection title="Checklist Item" subtitle={`Item #${numericItemId}`} />
  }

  const assignableTesters = data?.assignable_testers ?? []
  const hasAssignmentChanged = Number(assignmentUserId) !== (data?.item.assigned_to_user_id ?? 0)
  const lightboxAttachmentUrl = lightboxAttachment ? getChecklistAttachmentUrl(lightboxAttachment) : ''
  const imageAttachments = data?.attachments.filter(isImageAttachment) ?? []
  const videoAttachments = data?.attachments.filter((attachment) => !isImageAttachment(attachment) && isVideoAttachment(attachment)) ?? []
  const fileAttachments = data?.attachments.filter((attachment) => !isImageAttachment(attachment) && !isVideoAttachment(attachment)) ?? []
  const historyEvents: HistoryEvent[] = data ? [
    {
      id: 'created',
      title: 'Item created',
      detail: `Created by ${data.item.created_by_name}`,
      value: data.item.created_at,
      isoValue: data.item.created_at_iso,
    },
    ...(data.item.updated_at ? [{
      id: 'updated',
      title: 'Item updated',
      detail: `Last edited by ${data.item.updated_by_name || 'a team member'}`,
      value: data.item.updated_at,
      isoValue: data.item.updated_at_iso,
    }] : []),
    ...(data.item.started_at ? [{
      id: 'started',
      title: 'Work started',
      detail: 'Checklist execution moved into progress.',
      value: data.item.started_at,
      isoValue: data.item.started_at_iso,
    }] : []),
    ...(data.item.completed_at ? [{
      id: 'completed',
      title: `Marked ${formatStatusLabel(data.item.status)}`,
      detail: 'Testing on this item reached its latest completion state.',
      value: data.item.completed_at,
      isoValue: data.item.completed_at_iso,
    }] : []),
  ] : []

  const handleAssignmentSave = async () => {
    if (!session?.accessToken || !data || !hasAssignmentChanged) {
      return
    }

    setIsSavingAssignment(true)
    setError('')
    setMessage('')

    try {
      await updateChecklistItem(session.accessToken, data.item.org_id, data.item.id, {
        assigned_to_user_id: Number(assignmentUserId) || 0,
      })
      await load()
      setMessage(Number(assignmentUserId) > 0 ? 'Checklist item assigned to QA Tester.' : 'Checklist item unassigned.')
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save checklist assignment.'))
    } finally {
      setIsSavingAssignment(false)
    }
  }

  const handleEditSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.accessToken || !data || !draft) {
      return
    }

    setIsSavingEdit(true)
    setError('')
    setMessage('')

    try {
      await updateChecklistItem(session.accessToken, data.item.org_id, data.item.id, {
        sequence_no: Math.max(1, Number(draft.sequenceNo) || data.item.sequence_no),
        title: draft.title.trim(),
        module_name: draft.moduleName.trim(),
        submodule_name: draft.submoduleName.trim(),
        description: draft.description.trim(),
        priority: draft.priority,
        required_role: draft.requiredRole,
      })
      await load()
      setActiveTab('overview')
      setMessage('Checklist item updated.')
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update checklist item.'))
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleStatusSave = async () => {
    if (!session?.accessToken || !data) {
      return
    }

    if (statusDraft === data.item.status) {
      return
    }

    setIsSavingStatus(true)
    setError('')
    setMessage('')

    try {
      await updateChecklistItemStatus(session.accessToken, data.item.org_id, data.item.id, statusDraft)
      await load()
      setMessage('Status updated.')
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update status.'))
    } finally {
      setIsSavingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!session?.accessToken || !data) {
      return
    }

    const confirmed = window.confirm(`Delete checklist item "${data.item.title}"?`)
    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setError('')
    setMessage('')

    try {
      await deleteChecklistItem(session.accessToken, data.item.org_id, data.item.id)
      navigate(`/app/checklist/batches/${data.item.batch_id}`, { replace: true })
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete checklist item.'))
      setIsDeleting(false)
    }
  }

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!session?.accessToken || !data || !numericItemId || files.length === 0) {
      return
    }

    setIsUploadingAttachments(true)
    setError('')
    setMessage('')
    try {
      const result = await uploadChecklistItemAttachments(session.accessToken, data.item.org_id, numericItemId, files)
      setData((current) => current ? { ...current, attachments: result.attachments } : current)
      setMessage(result.uploaded_count === 1 ? '1 attachment uploaded.' : `${result.uploaded_count} attachments uploaded.`)
      await load()
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Unable to upload attachments.'))
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setIsUploadingAttachments(false)
    }
  }

  if (!data) {
    return (
      <div className="page-stack checklist-item-page">
        {error ? <FormMessage tone="error" onDismiss={() => setError('')}>{error}</FormMessage> : null}
      </div>
    )
  }

  const pageSubtitle = [
    data.item.project_name || 'Checklist item',
    data.item.batch_title || `Batch #${data.item.batch_id}`,
  ].filter(Boolean).join(' | ')
  const tabs: Array<{ id: ItemTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'history', label: 'History' },
    ...(canManageItem ? [{ id: 'edit' as const, label: 'Edit' }] : []),
  ]

  return (
    <div className="page-stack checklist-item-page">
      {message ? <FormMessage tone="success" onDismiss={() => setMessage('')}>{message}</FormMessage> : null}
      {error ? <FormMessage tone="error" onDismiss={() => setError('')}>{error}</FormMessage> : null}

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        multiple
        accept="image/*,video/mp4,video/webm,video/quicktime"
        onChange={(event) => void handleAttachmentUpload(event)}
      />

      {data ? (
        <>
          <section className="section-card checklist-batch-hero-card checklist-item-hero">
            <div className="section-card__body checklist-batch-hero-card__body checklist-item-hero__body">
              <div className="checklist-item-hero__eyebrow-row">
                <p className="eyebrow">{data.item.org_name || 'Organization'}</p>
                <span className="pill checklist-item-hero__sequence-pill">Item {data.item.sequence_no}</span>
              </div>

              <div className="checklist-item-hero__header">
                <div className="checklist-batch-hero-card__copy">
                  <h2>{data.item.title}</h2>
                  <p className="checklist-batch-hero-card__meta-line">{pageSubtitle}</p>
                </div>

                <div className="checklist-item-hero__header-actions">
                  <Link className="inline-link" to={`/app/checklist/batches/${data.item.batch_id}`}>
                    Back to batch
                  </Link>
                  {canManageItem ? (
                    <button
                      type="button"
                      className={`checklist-item-hero__menu-button ${actionMenuAnchor ? 'is-open' : ''}`}
                      aria-haspopup="menu"
                      aria-expanded={Boolean(actionMenuAnchor)}
                      aria-controls={actionMenuAnchor ? `checklist-item-action-menu-${data.item.id}` : undefined}
                      aria-label="Open item actions"
                      onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                        setError('')
                        setMessage('')
                        setActionMenuAnchor((current) => (current ? null : event.currentTarget))
                      }}
                    >
                      <Icon name="more-vertical" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="checklist-batch-hero-card__chips checklist-item-hero__chips">
                <span className="pill pill--dark checklist-batch-hero-card__pill">
                  <Icon name="activity" />
                  {formatStatusLabel(data.item.status)}
                </span>
                <span className="pill checklist-batch-hero-card__pill">
                  <Icon name="alert" />
                  {formatStatusLabel(data.item.priority)} priority
                </span>
                <span className="pill checklist-batch-hero-card__pill">
                  <Icon name="shield" />
                  {data.item.required_role}
                </span>
                {data.item.batch_page_url ? (
                  <a
                    className="pill checklist-batch-hero-card__pill checklist-batch-hero-card__pill--link"
                    href={data.item.batch_page_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={data.item.batch_page_url}
                  >
                    <Icon name="globe" />
                    <span className="checklist-batch-hero-card__pill-label">{compactPageLinkLabel(data.item.batch_page_url)}</span>
                  </a>
                ) : (
                  <span className="pill checklist-batch-hero-card__pill">
                    <Icon name="globe" />
                    No page link
                  </span>
                )}
                <span className="pill checklist-batch-hero-card__pill">
                  <Icon name="image" />
                  {data.attachments.length} evidence
                </span>
                {data.item.issue_id ? (
                  <Link className="pill checklist-batch-hero-card__pill checklist-batch-hero-card__pill--link" to={`/app/reports/${data.item.issue_id}`}>
                    <Icon name="chat" />
                    <span className="checklist-batch-hero-card__pill-label">Issue #{data.item.issue_id}</span>
                  </Link>
                ) : (
                  <span className="pill checklist-batch-hero-card__pill">
                    <Icon name="chat" />
                    No linked issue
                  </span>
                )}
              </div>

              <div className="checklist-batch-hero-card__footer checklist-item-hero__footer">
                <article className="checklist-batch-hero-card__footer-item">
                  <span>
                    <Icon name="checklist" />
                    Module
                  </span>
                  <strong>{data.item.module_name}</strong>
                </article>
                <article className="checklist-batch-hero-card__footer-item">
                  <span>
                    <Icon name="checklist" />
                    Submodule
                  </span>
                  <strong>{data.item.submodule_name || 'None'}</strong>
                </article>
                <article className="checklist-batch-hero-card__footer-item">
                  <span>
                    <Icon name="users" />
                    Assignee
                  </span>
                  <strong>{data.item.assigned_to_name || 'Unassigned'}</strong>
                </article>
                <article className="checklist-batch-hero-card__footer-item">
                  <span>
                    <Icon name="organization" />
                    Batch status
                  </span>
                  <strong>{formatStatusLabel(data.item.batch_status || 'Unknown')}</strong>
                </article>
              </div>
            </div>
          </section>

          <div className="checklist-item-tabs" role="tablist" aria-label="Checklist item sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                className={`reports-segmented__button checklist-item-tabs__button ${activeTab === tab.id ? 'is-active' : ''}`}
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === 'overview' ? (
            <>
              <SectionCard title="Description" subtitle={data.item.full_title}>
                <p className="body-copy checklist-item-description">{data.item.description || 'No description added yet.'}</p>
              </SectionCard>

              <SectionCard title="Workflow" subtitle="Quick updates stay separate from full editing">
                <div className="checklist-item-overview-grid">
                  <article className="checklist-item-inline-card">
                    <span className="checklist-item-inline-card__label">Status</span>
                    <div className="action-row">
                      <select
                        className="select-inline"
                        value={statusDraft}
                        onChange={(event) => setStatusDraft(event.target.value)}
                        disabled={isSavingStatus}
                      >
                        {CHECKLIST_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="button button--primary"
                        onClick={() => void handleStatusSave()}
                        disabled={isSavingStatus || statusDraft === data.item.status}
                      >
                        {isSavingStatus ? 'Updating...' : 'Update Status'}
                      </button>
                    </div>
                  </article>

                  <article className="checklist-item-inline-card">
                    <span className="checklist-item-inline-card__label">Ownership</span>
                    {canManageItem ? (
                      <div className="action-row">
                        <select
                          className="select-inline"
                          value={assignmentUserId}
                          onChange={(event) => setAssignmentUserId(event.target.value)}
                          disabled={isSavingAssignment}
                        >
                          <option value="0">Unassigned</option>
                          {assignableTesters.map((member) => (
                            <option key={member.user_id} value={member.user_id}>
                              {member.username}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="button button--primary"
                          onClick={() => void handleAssignmentSave()}
                          disabled={isSavingAssignment || !hasAssignmentChanged}
                        >
                          {isSavingAssignment ? 'Saving...' : 'Save assignment'}
                        </button>
                      </div>
                    ) : (
                      <div className="checklist-item-inline-card__stack">
                        <strong>{data.item.assigned_to_name || 'Unassigned'}</strong>
                        <small>Required role: {data.item.required_role}</small>
                      </div>
                    )}
                    {canManageItem && assignableTesters.length === 0 ? (
                      <p className="body-copy">No QA Tester members are available in this organization.</p>
                    ) : null}
                  </article>
                </div>

                {data.item.issue_id ? (
                  <p className="checklist-detail-note">
                    Linked issue #{data.item.issue_id} is already connected to this item.
                    <Link className="inline-link" to={`/app/reports/${data.item.issue_id}`}>
                      Open linked issue
                    </Link>
                  </p>
                ) : null}
              </SectionCard>

              <SectionCard title="Details" subtitle="Read-only context for the tester">
                <div className="detail-pairs">
                  <DetailPair label="Sequence" value={`${data.item.sequence_no}`} />
                  <DetailPair label="Organization" value={data.item.org_name || 'Organization'} />
                  <DetailPair label="Status" value={formatStatusLabel(data.item.status)} />
                  <DetailPair label="Priority" value={formatStatusLabel(data.item.priority)} />
                  <DetailPair label="Required Role" value={data.item.required_role} />
                  <DetailPair label="Module" value={data.item.module_name} />
                  <DetailPair label="Submodule" value={data.item.submodule_name || 'None'} />
                  <DetailPair label="Assignee" value={data.item.assigned_to_name || 'Unassigned'} />
                </div>
              </SectionCard>

              <SectionCard title="Links" subtitle="Jump back to the tested context">
                <div className="checklist-item-link-grid">
                  <article className="checklist-item-link-card">
                    <span className="checklist-item-inline-card__label">Tested page</span>
                    {data.item.batch_page_url ? (
                      <a className="inline-link" href={data.item.batch_page_url} target="_blank" rel="noreferrer noopener">
                        {compactPageLinkLabel(data.item.batch_page_url)}
                      </a>
                    ) : (
                      <p className="body-copy">No tested page link was saved for this checklist batch yet.</p>
                    )}
                  </article>
                  <article className="checklist-item-link-card">
                    <span className="checklist-item-inline-card__label">Linked issue</span>
                    {data.item.issue_id ? (
                      <Link className="inline-link" to={`/app/reports/${data.item.issue_id}`}>
                        Open issue #{data.item.issue_id}
                      </Link>
                    ) : (
                      <p className="body-copy">No linked issue has been created for this item yet.</p>
                    )}
                  </article>
                </div>
              </SectionCard>
            </>
          ) : null}

          {activeTab === 'evidence' ? (
            <>
              <SectionCard title="Upload Evidence" subtitle="Screenshots, videos, and files stay grouped here">
                <div className="checklist-item-evidence-toolbar">
                  <p className="checklist-detail-note">
                    {data.attachments.length > 0
                      ? 'Existing uploads stay visible below so QA can review the latest proof without leaving the page.'
                      : 'Upload the proof files testers need to validate this checklist item.'}
                  </p>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAttachments}
                  >
                    {isUploadingAttachments ? 'Uploading...' : 'Upload Evidence'}
                  </button>
                </div>
              </SectionCard>

              {imageAttachments.length ? (
                <SectionCard title="Image Evidence" subtitle={`${imageAttachments.length} image${imageAttachments.length === 1 ? '' : 's'}`}>
                  <div className="checklist-batch-gallery checklist-item-gallery">
                    {imageAttachments.map((attachment) => {
                      const attachmentUrl = getChecklistAttachmentUrl(attachment)

                      return (
                        <button
                          key={attachment.id}
                          type="button"
                          className="checklist-item-gallery__button"
                          onClick={() => {
                            if (attachmentUrl) {
                              setLightboxAttachment(attachment)
                            }
                          }}
                        >
                          <img src={attachmentUrl} alt={attachment.original_name} loading="lazy" />
                          <span>{attachment.original_name}</span>
                          <small>{buildAttachmentMeta(attachment)}</small>
                        </button>
                      )
                    })}
                  </div>
                </SectionCard>
              ) : null}

              {videoAttachments.length ? (
                <SectionCard title="Video Evidence" subtitle={`${videoAttachments.length} video${videoAttachments.length === 1 ? '' : 's'}`}>
                  <div className="checklist-item-video-grid">
                    {videoAttachments.map((attachment) => {
                      const attachmentUrl = getChecklistAttachmentUrl(attachment)

                      return (
                        <article key={attachment.id} className="checklist-item-video-card">
                          <video controls preload="metadata">
                            <source src={attachmentUrl} type={attachment.mime_type || undefined} />
                          </video>
                          <div className="checklist-item-video-card__meta">
                            <strong>{attachment.original_name}</strong>
                            <small>{buildAttachmentMeta(attachment)}</small>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </SectionCard>
              ) : null}

              {fileAttachments.length ? (
                <SectionCard title="Files" subtitle={`${fileAttachments.length} attachment${fileAttachments.length === 1 ? '' : 's'}`}>
                  <div className="checklist-attachment-list">
                    {fileAttachments.map((attachment) => {
                      const attachmentUrl = getChecklistAttachmentUrl(attachment)

                      return (
                        <a
                          key={attachment.id}
                          className="checklist-attachment"
                          href={attachmentUrl || '#'}
                          target={attachmentUrl ? '_blank' : undefined}
                          rel={attachmentUrl ? 'noreferrer noopener' : undefined}
                        >
                          <strong>{attachment.original_name}</strong>
                          <span>{buildAttachmentMeta(attachment)}</span>
                        </a>
                      )
                    })}
                  </div>
                </SectionCard>
              ) : null}

              {!data.attachments.length ? (
                <SectionCard title="Evidence" subtitle="Nothing uploaded yet">
                  <p className="body-copy">No evidence uploaded for this item yet.</p>
                </SectionCard>
              ) : null}
            </>
          ) : null}

          {activeTab === 'history' ? (
            <SectionCard title="History" subtitle="Recent activity on this checklist item">
              {historyEvents.length ? (
                <ol className="checklist-item-timeline">
                  {historyEvents.map((event) => (
                    <li key={event.id} className="checklist-item-timeline__item">
                      <div className="checklist-item-timeline__dot" aria-hidden="true" />
                      <div className="checklist-item-timeline__content">
                        <strong>{event.title}</strong>
                        <p>{event.detail}</p>
                      </div>
                      <time className="checklist-item-timeline__time" dateTime={event.isoValue || undefined}>
                        {formatDateTime(event.value, event.isoValue)}
                      </time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="body-copy">No activity is available for this checklist item yet.</p>
              )}
            </SectionCard>
          ) : null}

          {canManageItem && activeTab === 'edit' ? (
            <SectionCard title="Edit Item" subtitle="Manager-only fields">
              {draft ? (
                <form className="inline-form checklist-item-edit-form" onSubmit={handleEditSave}>
                  <input
                    className="input-inline"
                    type="number"
                    min="1"
                    value={draft.sequenceNo}
                    onChange={(event) => setDraft((current) => (current ? { ...current, sequenceNo: event.target.value } : current))}
                    placeholder="Sequence number"
                    disabled={isSavingEdit}
                  />
                  <input
                    className="input-inline"
                    value={draft.title}
                    onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                    placeholder="Checklist item title"
                    disabled={isSavingEdit}
                  />
                  <input
                    className="input-inline"
                    value={draft.moduleName}
                    onChange={(event) => setDraft((current) => (current ? { ...current, moduleName: event.target.value } : current))}
                    placeholder="Module"
                    disabled={isSavingEdit}
                  />
                  <input
                    className="input-inline"
                    value={draft.submoduleName}
                    onChange={(event) => setDraft((current) => (current ? { ...current, submoduleName: event.target.value } : current))}
                    placeholder="Submodule"
                    disabled={isSavingEdit}
                  />
                  <select
                    className="select-inline"
                    value={draft.priority}
                    onChange={(event) => setDraft((current) => (current ? { ...current, priority: event.target.value } : current))}
                    disabled={isSavingEdit}
                  >
                    {CHECKLIST_PRIORITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatStatusLabel(option)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="select-inline"
                    value={draft.requiredRole}
                    onChange={(event) => setDraft((current) => (current ? { ...current, requiredRole: event.target.value } : current))}
                    disabled={isSavingEdit}
                  >
                    {CHECKLIST_REQUIRED_ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="textarea-inline"
                    value={draft.description}
                    onChange={(event) => setDraft((current) => (current ? { ...current, description: event.target.value } : current))}
                    placeholder="Description"
                    disabled={isSavingEdit}
                  />
                  <div className="button-row">
                    <button type="submit" className="button button--primary" disabled={isSavingEdit}>
                      {isSavingEdit ? 'Saving...' : 'Save changes'}
                    </button>
                    <button type="button" className="button button--ghost" disabled={isSavingEdit} onClick={() => setActiveTab('overview')}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </SectionCard>
          ) : null}

          <ChecklistItemActionMenu
            open={Boolean(canManageItem && actionMenuAnchor)}
            anchorElement={actionMenuAnchor}
            menuId={`checklist-item-action-menu-${data.item.id}`}
            itemTitle={data.item.title}
            pending={isDeleting}
            onClose={() => setActionMenuAnchor(null)}
            onEdit={() => setActiveTab('edit')}
            onDelete={() => {
              void handleDelete()
            }}
          />

          {lightboxAttachment && lightboxAttachmentUrl ? (
            <div className="checklist-evidence-lightbox" role="dialog" aria-modal="true" aria-label={lightboxAttachment.original_name}>
              <button
                type="button"
                className="checklist-evidence-lightbox__backdrop"
                aria-label="Close image preview"
                onClick={() => setLightboxAttachment(null)}
              />
              <div className="checklist-evidence-lightbox__dialog">
                <button
                  type="button"
                  className="checklist-evidence-lightbox__close"
                  aria-label="Close image preview"
                  onClick={() => setLightboxAttachment(null)}
                >
                  x
                </button>
                <img
                  className="checklist-evidence-lightbox__image"
                  src={lightboxAttachmentUrl}
                  alt={lightboxAttachment.original_name}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
