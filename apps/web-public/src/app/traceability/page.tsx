import { Suspense } from 'react';
import { GitBranch, Factory, Truck, MapPin, Calendar, FileCheck, Search } from 'lucide-react';
import { getTraceability, getTraceabilityEntities, type TraceabilityRecord, type TraceabilityEntity } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, Badge, EmptyState, CardSkeleton } from '@/components/ui';

export const metadata = {
  title: 'Supply Chain Traceability',
  description: 'Supply chain transparency and origin tracking',
};

const entityTypeIcons = {
  FACTORY: Factory,
  SUPPLIER: Truck,
  SITE: MapPin,
};

const entityTypeColors = {
  FACTORY: 'bg-primary/10 text-primary',
  SUPPLIER: 'bg-warning/10 text-warning',
  SITE: 'bg-success/10 text-success',
};

const recordTypeLabels = {
  AUDIT: 'Audit Report',
  CHAIN_OF_CUSTODY: 'Chain of Custody',
  ORIGIN: 'Origin Verification',
};

async function TraceabilityContent() {
  const [recordsResponse, entitiesResponse] = await Promise.all([
    getTraceability({ pageSize: 50 }),
    getTraceabilityEntities({ pageSize: 100 }),
  ]);

  const records = recordsResponse.data || [];
  const entities = entitiesResponse.data || [];

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group entities by type
  const factories = entities.filter((e: TraceabilityEntity) => e.attributes.entityType === 'FACTORY');
  const suppliers = entities.filter((e: TraceabilityEntity) => e.attributes.entityType === 'SUPPLIER');
  const sites = entities.filter((e: TraceabilityEntity) => e.attributes.entityType === 'SITE');

  if (entities.length === 0 && records.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title="No traceability data available"
        description="Supply chain traceability information will be published here once available."
      />
    );
  }

  return (
    <div className="space-y-12">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-primary">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Factory className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{factories.length}</p>
                <p className="text-sm text-steel">Factories</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-warning">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Truck className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{suppliers.length}</p>
                <p className="text-sm text-steel">Suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-success">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{sites.length}</p>
                <p className="text-sm text-steel">Sites</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supply Chain Entities */}
      <div>
        <h2 className="font-heading text-h3 text-charcoal mb-6 flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-brand-deep" />
          Supply Chain Entities
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((entity: TraceabilityEntity) => {
            const IconComponent = entityTypeIcons[entity.attributes.entityType] || Factory;
            const colorClass = entityTypeColors[entity.attributes.entityType] || entityTypeColors.FACTORY;

            return (
              <Card key={entity.id} hover>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-charcoal mb-1 truncate">
                        {entity.attributes.name}
                      </h3>
                      <div className="space-y-1 text-sm text-steel">
                        <Badge variant="outline" className="text-xs">
                          {entity.attributes.entityType}
                        </Badge>
                        {entity.attributes.code && (
                          <p className="truncate">Code: {entity.attributes.code}</p>
                        )}
                        {entity.attributes.region && (
                          <p className="truncate flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {entity.attributes.region}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Traceability Records */}
      {records.length > 0 && (
        <div>
          <h2 className="font-heading text-h3 text-charcoal mb-6 flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            Traceability Records
          </h2>

          <div className="space-y-4">
            {records.map((record: TraceabilityRecord) => (
              <Card key={record.id} hover>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="info">
                          {recordTypeLabels[record.attributes.recordType] || record.attributes.recordType}
                        </Badge>
                        {record.attributes.entity?.data && (
                          <span className="text-sm font-medium text-charcoal">
                            {record.attributes.entity.data.attributes.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-steel">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(record.attributes.recordDate)}
                        </span>
                        {record.attributes.entity?.data?.attributes?.region && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {record.attributes.entity.data.attributes.region}
                          </span>
                        )}
                      </div>
                    </div>
                    {record.attributes.evidenceDocument?.data?.attributes?.currentVersion?.data?.attributes?.file?.data && (
                      <a
                        href={record.attributes.evidenceDocument.data.attributes.currentVersion.data.attributes.file.data.attributes.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline text-sm flex-shrink-0"
                      >
                        View Evidence
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TraceabilityLoading() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function TraceabilityPage() {
  return (
    <div>
      <PageHeader
        title="Supply Chain Traceability"
        description="Explore our supply chain transparency data, including factory locations, supplier information, and origin verification records."
      />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Information Box */}
          <Card className="mb-8 bg-brand-deep/5 border-brand-deep/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-brand-deep/10 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="h-5 w-5 text-brand-deep" />
                </div>
                <div>
                  <h3 className="font-medium text-charcoal mb-1">
                    Supply Chain Transparency
                  </h3>
                  <p className="text-sm text-steel">
                    We are committed to full transparency in our supply chain. This page provides 
                    information about our suppliers, manufacturing facilities, and sourcing locations, 
                    along with audit reports and chain of custody documentation where available.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Suspense fallback={<TraceabilityLoading />}>
            <TraceabilityContent />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
