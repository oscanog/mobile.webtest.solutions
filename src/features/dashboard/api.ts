import { requestJson, withOrgQuery } from '../../lib/api'
import { normalizeWorkflowStatus, type WorkflowStatus } from '../issues/api'

export interface DashboardSummary {
  open_issues: number
  closed_issues: number
  active_projects: number
  checklist_open_items: number
  unread_notifications: number
}

export interface DashboardTrendPoint {
  day: string
  issues: number
  projects: number
  checklist: number
}

interface RawDashboardRecentIssue {
  id: number
  org_id: number
  org_name: string
  title: string
  status: string
  workflow_status?: string | null
  assign_status?: string | null
  author_username: string
}

export interface DashboardRecentIssue extends Omit<RawDashboardRecentIssue, 'status' | 'workflow_status' | 'assign_status'> {
  status: 'open' | 'closed'
  workflow_status: WorkflowStatus
  assign_status: WorkflowStatus
}

export interface DashboardQaLeadChecklistRow {
  user_id: number | null
  display_name: string
  assigned_items: number
  open_items: number
  is_unassigned: boolean
}

export interface DashboardQaLeadChecklistProject {
  project_id: number
  project_name: string
  assigned_items: number
  open_items: number
  testers: DashboardQaLeadChecklistRow[]
}

export interface DashboardQaLeadChecklistSummary {
  org_totals: DashboardQaLeadChecklistRow[]
  projects: DashboardQaLeadChecklistProject[]
}

export interface DashboardOrgContext {
  org_id: number | null
  org_name: string
  org_role: string
  org_owner_id: number
  is_org_owner: boolean
  user_id: number
  system_role: string
  active_scope?: string
}

interface RawDashboardSummaryResponse {
  org: DashboardOrgContext
  scope: string
  summary: DashboardSummary
  trend: DashboardTrendPoint[]
  recent_issues: RawDashboardRecentIssue[]
  qa_lead_checklist: DashboardQaLeadChecklistSummary | null
}

export interface DashboardSummaryResponse extends Omit<RawDashboardSummaryResponse, 'recent_issues'> {
  recent_issues: DashboardRecentIssue[]
}

function normalizeRecentIssue(issue: RawDashboardRecentIssue): DashboardRecentIssue {
  const workflowStatus = normalizeWorkflowStatus(issue.workflow_status ?? issue.assign_status)
  return {
    ...issue,
    status: workflowStatus === 'closed' || issue.status === 'closed' ? 'closed' : 'open',
    workflow_status: workflowStatus,
    assign_status: workflowStatus,
  }
}

export async function fetchDashboardSummary(accessToken: string, orgId?: number | null) {
  const response = await requestJson<RawDashboardSummaryResponse>(withOrgQuery('/dashboard/summary', orgId), { method: 'GET' }, accessToken)
  return {
    ...response,
    recent_issues: response.recent_issues.map(normalizeRecentIssue),
  }
}
