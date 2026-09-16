import { Briefcase, Compass, Crown, Flag, MessagesSquare, PenSquare, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { Card, CardHeader } from '../../components/common/Card';
import { ErrorState, Skeleton } from '../../components/common/Feedback';
import { RelativeTime } from '../../components/common/Misc';
import { CommunityIcon } from '../../components/community/CommunityCard';
import { useGetAdminStatsQuery, useListAuditLogsQuery } from '../../features/admin/adminApi';
import { useDocumentTitle } from '../../hooks/common';
import { useTheme } from '../../hooks/useTheme';
import { formatCompactNumber, formatDate } from '../../utils/format';

/**
 * Chart colours come from the validated reference palette (categorical slots 1-3),
 * stepped per mode. Text always uses ink tokens, never a series colour.
 */
const CHART_COLORS = {
  light: { series1: '#2a78d6', series2: '#eb6834', series3: '#1baf7a', grid: '#e3e6ef', axis: '#737a93' },
  dark: { series1: '#3987e5', series2: '#d95926', series3: '#199e70', grid: '#242a3a', axis: '#767d96' },
};

const shortDate = (value) => formatDate(value, { month: 'short', day: 'numeric' });

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-elevated">
      <p className="font-medium text-fg">{formatDate(label, { dateStyle: 'medium' })}</p>
      <p className="mt-0.5 text-fg-muted">
        <span className="font-semibold text-fg tabular-nums">{payload[0].value}</span> {unit}
      </p>
    </div>
  );
}

function TrendChart({ type, data, color, grid, axis, unit, tickInterval }) {
  const ChartComponent = type === 'area' ? AreaChart : BarChart;
  return (
    <div className="h-56 w-full px-2 pb-3">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={grid} strokeWidth={1} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            interval={tickInterval}
            tickLine={false}
            axisLine={{ stroke: grid }}
            tick={{ fontSize: 11, fill: axis }}
            minTickGap={8}
          />
          <YAxis allowDecimals={false} width={44} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: axis }} />
          <Tooltip cursor={{ fill: grid, fillOpacity: 0.35 }} content={<ChartTooltip unit={unit} />} />
          {type === 'area' ? (
            <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.1} activeDot={{ r: 4, strokeWidth: 2 }} />
          ) : (
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, hint, tone = 'neutral', to }) {
  const tones = {
    neutral: 'text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400',
    pro: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
    danger: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400',
  };
  const content = (
    <Card className="h-full p-4 transition-colors hover:border-line-strong">
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex size-8 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <p className="text-sm text-fg-muted">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-fg">{formatCompactNumber(value)}</p>
      {hint && <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>}
    </Card>
  );
  return to ? <Link to={to} className="block rounded-2xl">{content}</Link> : content;
}

