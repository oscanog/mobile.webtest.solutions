import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  dashboardPie,
  dashboardStats,
  dashboardTrend,
  issuesSummary,
  landingFeatures,
  leaderboard,
  openClawSections,
  projects,
  reports,
  type OpenClawSectionData,
} from './app-data'
import { useAuth } from './auth-context'
import { AuthLayout } from './components/auth-layout'
import {
  AuthField,
  BrandMark,
  DetailPair,
  Icon,
  ListRow,
  SectionCard,
  StatCard,
  StatusTile,
  ThemeToggle,
} from './components/ui'
import { LegacyHeroAnimation } from './components/legacy-hero-animation'
import { useNotifications } from './notifications-context'

const LEGACY_LANDING_BG =
  'https://i.pinimg.com/1200x/b2/13/65/b21365c035ff1cfa52edc492affa885b.jpg'

function initialsFromUsername(username: string): string {
  return (
    username
      .split(/[^a-zA-Z0-9]+/)
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'BC'
  )
}

function FormMessage({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info'
  children: string
}) {
  return <div className={`form-message form-message--${tone}`}>{children}</div>
}

export function LandingPage() {
  const { defaultAppPath, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const startPath = isAuthenticated ? defaultAppPath : '/login'

  return (
    <div className="landing-page">
      <header className="landing-header">
        <BrandMark />
        <div className="landing-header__actions">
          <ThemeToggle />
          <button type="button" className="landing-link" onClick={() => navigate('/login')}>
            Login
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero" style={{ '--hero-bg': `url(${LEGACY_LANDING_BG})` } as CSSProperties}>
          <div className="landing-hero__overlay" />
          <div className="landing-hero__content">
            <LegacyHeroAnimation />
            <p className="landing-hero__eyebrow">BugCatcher Platform</p>
            <h1>
              Track Bugs Like a <span>Pro</span>
            </h1>
            <p>Simple issue tracking for projects, teams, and daily progress visibility.</p>
            <div className="landing-hero__actions">
              <Link to={startPath} className="button button--primary">
                {isAuthenticated ? 'Continue' : 'Get Started'}
              </Link>
              <a href="#why-bugcatcher" className="button button--ghost">
                Learn More
              </a>
            </div>
          </div>
        </section>

        <section className="landing-stats">
          <article className="landing-stat">
            <strong>&infin;</strong>
            <span>Bugs Caught</span>
          </article>
          <article className="landing-stat">
            <strong>100%</strong>
            <span>Tracking</span>
          </article>
          <article className="landing-stat">
            <strong>0</strong>
            <span>Bugs Escape</span>
          </article>
        </section>

        <section className="landing-features" id="why-bugcatcher">
          <div className="landing-section-head">
            <h2>Why Choose BugCatcher?</h2>
            <p>Everything teams need for clean issue flow.</p>
          </div>
          <div className="landing-feature-grid">
            {landingFeatures.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-feature-card__icon">
                  <Icon name={feature.icon} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; 2026 BugCatcher. Built for students, by students.</p>
      </footer>
    </div>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('superadmin@local.dev')
  const [password, setPassword] = useState('DevPass123!')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const flashMessage =
    typeof location.state === 'object' && location.state && 'message' in location.state
      ? String(location.state.message)
      : ''

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')

    const result = await login({ email, password })

    setPending(false)
    if (!result.ok) {
      setError(result.error ?? 'Unable to login.')
      return
    }

    navigate('/app', { replace: true })
  }

  return (
    <AuthLayout
      title="Login"
      subtitle="Use your BugCatcher account"
      navLabel="Sign Up"
      navTo="/signup"
      footer={
        <p>
          No account? <Link to="/signup">Sign Up</Link>
        </p>
      }
    >
      <form className="auth-stack" onSubmit={handleSubmit}>
        {flashMessage ? <FormMessage tone="success">{flashMessage}</FormMessage> : null}
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <AuthField
          label="Email"
          placeholder="superadmin@local.dev"
          icon="mail"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          error={Boolean(error)}
        />
        <AuthField
          label="Password"
          placeholder="Enter password"
          icon="lock"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
          error={Boolean(error)}
        />

        <div className="auth-actions-row">
          <button type="submit" className="button button--primary" disabled={pending}>
            {pending ? 'Signing In...' : 'Login'}
          </button>
          <Link className="button button--ghost" to="/forgot-password">
            Forgot
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')

    const result = await signup({ username, email, password, confirmPassword })

    setPending(false)
    if (!result.ok) {
      setError(result.error ?? 'Unable to create account.')
      return
    }

    navigate('/login', {
      replace: true,
      state: {
        message: result.message ?? 'Account created. You can now log in.',
      },
    })
  }

  return (
    <AuthLayout
      title="Sign Up"
      subtitle="Create your BugCatcher account"
      navLabel="Login"
      navTo="/login"
      footer={
        <p>
          Have account? <Link to="/login">Login</Link>
        </p>
      }
    >
      <form className="auth-stack" onSubmit={handleSubmit}>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <AuthField
          label="Username"
          placeholder="superadmin"
          icon="users"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={pending}
          error={Boolean(error)}
        />
        <AuthField
          label="Email"
          placeholder="superadmin@local.dev"
          icon="mail"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          error={Boolean(error)}
        />
        <AuthField
          label="Password"
          placeholder="Create password"
          icon="lock"
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
          error={Boolean(error)}
        />
        <AuthField
          label="Confirm"
          placeholder="Repeat password"
          icon="lock"
          type="password"
          name="confirm_password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={pending}
          error={Boolean(error)}
        />
        <div className="auth-actions-row">
          <button type="submit" className="button button--primary" disabled={pending}>
            {pending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}

export function ForgotPasswordPage() {
  const { requestOtp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')

    const result = await requestOtp(email)
    setPending(false)

    if (!result.ok) {
      setError(result.error ?? 'Unable to send reset code.')
      return
    }

    navigate(`/forgot-password/verify?email=${encodeURIComponent(email)}`, {
      state: { message: result.message ?? 'OTP sent. Check your inbox.' },
    })
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Send OTP"
      navLabel="Login"
      navTo="/login"
      footer={
        <p>
          Back to <Link to="/login">Login</Link>
        </p>
      }
    >
      <form className="auth-stack" onSubmit={handleSubmit}>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <AuthField
          label="Email"
          placeholder="superadmin@local.dev"
          icon="mail"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          error={Boolean(error)}
        />
        <div className="auth-actions-row">
          <button type="submit" className="button button--primary" disabled={pending}>
            {pending ? 'Sending...' : 'Send OTP'}
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}

export function ForgotPasswordVerifyPage() {
  const { resendOtp, resetPassword, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')?.trim() ?? ''
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState(
    typeof location.state === 'object' && location.state && 'message' in location.state
      ? String(location.state.message)
      : '',
  )
  const [pending, setPending] = useState(false)
  const [resending, setResending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email) {
      setError('Email is missing. Start the reset flow again.')
      return
    }

    setPending(true)
    setError('')
    setMessage('')

    const verification = await verifyOtp(email, otp)
    if (!verification.ok) {
      setPending(false)
      setError(verification.error ?? 'Unable to verify code.')
      return
    }

    const reset = await resetPassword({ email, password, confirmPassword })
    setPending(false)

    if (!reset.ok) {
      setError(reset.error ?? 'Unable to reset password.')
      return
    }

    navigate('/forgot-password/success', {
      replace: true,
      state: {
        message: reset.message ?? 'Password updated. You can now log in.',
      },
    })
  }

  const handleResend = async () => {
    if (!email) {
      setError('Email is missing. Start the reset flow again.')
      return
    }

    setResending(true)
    setError('')

    const result = await resendOtp(email)
    setResending(false)

    if (!result.ok) {
      setError(result.error ?? 'Unable to resend reset code.')
      return
    }

    setMessage(result.message ?? 'A fresh code has been sent.')
  }

  return (
    <AuthLayout
      title="OTP Verify"
      subtitle={email ? `Reset for ${email}` : '6-digit code'}
      navLabel="Login"
      navTo="/login"
      footer={
        <p>
          Need new code?{' '}
          <button type="button" className="inline-link" onClick={handleResend} disabled={resending}>
            {resending ? 'Sending...' : 'Resend'}
          </button>
        </p>
      }
    >
      <form className="auth-stack" onSubmit={handleSubmit}>
        {message ? <FormMessage tone="info">{message}</FormMessage> : null}
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <AuthField
          label="OTP"
          placeholder="382147"
          icon="alert"
          name="otp"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          disabled={pending}
          inputMode="numeric"
          maxLength={6}
          error={Boolean(error)}
        />
        <AuthField
          label="New Password"
          placeholder="New password"
          icon="lock"
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
          error={Boolean(error)}
        />
        <AuthField
          label="Confirm"
          placeholder="Repeat password"
          icon="lock"
          type="password"
          name="confirm_password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={pending}
          error={Boolean(error)}
        />
        <div className="auth-actions-row">
          <button type="submit" className="button button--primary" disabled={pending}>
            {pending ? 'Resetting...' : 'Reset'}
          </button>
          <button type="button" className="button button--ghost" onClick={handleResend} disabled={resending}>
            {resending ? 'Sending...' : 'Resend'}
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}

export function ForgotPasswordSuccessPage() {
  const location = useLocation()
  const message =
    typeof location.state === 'object' && location.state && 'message' in location.state
      ? String(location.state.message)
      : 'Use your new password to sign in.'

  return (
    <AuthLayout title="Reset Success" subtitle="Password updated" navLabel="Login" navTo="/login">
      <div className="success-panel">
        <div className="success-panel__icon">
          <Icon name="checklist" />
        </div>
        <div>
          <h3>All set</h3>
          <p>{message}</p>
        </div>
      </div>
      <div className="auth-actions-row">
        <Link className="button button--primary" to="/login">
          Login
        </Link>
      </div>
    </AuthLayout>
  )
}

export function DashboardPage() {
  const pieFill = `conic-gradient(
    ${dashboardPie[0].color} 0% ${dashboardPie[0].value}%,
    ${dashboardPie[1].color} ${dashboardPie[0].value}% ${dashboardPie[0].value + dashboardPie[1].value}%,
    ${dashboardPie[2].color} ${dashboardPie[0].value + dashboardPie[1].value}% 100%
  )`

  const maxBarValue = Math.max(
    ...dashboardTrend.flatMap((entry) => [entry.issues, entry.projects, entry.checklist]),
  )
  const barHeight = (value: number) => `${Math.max(12, (value / maxBarValue) * 100)}%`
  const leaderboardRoles = ['Junior Developer', 'Project Manager', 'QA Tester', 'QA Lead']

  return (
    <div className="page-stack">
      <SectionCard title="Live Summary" subtitle="Today">
        <div className="dashboard-hero">
          <div className="dashboard-hero__chart">
            <div className="pie-chart pie-chart--compact" style={{ '--pie-fill': pieFill } as CSSProperties}>
              <div className="pie-chart__center">
                <strong>37</strong>
                <span>Issues</span>
              </div>
            </div>
          </div>

          <div className="dashboard-hero__trend">
            {dashboardTrend.slice(0, 6).map((entry) => (
              <div key={entry.day} className="mini-trend__group">
                <span
                  className="mini-trend__bar mini-trend__bar--issues"
                  style={{ '--bar-height': barHeight(entry.issues) } as CSSProperties}
                />
                <span
                  className="mini-trend__bar mini-trend__bar--projects"
                  style={{ '--bar-height': barHeight(entry.projects) } as CSSProperties}
                />
                <span
                  className="mini-trend__bar mini-trend__bar--checklist"
                  style={{ '--bar-height': barHeight(entry.checklist) } as CSSProperties}
                />
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="stats-grid">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <SectionCard title="Leaderboard" subtitle="Top local performers">
        <div className="leaderboard leaderboard--legacy">
          {leaderboard.map((entry, index) => {
            const rank = index + 1
            const initials = entry.name
              .split(' ')
              .map((part) => part[0] ?? '')
              .join('')
              .slice(0, 1)
              .toUpperCase()
            const tierClass =
              rank === 1 ? 'is-gold' : rank === 2 ? 'is-silver' : rank === 3 ? 'is-bronze' : 'is-standard'

            return (
              <article key={entry.name} className={`leaderboard__row leaderboard__row--legacy ${tierClass}`}>
                <div className="leaderboard__left">
                  <span className="leaderboard__rank-tag">#{rank}</span>
                  <span className="leaderboard__avatar-wrap">
                    <span className="leaderboard__avatar">{initials}</span>
                    {rank === 1 ? (
                      <span className="leaderboard__crown" aria-hidden="true">
                        {'\u{1F451}'}
                      </span>
                    ) : null}
                  </span>
                </div>

                <div className="leaderboard__content">
                  <strong>{entry.name}</strong>
                  <p>{leaderboardRoles[index] ?? 'Contributor'}</p>
                </div>

                <div className="leaderboard__score">
                  <strong>{entry.issuesClosed} closed</strong>
                  <small>
                    {entry.projectsMoved} proj | {entry.checklistRate}% chk
                  </small>
                </div>
              </article>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="Workload Split">
        <div className="pie-layout">
          <div className="pie-chart" style={{ '--pie-fill': pieFill } as CSSProperties}>
            <div className="pie-chart__center">
              <strong>100%</strong>
              <span>Today</span>
            </div>
          </div>
          <div className="pie-legend">
            {dashboardPie.map((segment) => (
              <div key={segment.label} className="pie-legend__item">
                <span className="pie-legend__dot" style={{ '--dot-color': segment.color } as CSSProperties} />
                <p>{segment.label}</p>
                <strong>{segment.value}%</strong>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="7-Day Trend">
        <div className="trend-chart">
          {dashboardTrend.map((entry) => (
            <div key={entry.day} className="trend-chart__group">
              <div className="trend-chart__bars">
                <span
                  className="trend-chart__bar trend-chart__bar--issues"
                  style={{ '--bar-height': barHeight(entry.issues) } as CSSProperties}
                />
                <span
                  className="trend-chart__bar trend-chart__bar--projects"
                  style={{ '--bar-height': barHeight(entry.projects) } as CSSProperties}
                />
                <span
                  className="trend-chart__bar trend-chart__bar--checklist"
                  style={{ '--bar-height': barHeight(entry.checklist) } as CSSProperties}
                />
              </div>
              <small>{entry.day}</small>
            </div>
          ))}
        </div>
        <div className="trend-legend">
          <span>
            <i className="trend-legend__dot trend-legend__dot--issues" />
            Issues
          </span>
          <span>
            <i className="trend-legend__dot trend-legend__dot--projects" />
            Projects
          </span>
          <span>
            <i className="trend-legend__dot trend-legend__dot--checklist" />
            Checklist
          </span>
        </div>
      </SectionCard>
    </div>
  )
}

export function OrganizationsPage() {
  const { activeMembership, activeOrgId, memberships, setActiveOrg, user } = useAuth()
  const [pendingOrgId, setPendingOrgId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const switchOrg = async (orgId: number) => {
    setPendingOrgId(orgId)
    setError('')
    setMessage('')

    const result = await setActiveOrg(orgId)

    setPendingOrgId(null)
    if (!result.ok) {
      setError(result.error ?? 'Unable to switch organization.')
      return
    }

    setMessage('Active organization updated.')
  }

  return (
    <div className="page-stack">
      {message ? <FormMessage tone="success">{message}</FormMessage> : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <SectionCard title="Active Organization" subtitle="Current session context">
        {activeMembership ? (
          <div className="detail-pairs">
            <DetailPair label="Name" value={activeMembership.org_name} />
            <DetailPair label="Org Role" value={activeMembership.role} />
            <DetailPair label="System Role" value={user?.role ?? 'user'} />
            <DetailPair label="Org ID" value={`${activeOrgId}`} />
          </div>
        ) : (
          <p className="body-copy">
            No active organization is set yet. Pick one below to unlock organization pages.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Memberships"
        subtitle={`${memberships.length} organization${memberships.length === 1 ? '' : 's'}`}
      >
        {memberships.length > 0 ? (
          <div className="list-stack">
            {memberships.map((membership) => (
              <ListRow
                key={membership.org_id}
                icon="organization"
                title={membership.org_name}
                detail={`${membership.role}${membership.is_owner ? ' | Owner' : ''}`}
                meta={membership.org_id === activeOrgId ? 'Active' : `Org #${membership.org_id}`}
                action={
                  membership.org_id === activeOrgId ? (
                    <span className="pill pill--success">Active</span>
                  ) : (
                    <button
                      type="button"
                      className="inline-link"
                      disabled={pendingOrgId === membership.org_id}
                      onClick={() => void switchOrg(membership.org_id)}
                    >
                      {pendingOrgId === membership.org_id ? 'Switching...' : 'Use'}
                    </button>
                  )
                }
              />
            ))}
          </div>
        ) : (
          <p className="body-copy">Your account is not attached to an organization yet.</p>
        )}
      </SectionCard>

      <SectionCard title="Access Notes">
        <div className="bullet-stack">
          <div className="bullet-row">
            <span className="bullet-row__marker" />
            <p>Dashboard, projects, issues, checklist, and admin areas require an active organization.</p>
          </div>
          <div className="bullet-row">
            <span className="bullet-row__marker" />
            <p>Owner-only access unlocks Manage Users. Super admins unlock Super Admin and OpenClaw.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export function ProjectsPage() {
  return (
    <div className="page-stack">
      <SectionCard title="Project Filter">
        <div className="chip-row">
          <span className="pill pill--dark">All</span>
          <span className="pill">Attention</span>
          <span className="pill">Shipping</span>
          <span className="pill">AI</span>
        </div>
      </SectionCard>

      {projects.map((project) => (
        <SectionCard key={project.name} title={project.name} subtitle={project.focus}>
          <div className="detail-pairs">
            <DetailPair label="Lead" value={project.lead} />
            <DetailPair label="Issues" value={`${project.openIssues}`} />
            <DetailPair label="Blockers" value={`${project.blockers}`} />
            <DetailPair label="Timeline" value={project.dueLabel} />
          </div>
          <div className="progress-rail">
            <span style={{ width: `${Math.max(18, 100 - project.blockers * 22 - project.openIssues)}%` }} />
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

export function ReportsPage() {
  const issueLoad = [
    { label: 'Critical', count: 13, tone: 'critical', note: 'Escalate now' },
    { label: 'High', count: 21, tone: 'high', note: 'Needs owner' },
    { label: 'Medium', count: 24, tone: 'medium', note: 'Queue active' },
    { label: 'Low', count: 14, tone: 'low', note: 'Can wait' },
  ]
  const issueLoadMax = Math.max(...issueLoad.map((item) => item.count))

  return (
    <div className="page-stack">
      <SectionCard title="Issue Filter">
        <div className="chip-row">
          <span className="pill pill--dark">All</span>
          <span className="pill">Critical</span>
          <span className="pill">Assigned</span>
          <span className="pill">Stale</span>
        </div>
      </SectionCard>

      <div className="stats-grid">
        {issuesSummary.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <SectionCard title="Issue Load">
        <div className="issue-load">
          {issueLoad.map((item) => (
            <div key={item.label} className="issue-load__row">
              <div className="issue-load__meta">
                <strong>{item.label}</strong>
                <span>{item.note}</span>
              </div>
              <div className="issue-load__rail">
                <span
                  className={`issue-load__fill issue-load__fill--${item.tone}`}
                  style={{ width: `${(item.count / issueLoadMax) * 100}%` } as CSSProperties}
                />
              </div>
              <div className="issue-load__count">
                <strong>{item.count}</strong>
                <small>issues</small>
              </div>
            </div>
          ))}
          <div className="issue-load__footer">
            <span>72 open total</span>
            <span>13 critical</span>
          </div>
        </div>
      </SectionCard>

      {reports.map((report) => (
        <SectionCard key={report.title} title={report.title} subtitle={report.range}>
          <p className="body-copy">{report.insight}</p>
          <div className="report-footer">
            <span className={`pill ${report.status === 'Open' ? 'pill--danger' : report.status === 'Watch' ? 'pill--dark' : 'pill--success'}`}>
              {report.status}
            </span>
            <button type="button" className="button button--ghost">
              {report.cta}
            </button>
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

export function SuperAdminPage() {
  const actions = ['Approve runtime reload', 'Assign backup owner', 'Review discord route']

  return (
    <div className="page-stack">
      <SectionCard title="Control Center">
        <div className="mini-grid">
          <StatusTile title="Escalations" value="03" note="1 overdue" tone="alert" />
          <StatusTile title="Approvals" value="11" note="Ready queue" tone="steel" />
        </div>
      </SectionCard>

      <SectionCard title="Priority">
        <div className="bullet-stack">
          {actions.map((item) => (
            <div key={item} className="bullet-row">
              <span className="bullet-row__marker" />
              <p>{item}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function OpenClawPage() {
  const [activeSection, setActiveSection] = useState<OpenClawSectionData['key']>('runtime')
  const currentSection =
    openClawSections.find((section) => section.key === activeSection) ?? openClawSections[0]

  return (
    <div className="page-stack">
      <SectionCard title="Sections">
        <div className="chip-row">
          {openClawSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`pill-button ${section.key === currentSection.key ? 'is-active' : ''}`}
              onClick={() => setActiveSection(section.key)}
            >
              {section.title}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={currentSection.title} subtitle={currentSection.description}>
        <div className="report-footer">
          <span className="pill pill--dark">{currentSection.badge}</span>
          <button type="button" className="button button--ghost">
            Reload
          </button>
        </div>
        <div className="list-stack">
          {currentSection.items.map((item) => (
            <ListRow key={item} icon="spark" title={item} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Snapshot">
        <div className="mini-grid">
          <StatusTile title="Desired" value="v24" note="ahead by 1" tone="steel" />
          <StatusTile title="Discord" value="Connected" note="synced" tone="success" />
          <StatusTile title="Pending" value="#104" note="queued" tone="alert" />
        </div>
      </SectionCard>
    </div>
  )
}

export function ManageUsersPage() {
  const { activeMembership, user } = useAuth()
  const accessRows: Array<[string, string, string]> = [
    [user?.username ?? 'current user', user?.role ?? 'user', activeMembership?.role ?? 'No org'],
    ['Project Manager', 'Issue creation', 'Project Manager'],
    ['QA Lead', 'Checklist manager', 'QA Lead'],
    ['Owner', 'Member role edits', 'owner'],
  ]

  return (
    <div className="page-stack">
      <SectionCard title="Owner Gate" subtitle="This page is restricted to active organization owners.">
        <div className="detail-pairs">
          <DetailPair label="User" value={user?.username ?? 'Unknown'} />
          <DetailPair label="System" value={user?.role ?? 'user'} />
          <DetailPair label="Org Role" value={activeMembership?.role ?? 'No org'} />
          <DetailPair label="Org" value={activeMembership?.org_name ?? 'No org'} />
        </div>
      </SectionCard>

      <SectionCard title="Access Map">
        <div className="list-stack">
          {accessRows.map(([name, role, scope]) => (
            <ListRow
              key={`${name}-${role}`}
              icon="users"
              title={name}
              detail={role}
              meta={scope}
              action={<span className="pill">{scope}</span>}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function ChecklistPage() {
  const checklistItems: Array<[string, string]> = [
    ['Mobile shell QA', 'Ready'],
    ['Auth copy sync', 'Review'],
    ['OpenClaw labels', 'In progress'],
    ['README handoff', 'Done'],
  ]

  return (
    <div className="page-stack">
      <SectionCard title="Checklist">
        <div className="list-stack">
          {checklistItems.map(([title, status]) => (
            <ListRow
              key={title}
              icon="checklist"
              title={title}
              detail={status}
              action={<span className="pill pill--success">{status}</span>}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function DiscordLinksPage() {
  const links: Array<[string, string, string]> = [
    ['BugCatcher HQ', 'qa-intake', 'Healthy'],
    ['Support Collective', 'ops-alerts', 'Healthy'],
    ['Partner Sandbox', 'pilot-bugs', 'Refresh'],
  ]

  return (
    <div className="page-stack">
      <SectionCard title="Discord Link">
        <div className="list-stack">
          {links.map(([guild, channel, health]) => (
            <ListRow
              key={`${guild}-${channel}`}
              icon="discord"
              title={guild}
              detail={channel}
              action={<span className={`pill ${health === 'Healthy' ? 'pill--success' : 'pill--dark'}`}>{health}</span>}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function SettingsPage() {
  const settings: Array<[string, boolean]> = [
    ['Compact cards', true],
    ['Auto close drawer', true],
    ['Phone frame mode', true],
    ['Realtime refresh', false],
  ]

  return (
    <div className="page-stack">
      <SectionCard title="Settings">
        <div className="settings-list">
          {settings.map(([label, checked]) => (
            <label key={label} className="toggle-row">
              <span>
                <strong>{label}</strong>
              </span>
              <span className={`toggle ${checked ? 'is-on' : ''}`} aria-hidden="true">
                <span />
              </span>
            </label>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function ProfilePage() {
  const { activeMembership, memberships, user } = useAuth()
  const quickActions = [
    ...(user?.role === 'super_admin'
      ? [{ icon: 'shield' as const, title: 'Super Admin', detail: 'Global access', badge: 'Open' }]
      : []),
    ...(activeMembership?.role === 'owner'
      ? [{ icon: 'users' as const, title: 'Manage Users', detail: 'Owner controls', badge: 'Owner' }]
      : []),
    { icon: 'settings' as const, title: 'Settings', detail: 'App defaults', badge: 'Edit' },
  ]
  const profileStats = [
    {
      label: 'System',
      value: user?.role === 'super_admin' ? 'Super' : user?.role === 'admin' ? 'Admin' : 'User',
      note: 'role',
      tone: 'steel' as const,
    },
    { label: 'Teams', value: `${memberships.length}`, note: 'memberships', tone: 'success' as const },
    {
      label: 'Org',
      value: activeMembership?.role ? initialsFromUsername(activeMembership.role) : 'N/A',
      note: activeMembership?.role ?? 'none',
      tone: 'alert' as const,
    },
  ]

  return (
    <div className="page-stack">
      <SectionCard title={user?.role === 'super_admin' ? 'Super Admin' : 'Profile'}>
        <div className="profile-hero">
          <div className="profile-hero__avatar">{initialsFromUsername(user?.username ?? 'User')}</div>
          <div className="profile-hero__copy">
            <strong>{user?.username ?? 'Unknown user'}</strong>
            <p>{user?.email ?? 'No email'}</p>
          </div>
          <span className="pill pill--success">Online</span>
        </div>
      </SectionCard>

      <div className="stats-grid">
        {profileStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <SectionCard title="Quick Actions">
        <div className="list-stack">
          {quickActions.map((item) => (
            <ListRow
              key={item.title}
              icon={item.icon}
              title={item.title}
              detail={item.detail}
              action={<span className="pill">{item.badge}</span>}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Session">
        <div className="detail-pairs">
          <DetailPair label="System Role" value={user?.role ?? 'user'} />
          <DetailPair label="Org Role" value={activeMembership?.role ?? 'No active org'} />
          <DetailPair label="Org" value={activeMembership?.org_name ?? 'No active org'} />
          <DetailPair label="Device" value="Mobile Web" />
        </div>
      </SectionCard>
    </div>
  )
}

export function NotificationsPage() {
  const { notifications, unreadCount, markAllAsRead } = useNotifications()
  const readCount = notifications.length - unreadCount
  const priorityCount = notifications.filter(
    (notification) => !notification.read && notification.tone === 'alert',
  ).length

  return (
    <div className="page-stack">
      <SectionCard title="Today">
        <div className="stats-grid">
          <StatCard stat={{ label: 'Unread', value: `${unreadCount}`, note: 'new', tone: 'alert' }} />
          <StatCard stat={{ label: 'Read', value: `${readCount}`, note: 'seen', tone: 'success' }} />
          <StatCard stat={{ label: 'Priority', value: `${priorityCount}`, note: 'need action', tone: 'steel' }} />
        </div>
      </SectionCard>

      <SectionCard
        title="In App Notifications"
        headerAlign="center"
        action={
          <button type="button" className="button button--ghost button--tiny" onClick={markAllAsRead}>
            Mark all read
          </button>
        }
      >
        <div className="list-stack">
          {notifications.map((item) => (
            <ListRow
              key={item.id}
              icon={item.tone === 'alert' ? 'alert' : item.tone === 'success' ? 'checklist' : 'activity'}
              title={item.title}
              detail={item.detail}
              meta={item.time}
              tone={item.tone}
              readState={item.read ? 'read' : 'unread'}
              action={
                <span className={`notif-chip ${item.read ? 'is-read' : 'is-unread'}`}>
                  {item.read ? 'Read' : 'Unread'}
                </span>
              }
            />
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
