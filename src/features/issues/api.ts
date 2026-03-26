import { requestJson, withOrgQuery } from '../../lib/api'

export type WorkflowStatus =
  | 'unassigned'
  | 'with_senior'
  | 'with_junior'
  | 'done_by_junior'
  | 'with_qa'
  | 'with_senior_qa'
  | 'with_qa_lead'
  | 'approved'
  | 'rejected'
  | 'closed'

type IssueStatusFilter = 'all' | 'open' | 'closed'

const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  unassigned: 'Unassigned',
  with_senior: 'With Senior',
  with_junior: 'With Junior',
  done_by_junior: 'Ready for QA',
  with_qa: 'With QA',
  with_senior_qa: 'With Senior QA',
  with_qa_lead: 'With QA Lead',
  approved: 'Approved',
  rejected: 'Rejected',
  closed: 'Closed',
}

export interface IssueLabel {
  id: number
  name: string
  description: string
  color: string
}

export interface IssueAttachment {
  id: number
  file_path: string
  original_name: string
  mime_type: string
  file_size: number
  uploaded_at: string
  uploaded_at_iso?: string | null
}

interface RawIssueRecord {
  id: number
  org_id: number
  org_name: string
  title: string
  description: string
  status?: string
  workflow_status?: string | null
  assign_status?: string | null
  author_id: number
  author_username: string
  pm_id: number
  assigned_dev_id: number
  assigned_junior_id: number
  assigned_qa_id: number
  assigned_senior_qa_id: number
  assigned_qa_lead_id: number
  assigned_at: string
  assigned_at_iso?: string | null
  junior_assigned_at: string
  junior_assigned_at_iso?: string | null
  junior_done_at: string
  junior_done_at_iso?: string | null
  qa_assigned_at: string
  qa_assigned_at_iso?: string | null
  senior_qa_assigned_at: string
  senior_qa_assigned_at_iso?: string | null
  qa_lead_assigned_at: string
  qa_lead_assigned_at_iso?: string | null
  created_at: string
  created_at_iso?: string | null
  labels?: IssueLabel[]
  attachments?: IssueAttachment[]
}

export interface IssueRecord extends Omit<RawIssueRecord, 'status' | 'workflow_status' | 'assign_status' | 'labels' | 'attachments'> {
  status: 'open' | 'closed'
  workflow_status: WorkflowStatus
  assign_status: WorkflowStatus
  labels: IssueLabel[]
  attachments: IssueAttachment[]
}

interface RawIssuesResponse {
  org: {
    org_id: number | null
    org_name: string
    org_role: string
    is_org_owner: boolean
    system_role: string
  }
  scope: string
  status: string
  filters: {
    author: number | null
    label: number | null
  }
  counts: {
    open: number
    closed: number
  }
  issues: RawIssueRecord[]
}

export interface IssuesResponse extends Omit<RawIssuesResponse, 'status' | 'issues'> {
  status: IssueStatusFilter
  issues: IssueRecord[]
}

interface RawIssueDetailResponse {
  org: {
    org_id: number | null
    org_name: string
    org_role: string
    is_org_owner: boolean
    system_role: string
  }
  issue: RawIssueRecord
}

export interface IssueDetailResponse extends Omit<RawIssueDetailResponse, 'issue'> {
  issue: IssueRecord
}

export function normalizeWorkflowStatus(value: string | null | undefined): WorkflowStatus {
  const normalized = (value ?? '').trim()
  if (normalized === 'junior_done') {
    return 'done_by_junior'
  }
  if (normalized in WORKFLOW_LABELS) {
    return normalized as WorkflowStatus
  }
  return 'unassigned'
}

export function formatIssueWorkflowLabel(value: string | null | undefined): string {
  return WORKFLOW_LABELS[normalizeWorkflowStatus(value)]
}

function toIssueStatus(workflowStatus: WorkflowStatus, legacyStatus: string | undefined): 'open' | 'closed' {
  if (workflowStatus === 'closed' || legacyStatus === 'closed') {
    return 'closed'
  }
  return 'open'
}

