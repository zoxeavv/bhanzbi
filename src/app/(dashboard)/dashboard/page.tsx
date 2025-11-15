import { CheckCircle2, FileText, Send, UserPlus, Users, FileCheck, CheckSquare } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/domain";

const stats = [
  {
    label: "Total Clients",
    value: "1,204",
    change: {
      value: 5.2,
      label: "vs last month",
      trend: "up" as const,
    },
    icon: <Users className="h-[18px] w-[18px] stroke-[2] text-primary" />,
    href: "/clients",
  },
  {
    label: "Active Offers",
    value: "86",
    change: {
      value: 1.8,
      label: "vs last month",
      trend: "down" as const,
    },
    icon: <FileCheck className="h-[18px] w-[18px] stroke-[2] text-primary" />,
    href: "/offres",
  },
  {
    label: "Pending Tasks",
    value: "12",
    change: {
      value: 10.0,
      label: "vs last month",
      trend: "up" as const,
    },
    icon: <CheckSquare className="h-[18px] w-[18px] stroke-[2] text-primary" />,
  },
];

const activities = [
  {
    id: 1,
    icon: <UserPlus className="h-[18px] w-[18px] stroke-[2] text-info" />,
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    title: "New client 'Innovate Inc' added",
    meta: "by Jane Smith • 1h ago",
  },
  {
    id: 2,
    icon: <Send className="h-[18px] w-[18px] stroke-[2] text-success" />,
    iconBg: "bg-green-100 dark:bg-green-900/40",
    title: "Offer #1024 sent to 'TechCorp'",
    meta: "by John Doe • 3h ago",
  },
  {
    id: 3,
    icon: <CheckCircle2 className="h-[18px] w-[18px] stroke-[2] text-success" />,
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    title: "Task 'Follow up with Innovate Inc' completed",
    meta: "by Jane Smith • 5h ago",
  },
  {
    id: 4,
    icon: <FileText className="h-[18px] w-[18px] stroke-[2] text-info" />,
    iconBg: "bg-yellow-100 dark:bg-yellow-900/40",
    title: "New template 'SaaS Proposal' created",
    meta: "by Admin • 1d ago",
  },
];

const tasks: Task[] = [
  {
    id: "1",
    label: "Draft Q3 proposal for TechCorp",
    meta: "Due: Tomorrow • Offer #1024",
    done: false,
  },
  {
    id: "2",
    label: "Follow up with Innovate Inc",
    meta: "Due: Oct 28 • Client: Innovate Inc",
    done: false,
  },
  {
    id: "3",
    label: "Send updated invoice to Solutions LLC",
    meta: "Due: Yesterday",
    done: true,
  },
];

const quickActions = [
  {
    id: "create-client",
    label: "Create Client",
    icon: <UserPlus className="h-[18px] w-[18px] stroke-[2]" />,
  },
  {
    id: "create-offer",
    label: "Create Offer",
    icon: <FileText className="h-[18px] w-[18px] stroke-[2]" />,
  },
  {
    id: "create-template",
    label: "Create Template",
    icon: <Send className="h-[18px] w-[18px] stroke-[2]" />,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <PageHeader title="Dashboard" />

      {/* Stats Section - Grid responsive 3-4 colonnes */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            title={stat.label}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
            href={stat.href}
          />
        ))}
      </div>

      {/* Analytics Sections - 2 colonnes desktop, 1 mobile */}
      <div className="grid gap-6 md:grid-cols-2">
        <PipelinePerformanceCard />
        <RecentActivityCard />
        <TasksCard />
        <QuickActionsCard />
      </div>
    </div>
  );
}


function PipelinePerformanceCard() {
  return (
    <Card className="rounded-lg">
      <CardHeader className="p-6">
        <CardTitle className="text-3xl font-semibold">Pipeline Performance</CardTitle>
        <CardDescription className="text-muted-foreground">Last 30 days</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <p className="text-4xl font-bold tracking-tight text-foreground">$125,430</p>
            <span className="text-sm font-medium text-success">+15.7%</span>
          </div>
          {/* Graph placeholder */}
          <div className="h-64 rounded-lg bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5" />
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivityCard() {
  return (
    <Card className="rounded-lg">
      <CardHeader className="p-6">
        <CardTitle className="text-3xl font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", activity.iconBg)}>
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{activity.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.meta}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TasksCard() {
  return (
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-start justify-between p-6">
        <div className="space-y-1">
          <CardTitle className="text-3xl font-semibold">Your Tasks</CardTitle>
          <CardDescription className="text-muted-foreground">Keep track of your most important follow-ups.</CardDescription>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0">
          <UserPlus className="h-[18px] w-[18px] stroke-[2]" />
          <span>Add Task</span>
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {/* Tabs visuels */}
        <div className="border-b border-border pb-4 mb-6">
          <nav className="-mb-px flex space-x-6 text-sm">
            <span className="border-b-2 border-primary pb-3 font-medium text-primary">
              All
            </span>
            <span className="border-b-2 border-transparent pb-3 font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              Today
            </span>
            <span className="border-b-2 border-transparent pb-3 font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              Overdue
            </span>
          </nav>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No tasks yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 rounded-lg p-3 hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <Checkbox
                  checked={task.done}
                  className="shrink-0 h-4 w-4"
                />
                <div className="flex-1 space-y-0.5 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      task.done ? "text-muted-foreground line-through" : "text-foreground"
                    )}
                  >
                    {task.label}
                  </p>
                  <p className={cn("text-xs text-muted-foreground", task.done && "line-through")}>
                    {task.meta}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  const actionRoutes: Record<string, string> = {
    "create-client": "/clients/nouveau",
    "create-offer": "/offres/nouveau",
    "create-template": "/templates/nouveau",
  };

  return (
    <Card className="!rounded-[0.4375rem] !border-border/50 !shadow-[0_1px_3px_0_rgb(0_0_0_/0.05)]">
      <CardHeader className="pb-6 px-6 pt-6">
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-6 pb-6">
        {quickActions.map((action) => {
          const href = actionRoutes[action.id];
          const buttonContent = (
            <>
              {action.icon}
              <span>{action.label}</span>
            </>
          );

          if (href) {
            return (
              <Link key={action.id} href={href} className="block">
                <Button
                  variant="outline"
                  className="w-full rounded-[0.4375rem] border-border/50 hover:bg-muted/40 hover:border-border transition-colors"
                >
                  {buttonContent}
                </Button>
              </Link>
            );
          }

          return (
            <Button
              key={action.id}
              variant="outline"
              className="w-full rounded-[0.4375rem] border-border/50 hover:bg-muted/40 hover:border-border transition-colors"
              // onClick sera branché avec les server actions plus tard si nécessaire
            >
              {buttonContent}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
