import type { ReactNode } from 'react'
import { BrandMark } from './ui'

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="auth-screen">
      <div className="auth-screen__hero auth-screen__hero--compact">
        <BrandMark />
      </div>

      <div className="auth-card">
        <div className="auth-card__header">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="auth-form">{children}</div>
        {footer ? <div className="auth-card__footer">{footer}</div> : null}
      </div>
    </div>
  )
}
