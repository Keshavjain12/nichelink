import {
  ArrowRight,
  Briefcase,
  Check,
  Compass,
  Crown,
  Heart,
  Lock,
  MessageCircle,
  MessagesSquare,
  Quote,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Skeleton } from '../components/common/Feedback';
import { PublicFooter, PublicNavbar } from '../components/layout/PublicLayout';
import { useGetConfigQuery } from '../app/api';
import { useListCommunitiesQuery } from '../features/communities/communitiesApi';
import { useDocumentTitle } from '../hooks/common';
import { formatCompactNumber } from '../utils/format';

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:mx-0" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-brand-500/25 via-violet-500/15 to-transparent blur-2xl" />
      <Card className="relative overflow-hidden shadow-elevated">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/15 text-xl">🚀</span>
          <div>
            <p className="text-sm font-semibold">SaaS Developers</p>
            <p className="text-xs text-fg-subtle">9 members · 4 new discussions today</p>
          </div>
          <Badge variant="success" className="ml-auto">Joined</Badge>
        </div>
        <div className="space-y-3 p-5">
          {[
            { name: 'Daniel Okafor', color: 'bg-emerald-500', title: 'We rewrote billing on Stripe — 5 lessons', likes: 8, replies: 6, pro: true },
            { name: 'Amara Nwosu', color: 'bg-rose-500', title: 'Row-level security vs schema-per-tenant?', likes: 3, replies: 12, pro: true },
          ].map((post) => (
            <div key={post.title} className="rounded-xl border border-line bg-surface-muted/60 p-4">
              <div className="flex items-center gap-2">
                <span className={`flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${post.color}`}>
                  {post.name.split(' ').map((part) => part[0]).join('')}
                </span>
                <span className="text-xs font-medium">{post.name}</span>
                {post.pro && <Badge variant="pro" icon={Crown}>Pro</Badge>}
              </div>
              <p className="mt-2 text-sm font-semibold">{post.title}</p>
              <div className="mt-2 flex gap-4 text-xs text-fg-subtle">
                <span className="inline-flex items-center gap-1"><Heart className="size-3.5" /> {post.likes}</span>
                <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5" /> {post.replies}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="absolute -right-4 -bottom-8 hidden w-60 p-3 shadow-elevated sm:block">
        <div className="flex items-center gap-2">
          <span className="relative flex size-8 items-center justify-center rounded-full bg-violet-500 text-xs font-semibold text-white">
            ML
            <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold">Mei Lin Zhang</p>
            <p className="truncate text-xs text-fg-subtle">Want to compare eval setups?</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

const PROBLEMS = [
  { title: 'Generic networks are too broad', body: 'Feeds optimised for reach bury the practical, niche conversations you actually need.' },
  { title: 'Chat groups are too transient', body: 'Great answers disappear in Slack and Discord scrollback within a week.' },
  { title: 'Remote work is isolating', body: 'Without hallway conversations it is hard to find peers who face your exact problems.' },
];

const STEPS = [
  { icon: Compass, title: 'Join your niche', body: 'Pick focused communities like AI Engineers, Technical Writers or Digital Nomads.' },
  { icon: MessageCircle, title: 'Learn from practitioners', body: 'Read searchable, threaded discussions that stay useful long after they are posted.' },
  { icon: Briefcase, title: 'Collaborate', body: 'Message peers in real time and team up through Project Match.' },
];

const FEATURES = [
  { icon: Users, title: 'Niche communities', body: 'Public boards plus private Pro communities with moderators and clear rules.' },
  { icon: MessagesSquare, title: 'Real-time messaging', body: 'Instant 1-on-1 chat with typing indicators, presence and read receipts.' },
  { icon: Briefcase, title: 'Project Match', body: 'Post collaboration requests and find contributors by skill and commitment.' },
  { icon: Sparkles, title: 'Rich discussions', body: 'Formatted posts with images, nested replies and reactions.' },
  { icon: Zap, title: 'Smart discovery', body: 'Trending threads and community recommendations based on your skills.' },
  { icon: ShieldCheck, title: 'Safe by design', body: 'Moderation tools, reporting and a security-first architecture.' },
];

const STORIES = [
  { quote: 'I found my first docs contract through a single thread in Technical Writers.', name: 'Sofia M.', role: 'Technical Writer' },
  { quote: 'The Founders Circle is the only place I share real revenue numbers.', name: 'Kenji W.', role: 'Solo SaaS founder' },
  { quote: 'Project Match got me two contributors for my open-source CLI in a week.', name: 'Daniel O.', role: 'Founding Engineer' },
];

function FeaturedCommunities() {
  const { data, isLoading } = useListCommunitiesQuery({ featured: true, limit: 6 });

  return (
    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {isLoading &&
        Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-40 rounded-2xl" />)}
      {data?.items.map((community) => (
        <Link key={community.id} to={`/communities/${community.slug}`} className="group rounded-2xl">
          <Card className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-elevated">
            <div className="flex items-start justify-between">
              <span className="flex size-12 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: `${community.accentColor}1f` }}>
                {community.icon}
              </span>
              {community.accessType === 'pro' && <Badge variant="pro" icon={Lock}>Pro</Badge>}
            </div>
            <h3 className="mt-4 font-semibold text-fg">{community.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{community.tagline}</p>
            <p className="mt-3 text-xs text-fg-subtle">
              {formatCompactNumber(community.memberCount)} members · {formatCompactNumber(community.postCount)} discussions
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function PlanComparison() {
  const { data: config } = useGetConfigQuery();
  const plans = config?.plans ?? [];

  return (
    <div className="mx-auto mt-10 grid grid-cols-1 max-w-4xl gap-6 md:grid-cols-2">
      {plans.map((plan) => {
        const isPro = plan.id === 'pro';
        return (
          <Card key={plan.id} className={`relative p-7 ${isPro ? 'border-brand-300 ring-2 ring-brand-500/20 dark:border-brand-500/40' : ''}`}>
            {isPro && <Badge variant="brand" className="absolute top-6 right-6">Most popular</Badge>}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-2">
              <span className="text-4xl font-bold tracking-tight">${plan.priceMonthly}</span>
              <span className="text-sm text-fg-subtle"> / month</span>
            </p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-sm text-fg-muted">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button as={Link} to={isPro ? '/pricing' : '/register'} variant={isPro ? 'primary' : 'secondary'} className="mt-8 w-full">
              {isPro ? 'Go Pro' : 'Start for free'}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}

function Section({ id, eyebrow, title, description, children, className = '' }) {
  return (
    <section id={id} className={`scroll-mt-20 px-4 py-20 sm:px-6 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h2>
          {description && <p className="mt-4 text-base text-fg-muted">{description}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

export default function LandingPage() {
  useDocumentTitle();

  return (
    <div className="min-h-dvh bg-canvas">
      <PublicNavbar />
      <main id="main-content">
        <section className="relative overflow-hidden px-4 pt-16 pb-24 sm:px-6 lg:pt-24">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.14),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-16 lg:grid-cols-2">
            <div>
              <Badge variant="brand" icon={Sparkles}>Built for remote professionals</Badge>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-fg sm:text-5xl lg:text-6xl">
                Find your people.
                <span className="block bg-gradient-to-r from-brand-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                  Build your niche.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-fg-muted">
                NicheLink brings remote workers together in focused, persistent communities — with threaded discussions,
                real-time messaging and a place to find your next collaborator.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button as={Link} to="/register" size="lg" rightIcon={ArrowRight}>
                  Join for free
                </Button>
                <Button as={Link} to="/communities" size="lg" variant="secondary">
                  Explore communities
                </Button>
              </div>
              <p className="mt-4 text-sm text-fg-subtle">Free forever plan · No credit card required</p>
            </div>
            <HeroPreview />
          </div>
        </section>

        <Section eyebrow="The problem" title="Remote work needs better places to belong" className="bg-surface">
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PROBLEMS.map((problem, index) => (
              <div key={problem.title} className="rounded-2xl border border-line bg-canvas p-6">
                <span className="font-mono text-sm text-brand-600 dark:text-brand-400">0{index + 1}</span>
                <h3 className="mt-3 font-semibold text-fg">{problem.title}</h3>
                <p className="mt-2 text-sm leading-6 text-fg-muted">{problem.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="how-it-works" eyebrow="How it works" title="From lurker to collaborator in three steps">
          <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-2xl border border-line bg-surface p-6 shadow-card">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-5 text-xs font-semibold text-fg-subtle">Step {index + 1}</p>
                <h3 className="mt-1 font-semibold text-fg">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-fg-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="communities" eyebrow="Featured communities" title="Communities for the way you work" className="bg-surface">
          <FeaturedCommunities />
          <div className="mt-8 text-center">
            <Button as={Link} to="/communities" variant="secondary" rightIcon={ArrowRight}>
              Browse all communities
            </Button>
          </div>
        </Section>

        <Section id="features" eyebrow="Platform" title="Everything a professional community needs">
          <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold text-fg">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-fg-muted">{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="pricing" eyebrow="Pricing" title="Start free. Go Pro when you're ready." className="bg-surface">
          <PlanComparison />
        </Section>

        <Section eyebrow="Member stories" title="What early members say" description="Illustrative stories from our demo community personas.">
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STORIES.map((story) => (
              <figure key={story.name} className="rounded-2xl border border-line bg-surface p-6 shadow-card">
                <Quote className="size-6 text-brand-300 dark:text-brand-700" aria-hidden="true" />
                <blockquote className="mt-3 text-sm leading-6 text-fg">“{story.quote}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold text-fg">{story.name}</span>
                  <span className="text-fg-subtle"> · {story.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>

        <section className="px-4 pb-24 sm:px-6">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 px-6 py-14 text-center shadow-elevated sm:px-12">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Your niche is already here.</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/85">
              Join practitioners who share what actually works — and find the people you will build with next.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button as={Link} to="/register" size="lg" className="bg-white text-brand-700 hover:bg-white/90">
                Create your free account
              </Button>
              <Button as={Link} to="/communities" size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                Look around first
              </Button>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
