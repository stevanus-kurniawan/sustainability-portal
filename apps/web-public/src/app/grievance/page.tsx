import { Suspense } from 'react';
import { MessageSquareWarning, Calendar, Hash, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { getGrievances, type GrievanceCase } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, StatusBadge, Badge, EmptyState, CardSkeleton } from '@/components/ui';

export const metadata = {
  title: 'Grievance Mechanism',
  description: 'Public grievance mechanism for stakeholder concerns',
};

async function GrievanceList() {
  const { data: grievances } = await getGrievances({ pageSize: 50 });

  if (!grievances || grievances.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title="No public grievances"
        description="Public grievance summaries will be displayed here when available."
      />
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group by status
  const open = grievances.filter((g: GrievanceCase) => g.attributes.status === 'OPEN');
  const inReview = grievances.filter((g: GrievanceCase) => g.attributes.status === 'IN_REVIEW');
  const closed = grievances.filter((g: GrievanceCase) => g.attributes.status === 'CLOSED');

  return (
    <div className="space-y-12">
      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{open.length}</p>
                <p className="text-sm text-steel">Open Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{inReview.length}</p>
                <p className="text-sm text-steel">Under Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{closed.length}</p>
                <p className="text-sm text-steel">Resolved Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Cases */}
      {(open.length > 0 || inReview.length > 0) && (
        <div>
          <h2 className="font-heading text-h3 text-charcoal mb-6 flex items-center gap-2">
            <MessageSquareWarning className="h-6 w-6 text-primary" />
            Active Cases
          </h2>
          <div className="space-y-4">
            {[...open, ...inReview].map((grievance: GrievanceCase) => (
              <GrievanceCard key={grievance.id} grievance={grievance} formatDate={formatDate} />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Cases */}
      {closed.length > 0 && (
        <div>
          <h2 className="font-heading text-h3 text-charcoal mb-6 flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-success" />
            Resolved Cases
          </h2>
          <div className="space-y-4">
            {closed.map((grievance: GrievanceCase) => (
              <GrievanceCard key={grievance.id} grievance={grievance} formatDate={formatDate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GrievanceCard({
  grievance,
  formatDate,
}: {
  grievance: GrievanceCase;
  formatDate: (date: string) => string;
}) {
  return (
    <Card hover>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-danger/10 flex items-center justify-center">
            <MessageSquareWarning className="h-5 w-5 text-danger" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-sm text-primary font-medium">
                #{grievance.attributes.caseNo}
              </span>
              <StatusBadge status={grievance.attributes.status} />
              {grievance.attributes.category && (
                <Badge variant="outline">{grievance.attributes.category}</Badge>
              )}
            </div>

            {grievance.attributes.publicSummary && (
              <p className="text-sm text-charcoal mb-3">
                {grievance.attributes.publicSummary}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-steel">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Received: {formatDate(grievance.attributes.receivedDate)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GrievanceLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      {[...Array(4)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function GrievancePage() {
  return (
    <div>
      <PageHeader
        title="Grievance Mechanism"
        description="Our commitment to transparency includes publishing anonymized summaries of stakeholder grievances and their resolution status."
      />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Information Box */}
          <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-charcoal mb-1">
                    About Our Grievance Mechanism
                  </h3>
                  <p className="text-sm text-steel">
                    We maintain an open grievance mechanism for stakeholders to raise concerns about our 
                    sustainability practices. All grievances are investigated thoroughly, and anonymized 
                    summaries are published here for transparency. Personal information is protected in 
                    accordance with our privacy policy.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Suspense fallback={<GrievanceLoading />}>
            <GrievanceList />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
