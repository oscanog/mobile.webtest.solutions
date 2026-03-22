export type IconName =
  | 'dashboard'
  | 'organization'
  | 'projects'
  | 'reports'
  | 'more'
  | 'bell'
  | 'shield'
  | 'checklist'
  | 'discord'
  | 'users'
  | 'spark'
  | 'settings'
  | 'logout'
  | 'arrow'
  | 'activity'
  | 'alert'
  | 'lock'
  | 'mail'
  | 'search'
  | 'globe'

export interface NavItem {
  label: string
  shortLabel?: string
  to: string
  icon: IconName
}

export interface DrawerItem {
  label: string
  to: string
  icon: IconName
  tone?: 'default' | 'danger'
}

export interface StatCardData {
  label: string
  value: string
  note: string
  tone: 'steel' | 'success' | 'alert'
}

export interface ActivityItem {
  title: string
  detail: string
  time: string
  tone: 'default' | 'success' | 'alert'
}

export interface OrgCardData {
  name: string
  owner: string
  members: number
  projects: number
  status: string
  summary: string
}

export interface ProjectCardData {
  name: string
  lead: string
  openIssues: number
  blockers: number
  dueLabel: string
  focus: string
}

export interface ReportCardData {
  title: string
  range: string
  insight: string
  status: string
  cta: string
}

export interface OpenClawSectionData {
  key: string
  title: string
  description: string
  badge: string
  items: string[]
}

export interface AppRouteDefinition {
  path: string
  title: string
  subtitle?: string
  navKey: 'dashboard' | 'organizations' | 'projects' | 'reports' | 'profile' | 'utility'
}

export interface LeaderboardItem {
  name: string
  issuesClosed: number
  projectsMoved: number
  checklistRate: number
}

export interface PieSegmentData {
  label: string
  value: number
  color: string
}

export interface DailyTrendPoint {
  day: string
  issues: number
  projects: number
  checklist: number
}

export interface IssueCardData {
  title: string
  severity: string
  owner: string
  status: string
  age: string
}

export interface NotificationItem {
  id: string
  title: string
  detail: string
  time: string
  read: boolean
  tone: 'default' | 'success' | 'alert'
}

export interface LandingFeatureData {
  title: string
  description: string
  icon: IconName
}

export const bottomNavItems: NavItem[] = [
  { label: 'Dashboard', shortLabel: 'Dash', to: '/app/dashboard', icon: 'dashboard' },
  { label: 'Organization', shortLabel: 'Org', to: '/app/organizations', icon: 'organization' },
  { label: 'Projects', shortLabel: 'Projects', to: '/app/projects', icon: 'projects' },
  { label: 'Issues', shortLabel: 'Issues', to: '/app/reports', icon: 'reports' },
  { label: 'Profile', shortLabel: 'Profile', to: '/app/profile', icon: 'users' },
]

export const drawerItems: DrawerItem[] = [
  { label: 'Super Admin', to: '/app/super-admin', icon: 'shield' },
  { label: 'Checklist', to: '/app/checklist', icon: 'checklist' },
  { label: 'Discord Link', to: '/app/discord-links', icon: 'discord' },
  { label: 'Manage Users', to: '/app/manage-users', icon: 'users' },
  { label: 'OpenClaw', to: '/app/openclaw', icon: 'spark' },
  { label: 'Settings', to: '/app/settings', icon: 'settings' },
  { label: 'Logout', to: '/login', icon: 'logout', tone: 'danger' },
]

export const appRoutes: AppRouteDefinition[] = [
  { path: '/app/dashboard', title: 'Dashboard', subtitle: 'Daily chart', navKey: 'dashboard' },
  { path: '/app/organizations', title: 'Organization', subtitle: 'Create + join', navKey: 'organizations' },
  { path: '/app/projects', title: 'Projects', subtitle: 'Active work', navKey: 'projects' },
  { path: '/app/reports', title: 'Issues', subtitle: 'Bug queue', navKey: 'reports' },
  { path: '/app/profile', title: 'Profile', subtitle: 'Account center', navKey: 'profile' },
  { path: '/app/notifications', title: 'Notifications', subtitle: 'In app inbox', navKey: 'utility' },
  { path: '/app/super-admin', title: 'Super Admin', subtitle: 'Control center', navKey: 'utility' },
  { path: '/app/openclaw', title: 'OpenClaw', subtitle: 'AI control', navKey: 'utility' },
  { path: '/app/manage-users', title: 'Manage Users', subtitle: 'Access map', navKey: 'utility' },
  { path: '/app/checklist', title: 'Checklist', subtitle: 'Release tasks', navKey: 'utility' },
  { path: '/app/discord-links', title: 'Discord Link', subtitle: 'Channel health', navKey: 'utility' },
  { path: '/app/settings', title: 'Settings', subtitle: 'App defaults', navKey: 'utility' },
]

export const landingFeatures: LandingFeatureData[] = [
  {
    title: 'Create Issues',
    description: 'Log bugs fast with clear details and ownership.',
    icon: 'checklist',
  },
  {
    title: 'Organize with Labels',
    description: 'Group bugs by priority and workflow stage.',
    icon: 'organization',
  },
  {
    title: 'Team Collaboration',
    description: 'Assign tasks and track progress across roles.',
    icon: 'users',
  },
]

export const dashboardStats: StatCardData[] = [
  { label: 'Issues', value: '37', note: '+12', tone: 'alert' },
  { label: 'Projects', value: '14', note: '+6', tone: 'steel' },
  { label: 'Checklist', value: '82%', note: '9 done', tone: 'success' },
]

