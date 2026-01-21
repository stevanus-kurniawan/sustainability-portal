import Link from 'next/link';
import {
  FileText,
  Award,
  ScrollText,
  MessageSquareWarning,
  GitBranch,
  Library,
  ArrowRight,
  Shield,
  Leaf,
  Globe,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

const features = [
  {
    name: 'Policies',
    description: 'Corporate sustainability policies and commitments',
    href: '/policies',
    icon: FileText,
    color: 'bg-primary/10 text-primary',
  },
  {
    name: 'Certifications',
    description: 'Sustainability certifications and standards compliance',
    href: '/certifications',
    icon: Award,
    color: 'bg-success/10 text-success',
  },
  {
    name: 'Licenses',
    description: 'Operating licenses and regulatory approvals',
    href: '/licenses',
    icon: ScrollText,
    color: 'bg-warning/10 text-warning',
  },
  {
    name: 'Grievance',
    description: 'Grievance mechanism for stakeholder concerns',
    href: '/grievance',
    icon: MessageSquareWarning,
    color: 'bg-danger/10 text-danger',
  },
  {
    name: 'Traceability',
    description: 'Supply chain transparency and origin tracking',
    href: '/traceability',
    icon: GitBranch,
    color: 'bg-brand-deep/10 text-brand-deep',
  },
  {
    name: 'Library',
    description: 'Browse and download public documents',
    href: '/library',
    icon: Library,
    color: 'bg-charcoal/10 text-charcoal',
  },
];

const highlights = [
  {
    icon: Shield,
    title: 'Verified Compliance',
    description: 'All certifications and licenses are verified and up-to-date',
  },
  {
    icon: Leaf,
    title: 'Sustainability First',
    description: 'Committed to environmental and social responsibility',
  },
  {
    icon: Globe,
    title: 'Full Transparency',
    description: 'Open access to our sustainability documentation',
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-charcoal via-charcoal to-brand-deep overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="h-7 w-7 text-white" />
              </div>
              <span className="text-white/60 text-sm font-medium uppercase tracking-wider">
                Sustainability Portal
              </span>
            </div>
            
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Transparency in{' '}
              <span className="text-primary">Sustainability</span>
            </h1>
            
            <p className="text-lg text-white/70 mb-8 max-w-xl">
              Access our certifications, licenses, policies, and compliance documentation.
              We believe in full transparency and accountability in our sustainability journey.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/library"
                className="btn-primary px-6 py-3 text-base"
              >
                Browse Documents
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/certifications"
                className="btn bg-white/10 text-white hover:bg-white/20 px-6 py-3 text-base"
              >
                View Certifications
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-lighter py-8 border-b border-border-light">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlights.map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-charcoal">{item.title}</h3>
                  <p className="text-sm text-steel">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-h2 text-charcoal mb-4">
              Explore Our Portal
            </h2>
            <p className="text-steel max-w-2xl mx-auto">
              Access comprehensive documentation on our sustainability practices,
              certifications, and compliance status.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Link key={feature.name} href={feature.href}>
                <Card hover className="h-full">
                  <CardContent className="p-6">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.color} mb-4`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-charcoal mb-2">
                      {feature.name}
                    </h3>
                    <p className="text-sm text-steel mb-4">
                      {feature.description}
                    </p>
                    <span className="inline-flex items-center text-sm font-medium text-primary">
                      Learn more
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-charcoal py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-h2 text-white mb-4">
            Have Questions or Concerns?
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto mb-8">
            Our grievance mechanism is available for stakeholders to raise concerns
            about our sustainability practices.
          </p>
          <Link
            href="/grievance"
            className="btn bg-primary text-white hover:bg-primary-hover px-8 py-3 text-base"
          >
            Access Grievance Portal
          </Link>
        </div>
      </section>
    </div>
  );
}