function normalizeIssueRecord(issue: RawIssueRecord): IssueRecord {
  const workflowStatus = normalizeWorkflowStatus(issue.workflow_status ?? issue.assign_status)
  return {
    ...issue,
    status: toIssueStatus(workflowStatus, issue.status),
    workflow_status: workflowStatus,
    assign_status: workflowStatus,
    labels: issue.labels ?? [],
    attachments: issue.attachments ?? [],
  }
}

function normalizeIssuesResponse(response: RawIssuesResponse, status: IssueStatusFilter): IssuesResponse {
  return {
    ...response,
    status,
    issues: response.issues.map(normalizeIssueRecord),
  }
}

function normalizeIssueDetailResponse(response: RawIssueDetailResponse): IssueDetailResponse {
  return {
    ...response,
    issue: normalizeIssueRecord(response.issue),
  }
}

async function fetchIssuesByFilter(accessToken: string, orgId?: number | null, status: Exclude<IssueStatusFilter, 'all'> = 'open') {
  const path = withOrgQuery('/issues', orgId)
  const response = await requestJson<RawIssuesResponse>(
    `${path}${path.includes('?') ? '&' : '?'}status=${status}`,
    { method: 'GET' },
    accessToken,
  )
  return normalizeIssuesResponse(response, status)
}

export async function fetchIssues(accessToken: string, orgId?: number | null, status: IssueStatusFilter = 'all') {
  if (status !== 'all') {
    return fetchIssuesByFilter(accessToken, orgId, status)
  }

  const [openResult, closedResult] = await Promise.all([
    fetchIssuesByFilter(accessToken, orgId, 'open'),
    fetchIssuesByFilter(accessToken, orgId, 'closed'),
  ])

  const merged = new Map<number, IssueRecord>()
  ;[...openResult.issues, ...closedResult.issues].forEach((issue) => {
    merged.set(issue.id, issue)
  })

  const issues = Array.from(merged.values()).sort((left, right) => {
    const leftDate = left.created_at_iso ?? left.created_at
    const rightDate = right.created_at_iso ?? right.created_at
    return new Date(rightDate).getTime() - new Date(leftDate).getTime()
  })

  return {
    ...openResult,
    status: 'all' as const,
    counts: {
      open: openResult.counts.open,
      closed: openResult.counts.closed || closedResult.counts.closed,
    },
    issues,
  }
}

export async function fetchIssue(accessToken: string, orgId: number | null | undefined, issueId: number) {
  const response = await requestJson<RawIssueDetailResponse>(withOrgQuery(`/issues/${issueId}`, orgId), { method: 'GET' }, accessToken)
  return normalizeIssueDetailResponse(response)
}

export function createIssue(
  accessToken: string,
  payload: { org_id: number; title: string; description?: string; labels?: number[] },
  images: File[] = [],
) {
  if (images.length > 0) {
    const formData = new FormData()
    formData.set('org_id', `${payload.org_id}`)
    formData.set('title', payload.title)
    if (payload.description?.trim()) {
      formData.set('description', payload.description.trim())
    }
    ;(payload.labels ?? []).forEach((labelId) => {
      formData.append('labels[]', `${labelId}`)
    })
    images.forEach((file) => {
      formData.append('images[]', file)
    })

    return requestJson<{ issue: RawIssueRecord }>(
      '/issues',
      {
        method: 'POST',
        body: formData,
      },
      accessToken,
    ).then((response) => ({
      issue: normalizeIssueRecord(response.issue),
    }))
  }

  return requestJson<{ issue: RawIssueRecord }>(
    '/issues',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    accessToken,
  ).then((response) => ({
    issue: normalizeIssueRecord(response.issue),
  }))
}

export function performIssueAction(
  accessToken: string,
  issueId: number,
  action: string,
  payload: Record<string, unknown>,
) {
  return requestJson<{ issue: RawIssueRecord }>(
    `/issues/${issueId}/${action}`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    accessToken,
  ).then((response) => ({
    issue: normalizeIssueRecord(response.issue),
  }))
}

export function deleteIssue(accessToken: string, issueId: number, orgId: number) {
  return requestJson<{ deleted: boolean; issue_id: number }>(
    `/issues/${issueId}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ org_id: orgId }),
    },
    accessToken,
  )
}
