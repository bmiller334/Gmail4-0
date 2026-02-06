"use client";

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudRain, Sun, Snowflake, Wind, Droplets, CalendarDays, Clock } from 'lucide-react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

    useEffect(() => {
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
    }, []);

    if (loading) return <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading Weather...</div>;
    if (!weather) return null;

    const current = weather.current_weather;
    const todayMax = weather.daily.temperature_2m_max[0];
    const todayMin = weather.daily.temperature_2m_min[0];
    const precip = weather.daily.precipitation_sum[0];

    // Simple WMO code mapping
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

    // Filter hourly data for "Today" (from now until end of day, or simply 24 hours of today)
    // The API returns 7 days of hourly data. We just want the first 24 slots (indices 0-23) basically,
    // but better to match the date string to be safe.
    const todayStr = weather.daily.time[0];
    const hourlyIndices = weather.hourly.time.map((t, i) => t.startsWith(todayStr) ? i : -1).filter(i => i !== -1);
    
    // We want 7am to 5pm visible by default, but allow scrolling for the whole day
    // Filter to just show 6AM to 8PM to keep it compact but useful? 
    // Or full 24h but scroll to "now"?
    // Let's just show the full "Work Day" (6AM - 6PM) + scrolling.
    
    // Let's filter `hourlyIndices` to only include 6AM to 6PM for the "compact" view? 
    // User asked for 7am to 5pm default but allow scrolling.
    // So we render all of today, but the ScrollArea handles the "window".
    
    const renderHourly = () => {
        return hourlyIndices.map((index) => {
            const timeStr = weather.hourly.time[index];
            const date = new Date(timeStr);
            const hour = date.getHours();
            const temp = Math.round(weather.hourly.temperature_2m[index]);
            const code = weather.hourly.weathercode[index];
            const rainProb = weather.hourly.precipitation_probability[index];

            // Simple 12h format
            const displayTime = hour === 0 ? '12am' : hour > 12 ? `${hour-12}pm` : hour === 12 ? '12pm' : `${hour}am`;

            return (
                <div key={index} className="flex flex-col items-center gap-1 min-w-[3.5rem] p-2 hover:bg-muted/50 rounded-md transition-colors">
                    <span className="text-[10px] text-muted-foreground font-medium">{displayTime}</span>
                    {getWeatherIcon(code, "h-5 w-5")}
                    <span className="text-sm font-bold">{temp}°</span>
                    {rainProb > 20 && (
                        <span className="text-[9px] text-blue-500 font-medium">{rainProb}%</span>
                    )}
                </div>
            );
        });
    };

    // Render Next 3 Days (Indices 1, 2, 3)
    const renderDailyForecast = () => {
        // Take next 3 days
        const indices = [1, 2, 3]; 
        return indices.map(i => {
             const dateStr = weather.daily.time[i];
             const date = new Date(dateStr + "T00:00:00"); // Append time to fix timezone offset issues locally
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
        <Card className="flex flex-col h-full overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Cloud className="h-4 w-4" /> Syracuse Forecast
                    </CardTitle>
                    <div className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                        {getAgAdvice(todayMin, precip)}
                    </div>
                </div>
                {/* Current Large Display */}
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
                {/* Hourly Strip */}
                <div className="border-t border-b bg-muted/5 py-2">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex px-4 gap-1">
                            {renderHourly()}
                        </div>
                        <ScrollBar orientation="horizontal" className="h-1.5" />
                    </ScrollArea>
                </div>

                {/* 3-Day Mini Forecast */}
                <div className="grid grid-cols-3 gap-2 px-4 pb-4 pt-2">
                    {renderDailyForecast()}
                </div>
            </CardContent>
        </Card>
    );
}