function PlanMix({ totals, colors }) {
  const segments = [
    { key: 'free', label: 'Free', value: totals.freeUsers, color: colors.series1 },
    { key: 'pro', label: 'Pro', value: totals.proUsers, color: colors.series2 },
    { key: 'admin', label: 'Admin', value: totals.adminUsers, color: colors.series3 },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  return (
    <Card>
      <CardHeader title="Plan mix" description={`${formatCompactNumber(total)} members`} />
      <div className="p-5 pt-4">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}>
          {segments
            .filter((segment) => segment.value > 0)
            .map((segment) => (
              <div key={segment.key} style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }} />
            ))}
        </div>
        <ul className="mt-4 space-y-2">
          {segments.map((segment) => (
            <li key={segment.key} className="flex items-center gap-2 text-sm">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
              <span className="flex-1 text-fg-muted">{segment.label}</span>
              <span className="font-medium text-fg tabular-nums">{segment.value}</span>
              <span className="w-12 text-right text-xs text-fg-subtle tabular-nums">{Math.round((segment.value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function AuditLog() {
  const { data, isLoading } = useListAuditLogsQuery({ limit: 8 });
  return (
    <Card>
      <CardHeader title="Recent admin activity" description="Every moderation action is logged" />
      <ul className="divide-y divide-line px-5 pb-2">
        {isLoading && [0, 1, 2].map((index) => <li key={index} className="py-3"><Skeleton className="h-4 w-full" /></li>)}
        {data?.items.length === 0 && <li className="py-4 text-sm text-fg-subtle">No admin actions recorded yet.</li>}
        {data?.items.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 py-3 text-sm">
            <Avatar user={entry.actor} size="xs" />
            <span className="min-w-0 flex-1 truncate text-fg-muted">
              <span className="font-medium text-fg">{entry.actor?.name ?? 'Admin'}</span>{' '}
              <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-xs">{entry.action}</code>
            </span>
            <RelativeTime value={entry.createdAt} className="shrink-0 text-xs text-fg-subtle" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function AdminDashboardPage() {
  useDocumentTitle('Admin · Overview');
  const { isDark } = useTheme();
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;
  const { data: stats, isLoading, error, refetch } = useGetAdminStatsQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { totals, series, recentUsers, topCommunities } = stats;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile icon={Users} label="Members" value={totals.users} hint={`+${totals.newUsersThisWeek} this week`} to="/admin/users" />
        <StatTile icon={Crown} label="Pro members" value={totals.proUsers} hint={`${Math.round((totals.proUsers / (totals.users || 1)) * 100)}% of members`} tone="pro" />
        <StatTile icon={Compass} label="Communities" value={totals.communities} hint={`${totals.proCommunities} Pro-only`} to="/admin/communities" />
        <StatTile icon={PenSquare} label="Posts" value={totals.posts} hint={`${formatCompactNumber(totals.comments)} comments`} />
        <StatTile icon={MessagesSquare} label="Messages (7d)" value={totals.messagesThisWeek} hint={`${formatCompactNumber(totals.conversations)} conversations`} />
        <StatTile icon={Flag} label="Open reports" value={totals.openReports} hint="Moderation queue" tone={totals.openReports > 0 ? 'danger' : 'neutral'} to="/admin/reports" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="New members" description="Sign-ups per day, last 30 days" />
          <TrendChart type="area" data={series.signups} color={colors.series1} grid={colors.grid} axis={colors.axis} unit="new members" tickInterval={6} />
        </Card>
        <Card>
          <CardHeader title="Posts published" description="Per day, last 30 days" />
          <TrendChart type="bar" data={series.posts} color={colors.series1} grid={colors.grid} axis={colors.axis} unit="posts" tickInterval={6} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title="Messages sent" description="Per day, last 14 days" />
          <TrendChart type="bar" data={series.messages} color={colors.series1} grid={colors.grid} axis={colors.axis} unit="messages" tickInterval={2} />
        </Card>
        <PlanMix totals={totals} colors={colors} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Newest members" action={<Link to="/admin/users" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">Manage</Link>} />
          <ul className="divide-y divide-line px-5 pb-2">
            {recentUsers.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-3">
                <Avatar user={member} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link to={`/profile/${member.username}`} className="block truncate text-sm font-medium text-fg hover:underline">{member.name}</Link>
                  <span className="block truncate text-xs text-fg-subtle">{member.email}</span>
                </div>
                {member.status === 'suspended' ? <Badge variant="danger">Suspended</Badge> : <Badge variant={member.role === 'ProMember' ? 'pro' : 'neutral'}>{member.role === 'ProMember' ? 'Pro' : member.role === 'Admin' ? 'Admin' : 'Free'}</Badge>}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Largest communities" action={<Link to="/admin/communities" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">Manage</Link>} />
          <ul className="divide-y divide-line px-5 pb-2">
            {topCommunities.map((community) => (
              <li key={community.id} className="flex items-center gap-3 py-3">
                <CommunityIcon community={community} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link to={`/communities/${community.slug}`} className="block truncate text-sm font-medium text-fg hover:underline">{community.name}</Link>
                  <span className="block text-xs text-fg-subtle">{formatCompactNumber(community.memberCount)} members · {formatCompactNumber(community.postCount)} posts</span>
                </div>
                {community.accessType === 'pro' && <Badge variant="pro">Pro</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <AuditLog />
    </div>
  );
}
