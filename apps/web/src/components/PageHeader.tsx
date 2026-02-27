interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional banner image path (e.g. /banners/section.jpg). Rendered as background with overlay. */
  bannerImage?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, bannerImage, children }: PageHeaderProps) {
  const style = bannerImage
    ? { backgroundImage: `url(${bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  return (
    <div
      className="relative py-12 sm:py-16 bg-charcoal"
      style={style}
    >
      {bannerImage && <div className="absolute inset-0 bg-charcoal/75" aria-hidden />}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-h1 text-white mb-4">{title}</h1>
        {description && <p className="text-lg text-white/90 max-w-3xl">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
