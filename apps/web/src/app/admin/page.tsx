import Link from 'next/link';
import { Award, FileText, FolderOpen, Leaf, Scale, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export const metadata = {
  title: 'Admin',
  description: 'SLMS Admin dashboard',
};

const sections = [
  { name: 'Policies', href: '/admin/policies', icon: FileText, description: 'Manage policy documents.' },
  { name: 'Procedure', href: '/admin/procedure/sop', icon: FolderOpen, description: 'SOP and forms.' },
  { name: 'Sustainability', href: '/admin/sustainability/reports', icon: Leaf, description: 'Reports and certificates.' },
  { name: 'Compliance', href: '/admin/compliance/national', icon: Scale, description: 'National, international, standard, licenses.' },
  { name: 'Certifications', href: '/admin/certifications', icon: Award, description: 'Manage certifications.' },
  { name: 'Licenses', href: '/admin/licenses', icon: Scale, description: 'Manage licenses.' },
  { name: 'Grievance', href: '/admin/grievance', icon: AlertCircle, description: 'Manage grievance cases.' },
];

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="font-heading text-h1 text-charcoal mb-2">Admin Dashboard</h1>
        <p className="text-steel">Manage policies, procedures, sustainability, compliance, and grievances.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map(({ name, href, icon: Icon, description }) => (
          <Link key={href} href={href}>
            <Card hover className="h-full">
              <CardContent className="p-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="font-heading text-lg font-semibold text-charcoal mb-2">{name}</h2>
                <p className="text-sm text-steel">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
