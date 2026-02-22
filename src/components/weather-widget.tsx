"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudRain, Sun, Snowflake, Wind, CalendarDays, Clock } from 'lucide-react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type WeatherData = {
    current_weather: {
        temperature: number;
        windspeed: number;
        weathercode: number;
    };
    daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
        weathercode: number[];
    };
    hourly: {
        time: string[];
        temperature_2m: number[];
        precipitation_probability: number[];
        weathercode: number[];
    };
};

export function WeatherWidget() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentHour, setCurrentHour] = useState<number>(new Date().getHours());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentHour(new Date().getHours());
        }, 60000);

        async function fetchWeather() {
            try {
                // Syracuse, KS coordinates hardcoded
                const res = await fetch('/api/weather?lat=37.9781&lon=-101.7513');
                const data = await res.json();
                setWeather(data);
            } catch (error) {
                console.error("Failed to fetch weather", error);
            } finally {
                setLoading(false);
            }
        }
        fetchWeather();

        return () => clearInterval(timer);
    }, []);

    if (loading) return <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading Weather...</div>;
    if (!weather) return null;

    const current = weather.current_weather;
    const todayMax = weather.daily.temperature_2m_max[0];
    const todayMin = weather.daily.temperature_2m_min[0];
    const precip = weather.daily.precipitation_sum[0];

    const getWeatherIcon = (code: number, className = "h-4 w-4") => {
        if (code <= 1) return <Sun className={`${className} text-yellow-500`} />;
        if (code <= 3) return <Cloud className={`${className} text-gray-400`} />;
        if (code <= 67) return <CloudRain className={`${className} text-blue-400`} />;
        if (code <= 77) return <Snowflake className={`${className} text-blue-200`} />;
        return <CloudRain className={`${className} text-blue-500`} />;
    };

    const getAgAdvice = (tempMin: number, precip: number) => {
        if (tempMin < 32) return "Freeze Warning: Protect pipes.";
        if (precip > 0.5) return "Heavy Rain: Check pumps.";
        return "Normal conditions.";
    };

    const renderHourly = () => {
        const now = new Date();
        const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

        return weather.hourly.time
            .map((time, index) => ({ time, index }))
            .filter(({ time }) => new Date(time) >= currentHourStart)
            .slice(0, 24) 
            .map(({ time, index }) => {
                const date = new Date(time);
                const hour = date.getHours();
                const temp = Math.round(weather.hourly.temperature_2m[index]);
                const code = weather.hourly.weathercode[index];
                const rainProb = weather.hourly.precipitation_probability[index];
                
                const isCurrentHour = date.getTime() === currentHourStart.getTime();
                const displayTime = hour === 0 ? '12am' : hour > 12 ? `${hour-12}pm` : hour === 12 ? '12pm' : `${hour}am`;

                return (
                    <div 
                        key={index} 
                        className={cn(
                            "flex flex-col items-center gap-1 min-w-[3.75rem] p-2 rounded-md transition-all duration-300 relative mt-3", // Increased mt-2 to mt-3
                            isCurrentHour 
                                ? "bg-amber-100/50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 shadow-sm scale-105 z-10" 
                                : "hover:bg-muted/50"
                        )}
                    >
                        {isCurrentHour && (
                            <span className="absolute -top-2.5 px-2 py-0.5 bg-amber-500 text-[9px] font-bold text-white rounded-full uppercase tracking-tighter shadow-sm">
                                Now
                            </span>
                        )}
                        <span className={cn(
                            "text-[10px] font-medium",
                            isCurrentHour ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                        )}>
                            {displayTime}
                        </span>
                        {getWeatherIcon(code, "h-5 w-5")}
                        <span className={cn(
                            "text-sm font-bold",
                            isCurrentHour ? "text-amber-900 dark:text-amber-100" : ""
                        )}>
                            {temp}°
                        </span>
                        {rainProb > 20 && (
                            <span className="text-[9px] text-blue-500 font-medium">{rainProb}%</span>
                        )}
                    </div>
                );
            });
    };

    const renderDailyForecast = () => {
        const indices = [1, 2, 3]; 
        return indices.map(i => {
             const dateStr = weather.daily.time[i];
             const date = new Date(dateStr + "T00:00:00"); 
             const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
             const max = Math.round(weather.daily.temperature_2m_max[i]);
             const min = Math.round(weather.daily.temperature_2m_min[i]);
             const code = weather.daily.weathercode[i];

             return (
                 <div key={i} className="flex flex-col items-center gap-1 bg-muted/20 p-2 rounded-lg flex-1">
                     <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{dayName}</span>
                     {getWeatherIcon(code, "h-5 w-5")}
                     <div className="flex gap-1 text-xs">
                         <span className="font-bold">{max}°</span>
                         <span className="text-muted-foreground opacity-70">{min}°</span>
                     </div>
                 </div>
             )
        });
    }

    return (
        <Card className="flex flex-col h-full overflow-hidden border-amber-100/50 dark:border-amber-900/20">
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" /> Syracuse Forecast
                    </CardTitle>
                    <div className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                        {getAgAdvice(todayMin, precip)}
                    </div>
                </div>
                <div className="flex items-end gap-2 mt-1">
                    <div className="text-3xl font-bold tracking-tighter">
                        {Math.round(current.temperature)}°
                    </div>
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                         H:{Math.round(todayMax)}° L:{Math.round(todayMin)}°
                         <span className="text-xs opacity-50">|</span>
                         <Wind className="h-3 w-3" /> {current.windspeed}mph
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="px-0 pb-0 flex-1 flex flex-col gap-2">
                {/* Increased pt-5 to give even more space */}
                <div className="border-t border-b bg-muted/5 py-3 pt-5">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex px-4 gap-2 pb-1">
                            {renderHourly()}
                        </div>
                        <ScrollBar orientation="horizontal" className="h-1.5" />
                    </ScrollArea>
                </div>

                <div className="grid grid-cols-3 gap-2 px-4 pb-4 pt-1 flex-1">
                    {renderDailyForecast()}
                </div>
            </CardContent>
        </Card>
    );
}
