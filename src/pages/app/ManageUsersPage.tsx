import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { OrgRole } from '../../auth-context'
import { useAuth } from '../../auth-context'
import { AuthField, SectionCard } from '../../components/ui'
import { getErrorMessage } from '../../lib/api'
import {
  createOrganizationMember,
  fetchOrganizations,
  fetchOrganizationMembers,
  removeOrganizationMember,
  transferOrganizationOwner,
  updateOrganizationMemberRole,
  type OrganizationMember,
  type OrganizationsResponse,
} from '../../features/organizations/api'
import { FormMessage } from '../shared'

const MANAGEABLE_ROLES: OrgRole[] = [
  'member',
  'Project Manager',
  'QA Lead',
  'Senior Developer',
  'Senior QA',
  'Junior Developer',
  'QA Tester',
]

interface ManageUsersMember extends OrganizationMember {
  orgId: number
  orgName: string
}

function membershipKey(orgId: number, userId: number) {
  return `${orgId}:${userId}`
}

export function ManageUsersPage() {
  const { activeMembership, activeOrgId, memberships, session, user } = useAuth()
  const [members, setMembers] = useState<ManageUsersMember[]>([])
  const [organizationCatalog, setOrganizationCatalog] = useState<OrganizationsResponse | null>(null)
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMemberOrgIds, setSelectedMemberOrgIds] = useState<number[]>([])
  const [selectedOrgRole, setSelectedOrgRole] = useState('all')
  const [selectedSystemRole, setSelectedSystemRole] = useState('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    orgId: 0,
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    orgRole: MANAGEABLE_ROLES[0],
  })
  const [createPending, setCreatePending] = useState(false)
  const [createError, setCreateError] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pendingMembershipKey, setPendingMembershipKey] = useState<string | null>(null)
  const [canScrollOrgFilterLeft, setCanScrollOrgFilterLeft] = useState(false)
  const [canScrollOrgFilterRight, setCanScrollOrgFilterRight] = useState(false)
  const orgFilterScrollRef = useRef<HTMLDivElement | null>(null)
  const orgName = activeMembership?.org_name ?? 'this organization'
  const isSuperAdmin = user?.role === 'super_admin'

  const manageableOrganizations = useMemo(() => {
    const options = new Map<number, string>()

    if (activeOrgId > 0 && activeMembership?.org_name && (isSuperAdmin || activeMembership.is_owner)) {
      options.set(activeOrgId, activeMembership.org_name)
    }

    memberships.forEach((membership) => {
      if (isSuperAdmin || membership.is_owner) {
        options.set(membership.org_id, membership.org_name)
      }
    })

    organizationCatalog?.organizations.forEach((organization) => {
      if (isSuperAdmin || organization.is_owner) {
        options.set(organization.id, organization.name)
      }
    })

    return Array.from(options, ([id, name]) => ({ id, name })).sort((left, right) => {
      if (left.id === activeOrgId) {
        return -1
      }
      if (right.id === activeOrgId) {
        return 1
      }
      return left.name.localeCompare(right.name)
    })
  }, [activeMembership?.is_owner, activeMembership?.org_name, activeOrgId, isSuperAdmin, memberships, organizationCatalog])

  const load = useCallback(async () => {
    if (!session?.accessToken || manageableOrganizations.length === 0) {
      setMembers([])
      setDraftRoles({})
      return
    }
    try {
      const results = await Promise.all(
        manageableOrganizations.map(async (organization) => {
          const result = await fetchOrganizationMembers(session.accessToken, organization.id)
          return result.members.map((member) => ({
            ...member,
            orgId: organization.id,
            orgName: organization.name,
          }))
        }),
      )
      const nextMembers = results.flat()
      setMembers(nextMembers)
      setDraftRoles(
        Object.fromEntries(nextMembers.map((member) => [membershipKey(member.orgId, member.user_id), member.org_role])),
      )
      setError('')
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load organization members.'))
    }
  }, [manageableOrganizations, session?.accessToken])

  useEffect(() => {
    void load()
  }, [load])

  const orgRoleOptions = useMemo(() => Array.from(new Set(members.map((member) => member.org_role))), [members])
  const systemRoleOptions = useMemo(() => Array.from(new Set(members.map((member) => member.system_role))), [members])

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const selectedOrgIdSet = new Set(selectedMemberOrgIds)

    return members.filter((member) => {
      const matchesSearch =
        query === '' || `${member.username} ${member.email}`.toLowerCase().includes(query)
      const matchesOrganizations = selectedOrgIdSet.size === 0 || selectedOrgIdSet.has(member.orgId)
      const matchesOrgRole = selectedOrgRole === 'all' || member.org_role === selectedOrgRole
      const matchesSystemRole = selectedSystemRole === 'all' || member.system_role === selectedSystemRole

      return matchesSearch && matchesOrganizations && matchesOrgRole && matchesSystemRole
    })
  }, [members, searchQuery, selectedMemberOrgIds, selectedOrgRole, selectedSystemRole])

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedMemberOrgIds.length > 0 || selectedOrgRole !== 'all' || selectedSystemRole !== 'all'
  const availableOrganizations = useMemo(() => {
    const options = new Map<number, string>()

    manageableOrganizations.forEach((organization) => {
      options.set(organization.id, organization.name)
    })

    organizationCatalog?.joinable_organizations.forEach((organization) => {
      options.set(organization.id, organization.name)
    })

    return Array.from(options, ([id, name]) => ({ id, name })).sort((left, right) => {
      if (left.id === activeOrgId) {
        return -1
      }
      if (right.id === activeOrgId) {
        return 1
      }
      return left.name.localeCompare(right.name)
    })
  }, [activeOrgId, manageableOrganizations, organizationCatalog])
  const selectedCreateOrganization = availableOrganizations.find((organization) => organization.id === createForm.orgId) ?? null

  useEffect(() => {
    if (!isCreateModalOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !createPending) {
        setIsCreateModalOpen(false)
        setCreateError('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createPending, isCreateModalOpen])

  useEffect(() => {
    let isCurrent = true

    if (!isSuperAdmin || !session?.accessToken) {
      setOrganizationCatalog(null)
      return () => {
        isCurrent = false
      }
    }

    void (async () => {
      try {
        const result = await fetchOrganizations(session.accessToken)
        if (isCurrent) {
          setOrganizationCatalog(result)
        }
      } catch {
        if (isCurrent) {
          setOrganizationCatalog(null)
        }
      }
    })()

    return () => {
      isCurrent = false
    }
  }, [isSuperAdmin, session?.accessToken])

  useEffect(() => {
    setSelectedMemberOrgIds((current) =>
      current.filter((orgId) => manageableOrganizations.some((organization) => organization.id === orgId)),
    )
  }, [manageableOrganizations])

  useEffect(() => {
    const node = orgFilterScrollRef.current
    if (!node) {
      setCanScrollOrgFilterLeft(false)
      setCanScrollOrgFilterRight(false)
      return
    }

    const syncScrollButtons = () => {
      const maxScrollLeft = node.scrollWidth - node.clientWidth
      setCanScrollOrgFilterLeft(node.scrollLeft > 8)
      setCanScrollOrgFilterRight(maxScrollLeft - node.scrollLeft > 8)
    }

    syncScrollButtons()
    node.addEventListener('scroll', syncScrollButtons, { passive: true })
    window.addEventListener('resize', syncScrollButtons)
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncScrollButtons) : null
    resizeObserver?.observe(node)

    return () => {
      node.removeEventListener('scroll', syncScrollButtons)
      window.removeEventListener('resize', syncScrollButtons)
      resizeObserver?.disconnect()
    }
  }, [manageableOrganizations])

  useEffect(() => {
    if (!isCreateModalOpen) {
      return
    }

    setCreateForm((current) => {
      if (current.orgId > 0 && availableOrganizations.some((organization) => organization.id === current.orgId)) {
        return current
      }

      return {
        ...current,
        orgId: activeOrgId > 0 ? activeOrgId : availableOrganizations[0]?.id ?? 0,
      }
    })
  }, [activeOrgId, availableOrganizations, isCreateModalOpen])

  const runWithMember = async (member: ManageUsersMember, action: () => Promise<void>) => {
    setPendingMembershipKey(membershipKey(member.orgId, member.user_id))
    setMessage('')
    setError('')
    try {
      await action()
      await load()
    } catch (actionError) {
      setError(getErrorMessage(actionError, 'Unable to update organization members.'))
    } finally {
      setPendingMembershipKey(null)
    }
  }

  const resetCreateForm = () => {
    setCreateForm({
      orgId: activeOrgId > 0 ? activeOrgId : availableOrganizations[0]?.id ?? 0,
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      orgRole: MANAGEABLE_ROLES[0],
    })
    setCreateError('')
  }

  const closeCreateModal = () => {
    if (createPending) {
      return
    }
    setIsCreateModalOpen(false)
    resetCreateForm()
  }

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.accessToken) {
      setCreateError('Authentication required.')
      return
    }
    if (createForm.orgId <= 0) {
      setCreateError('Choose an organization first.')
      return
    }

    setCreatePending(true)
    setCreateError('')

    try {
      const targetOrgId = createForm.orgId
      const targetOrgName = selectedCreateOrganization?.name ?? orgName
      const result = await createOrganizationMember(session.accessToken, targetOrgId, {
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        confirm_password: createForm.confirmPassword,
        org_role: createForm.orgRole,
      })

      if (targetOrgId === activeOrgId) {
        await load()
      }

      setMessage(result.message || `User created in ${targetOrgName}.`)
      setIsCreateModalOpen(false)
      resetCreateForm()
    } catch (createUserError) {
      setCreateError(getErrorMessage(createUserError, 'Unable to create user.'))
    } finally {
      setCreatePending(false)
    }
  }

  const toggleOrganizationFilter = (orgId: number) => {
    setSelectedMemberOrgIds((current) => {
      if (current.length === 0) {
        return [orgId]
      }
      if (current.includes(orgId)) {
        return current.filter((currentOrgId) => currentOrgId !== orgId)
      }
      return [...current, orgId]
    })
  }

  const scrollOrganizationFilter = (direction: 'left' | 'right') => {
    const node = orgFilterScrollRef.current
    if (!node) {
      return
    }

    const distance = Math.max(160, Math.floor(node.clientWidth * 0.72))
    node.scrollBy({
      left: direction === 'right' ? distance : -distance,
      behavior: 'smooth',
    })
  }

  return (
    <div className="page-stack">
      {message ? <FormMessage tone="success">{message}</FormMessage> : null}
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <SectionCard title="Owner Gate" subtitle="This page is restricted to active organization owners.">
        <p className="body-copy">Owners can change roles, transfer ownership, and remove members. Super admins can also create users directly.</p>
      </SectionCard>

      <SectionCard
        title="Members"
        action={
          isSuperAdmin ? (
            <button
              type="button"
              className="button button--ghost button--tiny"
              onClick={() => {
                resetCreateForm()
                setIsCreateModalOpen(true)
              }}
            >
              New User
            </button>
          ) : undefined
        }
      >
        <div className="list-stack">
          {manageableOrganizations.length > 1 ? (
            <div className="manage-users-org-filter">
              <div className="manage-users-org-filter__header">
                <span>Organizations</span>
                <p className="body-copy">Tap one or more organizations to filter the member list.</p>
              </div>

              <div className="manage-users-org-filter__scroller">
                {canScrollOrgFilterLeft ? (
                  <button
                    type="button"
                    className="manage-users-org-filter__nav manage-users-org-filter__nav--left"
                    aria-label="Scroll organizations left"
                    onClick={() => scrollOrganizationFilter('left')}
                  >
                    {'<'}
                  </button>
                ) : null}
                <div className="manage-users-org-filter__scroll" ref={orgFilterScrollRef}>
                  <div className="manage-users-org-filter__chips">
                    <button
                      type="button"
                      className={`pill-button manage-users-org-filter__chip ${selectedMemberOrgIds.length === 0 ? 'is-active' : ''}`}
                      onClick={() => setSelectedMemberOrgIds([])}
                    >
                      All
                    </button>
                    {manageableOrganizations.map((organization) => (
                      <button
                        key={organization.id}
                        type="button"
                        className={`pill-button manage-users-org-filter__chip ${selectedMemberOrgIds.includes(organization.id) ? 'is-active' : ''}`}
                        onClick={() => toggleOrganizationFilter(organization.id)}
                      >
                        {organization.name}
                      </button>
                    ))}
                  </div>
                </div>
                {canScrollOrgFilterRight ? (
                  <button
                    type="button"
                    className="manage-users-org-filter__nav manage-users-org-filter__nav--right"
                    aria-label="Scroll organizations right"
                    onClick={() => scrollOrganizationFilter('right')}
                  >
                    {'>'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="manage-users-toolbar">
            <div className="manage-users-toolbar__grid">
              <label className="manage-users-toolbar__field manage-users-toolbar__field--search">
                <span>Search</span>
                <input
                  className="input-inline"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by username or email"
                />
              </label>

              <label className="manage-users-toolbar__field">
                <span>Org Role</span>
                <select className="select-inline" value={selectedOrgRole} onChange={(event) => setSelectedOrgRole(event.target.value)}>
                  <option value="all">All roles</option>
                  {orgRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="manage-users-toolbar__field">
                <span>System Role</span>
                <select className="select-inline" value={selectedSystemRole} onChange={(event) => setSelectedSystemRole(event.target.value)}>
                  <option value="all">All system roles</option>
                  {systemRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="manage-users-toolbar__summary body-copy">
              Showing {filteredMembers.length} of {members.length} members
            </p>
          </div>

          {filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <div key={membershipKey(member.orgId, member.user_id)} className="member-card">
                <div className="member-card__header">
                  <strong>{member.username}</strong>
                  <span className={`pill ${member.is_owner ? 'pill--success' : ''}`}>{member.org_role}</span>
                </div>
                <p>{member.email}</p>
                <span className="body-copy">Organization: {member.orgName}</span>
                <div className="action-row__controls">
                  {!member.is_owner ? (
                    <>
                      <select
                        className="input-inline select-inline"
                        value={draftRoles[membershipKey(member.orgId, member.user_id)] ?? member.org_role}
                        onChange={(event) =>
                          setDraftRoles((current) => ({
                            ...current,
                            [membershipKey(member.orgId, member.user_id)]: event.target.value,
                          }))
                        }
                      >
                        {MANAGEABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="button button--primary"
                        disabled={pendingMembershipKey === membershipKey(member.orgId, member.user_id)}
                        onClick={() =>
                          void runWithMember(member, async () => {
                            await updateOrganizationMemberRole(
                              session!.accessToken,
                              member.orgId,
                              member.user_id,
                              (draftRoles[membershipKey(member.orgId, member.user_id)] ?? member.org_role) as OrgRole,
                            )
                            setMessage(`Member role updated in ${member.orgName}.`)
                          })
                        }
                      >
                        Save Role
                      </button>
                      <button
                        type="button"
                        className="button button--ghost"
                        disabled={pendingMembershipKey === membershipKey(member.orgId, member.user_id)}
                        onClick={() =>
                          void runWithMember(member, async () => {
                            await transferOrganizationOwner(session!.accessToken, member.orgId, member.user_id)
                            setMessage(`Ownership of ${member.orgName} transferred.`)
                          })
                        }
                      >
                        Make Owner of {member.orgName}
                      </button>
                      <button
                        type="button"
                        className="button button--ghost"
                        disabled={pendingMembershipKey === membershipKey(member.orgId, member.user_id)}
                        onClick={() =>
                          void runWithMember(member, async () => {
                            await removeOrganizationMember(session!.accessToken, member.orgId, member.user_id)
                            setMessage(`Member removed from ${member.orgName}.`)
                          })
                        }
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <span className="body-copy">Current owner of {member.orgName}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="manage-users-empty">
              <strong>{hasActiveFilters ? 'No members match these filters.' : 'No members found yet.'}</strong>
              <p className="body-copy">
                {hasActiveFilters
                  ? 'Try clearing the search or filters to see more members.'
                  : 'Members will appear here once the organization has invited or added users.'}
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {isCreateModalOpen ? (
        <div className="manage-users-modal-backdrop" role="presentation" onClick={closeCreateModal}>
          <section
            className="manage-users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-users-create-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="manage-users-modal__header">
              <h2 id="manage-users-create-title">Create User</h2>
              <p className="body-copy">This creates a login account and adds the user to the organization selected below immediately.</p>
            </div>

            <form className="auth-stack" onSubmit={handleCreateUser}>
              {createError ? <FormMessage tone="error">{createError}</FormMessage> : null}

              <label className="manage-users-modal__field">
                <span>Organization</span>
                <select
                  className="input-inline select-inline"
                  value={createForm.orgId}
                  onChange={(event) => setCreateForm((current) => ({ ...current, orgId: Number(event.target.value) || 0 }))}
                  disabled={createPending || availableOrganizations.length === 0}
                >
                  {availableOrganizations.length > 0 ? (
                    availableOrganizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))
                  ) : (
                    <option value={0}>No organizations available</option>
                  )}
                </select>
              </label>
              <AuthField
                label="Username"
                placeholder="new.user"
                icon="users"
                name="username"
                autoComplete="username"
                value={createForm.username}
                onChange={(event) => setCreateForm((current) => ({ ...current, username: event.target.value }))}
                disabled={createPending}
                error={Boolean(createError)}
              />
              <AuthField
                label="Email"
                placeholder="name@example.com"
                icon="mail"
                type="email"
                name="email"
                autoComplete="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                disabled={createPending}
                error={Boolean(createError)}
              />
              <label className="manage-users-modal__field">
                <span>Org Role</span>
                <select
                  className="input-inline select-inline"
                  value={createForm.orgRole}
                  onChange={(event) => setCreateForm((current) => ({ ...current, orgRole: event.target.value as OrgRole }))}
                  disabled={createPending}
                >
                  {MANAGEABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <AuthField
                label="Password"
                placeholder="Create password"
                icon="lock"
                type="password"
                name="password"
                autoComplete="new-password"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                disabled={createPending}
                error={Boolean(createError)}
                allowVisibilityToggle
              />
              <AuthField
                label="Confirm"
                placeholder="Repeat password"
                icon="lock"
                type="password"
                name="confirm_password"
                autoComplete="new-password"
                value={createForm.confirmPassword}
                onChange={(event) => setCreateForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                disabled={createPending}
                error={Boolean(createError)}
                allowVisibilityToggle
              />

              <div className="auth-actions-row">
                <button type="submit" className="button button--primary" disabled={createPending || availableOrganizations.length === 0}>
                  {createPending ? 'Creating...' : 'Create User'}
                </button>
                <button type="button" className="button button--ghost" disabled={createPending} onClick={closeCreateModal}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}
