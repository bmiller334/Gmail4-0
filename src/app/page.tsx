import Dashboard from "@/components/dashboard";
import { WeatherBackground } from "@/components/weather-background";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-transparent">
       <WeatherBackground />
       <div className="relative z-10">
           <Dashboard />
       </div>
    </main>
  );
}
