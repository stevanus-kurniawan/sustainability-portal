import { UserLandingDashboard } from '@/components/layout/UserLandingDashboard';

export const metadata = {
  title: 'Home',
  description: 'Your SLMS dashboard',
};

export default function HomePage() {
  return <UserLandingDashboard />;
}
