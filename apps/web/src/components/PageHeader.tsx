interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="bg-charcoal py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-h1 text-white mb-4">{title}</h1>
        {description && <p className="text-lg text-white/70 max-w-3xl">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
