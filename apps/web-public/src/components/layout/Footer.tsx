import Link from 'next/link';
import { Leaf } from 'lucide-react';

const footerLinks = {
  portal: [
    { name: 'Policies', href: '/policies' },
    { name: 'Certifications', href: '/certifications' },
    { name: 'Licenses', href: '/licenses' },
    { name: 'Document Library', href: '/library' },
  ],
  compliance: [
    { name: 'Grievance Mechanism', href: '/grievance' },
    { name: 'Supply Chain Traceability', href: '/traceability' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-charcoal text-white/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="font-heading text-lg font-bold text-white">SLMS</span>
                <span className="block text-xs text-white/60">Sustainability Portal</span>
              </div>
            </div>
            <p className="text-sm text-white/60 max-w-md">
              Committed to transparency, sustainability, and responsible business practices. 
              Access our certifications, licenses, and compliance documentation.
            </p>
          </div>

          {/* Portal Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Portal</h3>
            <ul className="space-y-2">
              {footerLinks.portal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Compliance</h3>
            <ul className="space-y-2">
              {footerLinks.compliance.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10">
          <p className="text-center text-xs text-white/40">
            © {new Date().getFullYear()} Sustainability Licensing Management System. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
