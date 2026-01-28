import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-light">
      <aside className="w-64 bg-surface border-r border-border-light p-4">
        <h1 className="text-h3 font-heading mb-4">SLMS Admin</h1>
        <nav className="space-y-2 text-sm">
          <a href="/admin/dashboard" className="block hover:text-brand-primary">
            Dashboard
          </a>
          <a
            href="/admin/certifications"
            className="block hover:text-brand-primary"
          >
            Certifications
          </a>
          <a href="/admin/licenses" className="block hover:text-brand-primary">
            Licenses
          </a>
          <a href="/admin/documents" className="block hover:text-brand-primary">
            Documents
          </a>
          <a href="/admin/grievance" className="block hover:text-brand-primary">
            Grievance
          </a>
          <a
            href="/admin/traceability"
            className="block hover:text-brand-primary"
          >
            Traceability
          </a>
          <a
            href="/admin/audit-logs"
            className="block hover:text-brand-primary"
          >
            Audit Logs
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
