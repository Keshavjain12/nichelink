import { Flag, LayoutDashboard, Users, Compass } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { PageHeader } from '../../components/common/Misc';
import { NavTabs } from '../../components/common/Tabs';
import { useGetAdminStatsQuery } from '../../features/admin/adminApi';

export default function AdminLayout() {
  const { data: stats } = useGetAdminStatsQuery();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Admin dashboard"
        description="Platform health, members, communities and moderation."
      />
      <NavTabs
        label="Admin sections"
        tabs={[
          { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
          { to: '/admin/users', label: 'Users', icon: Users },
          { to: '/admin/communities', label: 'Communities', icon: Compass },
          {
            to: '/admin/reports',
            label: 'Reports',
            icon: Flag,
            count: stats?.totals.openReports || undefined,
          },
        ]}
      />
      <Outlet />
    </div>
  );
}
