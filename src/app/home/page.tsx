import { WeatherWidget } from "@/components/weather-widget";
import { ThermostatWidget } from "@/components/thermostat-widget";

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="grid gap-4 md:grid-cols-2">
          <WeatherWidget />
          <ThermostatWidget />
      </div>
    </div>
  );
}
