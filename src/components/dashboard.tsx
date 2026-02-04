import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EMAIL_CATEGORIES, EmailCategory } from "@/lib/categories";
import { Activity, AlertTriangle, Mail } from "lucide-react";

// Mock data for the dashboard - in a real app this would come from the database
const MOCK_STATS = {
  totalProcessed: 1245,
  categories: {
    Important: 120,
    Personal: 45,
    Work: 300,
    Finance: 50,
    Marketing: 600,
    Social: 80,
    Updates: 40,
    Spam: 10,
  } as Record<EmailCategory, number>,
  topSenders: [
    { name: "Amazon", count: 45 },
    { name: "Newsletter Weekly", count: 12 },
    { name: "Boss Man", count: 8 },
  ],
  anomalies: [
    { type: "Spike", description: "Unusual volume of Marketing emails from 'MegaStore' detected." },
  ],
};

export default function Dashboard() {
  const maxCategoryCount = Math.max(...Object.values(MOCK_STATS.categories));

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Inbox Zero Dashboard</h2>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>System Active</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{MOCK_STATS.totalProcessed}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spam Filtered</CardTitle>
             <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{MOCK_STATS.categories.Spam}</div>
             <p className="text-xs text-muted-foreground">
               Auto-archived
             </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Email Categories</CardTitle>
            <CardDescription>
              Distribution of incoming emails by assigned category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {EMAIL_CATEGORIES.map((category) => {
                  const count = MOCK_STATS.categories[category] || 0;
                  const percentage = Math.round((count / maxCategoryCount) * 100);
                  
                  return (
                    <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                             <span className="font-medium">{category}</span>
                             <span className="text-muted-foreground">{count}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                    </div>
                  )
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Insights & Anomalies</CardTitle>
            <CardDescription>
              Detected patterns and high-volume senders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div>
                <h4 className="text-sm font-semibold mb-2">Top Senders</h4>
                <ul className="space-y-2 text-sm">
                    {MOCK_STATS.topSenders.map((sender, i) => (
                        <li key={i} className="flex justify-between border-b pb-1 last:border-0">
                            <span>{sender.name}</span>
                            <span className="font-mono text-muted-foreground">{sender.count}</span>
                        </li>
                    ))}
                </ul>
             </div>
             
             {MOCK_STATS.anomalies.length > 0 && (
                 <div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
                     <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-500 mb-1">
                         <AlertTriangle className="h-4 w-4" />
                         <span className="font-semibold text-sm">Anomaly Detected</span>
                     </div>
                     <p className="text-xs text-yellow-700 dark:text-yellow-400">
                         {MOCK_STATS.anomalies[0].description}
                     </p>
                 </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