export const leaderboard: LeaderboardItem[] = [
  { name: 'Local Dev Org', issuesClosed: 14, projectsMoved: 4, checklistRate: 92 },
  { name: 'Pilot Support Ops', issuesClosed: 11, projectsMoved: 3, checklistRate: 88 },
  { name: 'Campus QA Council', issuesClosed: 9, projectsMoved: 3, checklistRate: 83 },
  { name: 'Growth Squad', issuesClosed: 7, projectsMoved: 2, checklistRate: 78 },
]

export const dashboardPie: PieSegmentData[] = [
  { label: 'Issues', value: 46, color: '#e55a5a' },
  { label: 'Projects', value: 28, color: '#49627c' },
  { label: 'Checklist', value: 26, color: '#39b36b' },
]

export const dashboardTrend: DailyTrendPoint[] = [
  { day: 'Mon', issues: 8, projects: 4, checklist: 5 },
  { day: 'Tue', issues: 12, projects: 5, checklist: 6 },
  { day: 'Wed', issues: 10, projects: 6, checklist: 7 },
  { day: 'Thu', issues: 15, projects: 7, checklist: 8 },
  { day: 'Fri', issues: 11, projects: 5, checklist: 7 },
  { day: 'Sat', issues: 6, projects: 3, checklist: 4 },
  { day: 'Sun', issues: 9, projects: 4, checklist: 6 },
]

export const organizations: OrgCardData[] = [
  {
    name: 'Local Dev Org',
    owner: 'superadmin',
    members: 16,
    projects: 5,
    status: 'Healthy',
    summary: 'Core workspace',
  },
  {
    name: 'Campus QA Council',
    owner: 'qa.captain',
    members: 9,
    projects: 3,
    status: 'Review',
    summary: 'Policy updates',
  },
  {
    name: 'Pilot Support Ops',
    owner: 'support.lead',
    members: 12,
    projects: 4,
    status: 'Growing',
    summary: 'New intake team',
  },
]

export const projects: ProjectCardData[] = [
  {
    name: 'Mobile Web Launch',
    lead: 'A. Reyes',
    openIssues: 18,
    blockers: 2,
    dueLabel: 'Due this week',
    focus: 'Shell + auth + nav',
  },
  {
    name: 'OpenClaw Runtime',
    lead: 'M. Vines',
    openIssues: 11,
    blockers: 1,
    dueLabel: 'Due in 9 days',
    focus: 'Providers + queues',
  },
  {
    name: 'Checklist API Parity',
    lead: 'L. Santos',
    openIssues: 7,
    blockers: 0,
    dueLabel: 'On track',
    focus: 'Attachment flow',
  },
]

export const reports: ReportCardData[] = [
  { title: 'Duplicate login issue', range: 'Critical', insight: 'Owner: superadmin', status: 'Open', cta: 'View' },
  { title: 'Checklist sync delay', range: 'High', insight: 'Owner: qa.captain', status: 'Watch', cta: 'View' },
  { title: 'OpenClaw retry spike', range: 'Medium', insight: 'Owner: support.lead', status: 'Queued', cta: 'View' },
]

export const issuesSummary: StatCardData[] = [
  { label: 'Open', value: '72', note: '13 critical', tone: 'alert' },
  { label: 'Resolved', value: '25', note: 'today', tone: 'success' },
  { label: 'Owners', value: '8', note: 'active', tone: 'steel' },
]

export const openClawSections: OpenClawSectionData[] = [
  {
    key: 'runtime',
    title: 'Runtime',
    description: 'Config + state',
    badge: 'Live',
    items: ['Desired v24', 'Applied v23', 'Gateway healthy'],
  },
  {
    key: 'providers',
    title: 'Providers',
    description: 'Model sources',
    badge: '3 enabled',
    items: ['OpenAI default', 'Anthropic enabled', 'DeepSeek standby'],
  },
  {
    key: 'channels',
    title: 'Channels',
    description: 'Discord routes',
    badge: '8 linked',
    items: ['qa-intake live', 'ops-alerts mirrored', 'DM route restricted'],
  },
  {
    key: 'requests',
    title: 'Requests',
    description: 'Queue pulse',
    badge: '42 today',
    items: ['7 waiting review', 'Median 2m 11s', '1 project high retries'],
  },
]

export const profileSummary: StatCardData[] = [
  { label: 'Role', value: 'Super', note: 'admin', tone: 'steel' },
  { label: 'Teams', value: '4', note: 'active', tone: 'success' },
  { label: 'Alerts', value: '3', note: 'pending', tone: 'alert' },
]

export const notificationItems: NotificationItem[] = [
  {
    id: 'notif-runtime-reload',
    title: 'Runtime reload approved',
    detail: 'OpenClaw config v24 is ready.',
    time: '2m ago',
    read: false,
    tone: 'success',
  },
  {
    id: 'notif-critical-assigned',
    title: 'Critical issue assigned',
    detail: 'Duplicate login issue moved to superadmin.',
    time: '12m ago',
    read: false,
    tone: 'alert',
  },
  {
    id: 'notif-checklist-closed',
    title: 'Checklist batch closed',
    detail: 'Mobile shell QA passed review.',
    time: '28m ago',
    read: true,
    tone: 'default',
  },
  {
    id: 'notif-discord-synced',
    title: 'Discord route synced',
    detail: 'ops-alerts is healthy again.',
    time: '1h ago',
    read: true,
    tone: 'success',
  },
]
