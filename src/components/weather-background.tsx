"use client";

import { useEffect, useState } from 'react';

type WeatherData = {
    current_weather: {
        weathercode: number;
        windspeed: number;
    };
};

export function WeatherBackground() {
    const [weatherCode, setWeatherCode] = useState<number | null>(null);
    const [windSpeed, setWindSpeed] = useState<number | null>(null);

    useEffect(() => {
        async function fetchWeather() {
            try {
                // Syracuse, KS coordinates hardcoded
                const res = await fetch('/api/weather?lat=37.9781&lon=-101.7513');
                const data = await res.json();
                setWeatherCode(data.current_weather.weathercode);
                setWindSpeed(data.current_weather.windspeed);
            } catch (error) {
                console.error("Failed to fetch weather for background", error);
            }
        }
        fetchWeather();
        const interval = setInterval(fetchWeather, 10 * 60 * 1000); // every 10 min
        return () => clearInterval(interval);
    }, []);

    const [debugType, setDebugType] = useState<string | null>(null);

    let type = "clear";
    if (weatherCode === null) {
        // We still need a default type for the initial render so the hook runs consistently
        type = "clear";
    } else if (windSpeed !== null && windSpeed > 20) {
        type = "windy";
    } else if (weatherCode <= 1) type = "clear";
    else if (weatherCode <= 3) type = "cloudy";
    else if (weatherCode <= 67) type = "rain";
    else if (weatherCode <= 77) type = "snow";
    else type = "rain"; // default to rain for anything else just in case

    if (debugType) type = debugType;

    useEffect(() => {
        if (weatherCode !== null || debugType !== null) {
            document.documentElement.setAttribute('data-weather', type);
        }
    }, [type, weatherCode, debugType]);

    // Return an empty div to maintain z-index structure even if loading
    if (weatherCode === null && !debugType) return <div className="fixed inset-0 z-[-10] pointer-events-none" />;

    return (
        <>
            {/* Temporary debug toggle for user to view styles */}
            <div className="fixed bottom-4 right-4 z-50 flex gap-2 bg-background/80 backdrop-blur p-2 rounded-lg border shadow-lg">
                <button onClick={() => setDebugType('clear')} className={`px-2 py-1 rounded text-xs ${type === 'clear' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>☀️ Clear</button>
                <button onClick={() => setDebugType('cloudy')} className={`px-2 py-1 rounded text-xs ${type === 'cloudy' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>☁️ Cloudy</button>
                <button onClick={() => setDebugType('rain')} className={`px-2 py-1 rounded text-xs ${type === 'rain' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>🌧️ Rain</button>
                <button onClick={() => setDebugType('snow')} className={`px-2 py-1 rounded text-xs ${type === 'snow' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>❄️ Snow</button>
                <button onClick={() => setDebugType('windy')} className={`px-2 py-1 rounded text-xs ${type === 'windy' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>💨 Windy</button>
                <button onClick={() => setDebugType(null)} className="px-2 py-1 rounded text-xs hover:bg-destructive/20 text-destructive border border-destructive/50 ml-2">Reset</button>
            </div>

            <div className="fixed inset-0 z-[-10] pointer-events-none overflow-hidden transition-opacity duration-1000">
            {type === "clear" && <ClearSky />}
            {type === "cloudy" && <CloudySky />}
            {type === "rain" && <RainySky />}
            {type === "snow" && <SnowySky />}
            {type === "windy" && <WindySky />}
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes float-cloud {
                    0% { transform: translateX(-20vw) translateY(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateX(120vw) translateY(20px); opacity: 0; }
                }
                @keyframes fall-rain {
                    0% { transform: translateY(-10vh) scaleY(1); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(110vh) scaleY(2); opacity: 0; }
                }
                @keyframes fall-snow {
                    0% { transform: translateY(-10vh) translateX(0) scale(1); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(110vh) translateX(30px) scale(1.2); opacity: 0; }
                }
                @keyframes blow-wind {
                    0% { transform: translateX(-10vw) translateY(0) scaleX(1); opacity: 0; }
                    10% { opacity: 0.6; }
                    90% { opacity: 0.6; }
                    100% { transform: translateX(110vw) translateY(5vh) scaleX(3); opacity: 0; }
                }
                @keyframes pulse-sun {
                    0% { transform: scale(1); opacity: 0.15; }
                    50% { transform: scale(1.1); opacity: 0.25; }
                    100% { transform: scale(1); opacity: 0.15; }
                }
                .cloud {
                    position: absolute;
                    background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%);
                    border-radius: 50%;
                    filter: blur(30px);
                    animation: float-cloud linear infinite;
                }
                .drop {
                    position: absolute;
                    width: 2px;
                    height: 50px;
                    background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(150,200,255,0.4));
                    animation: fall-rain linear infinite;
                }
                .flake {
                    position: absolute;
                    background: white;
                    border-radius: 50%;
                    filter: blur(1px);
                    animation: fall-snow linear infinite;
                }
                .dust {
                    position: absolute;
                    width: 20px;
                    height: 2px;
                    background: linear-gradient(to right, rgba(255,255,255,0), rgba(200,230,220,0.5), rgba(255,255,255,0));
                    border-radius: 50%;
                    filter: blur(2px);
                    animation: blow-wind linear infinite;
                }
            `}} />
        </div>
        </>
    );
}

function ClearSky() {
    return (
        <div className="w-full h-full relative">
            <div 
                className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(250, 210, 100, 0.4) 0%, rgba(250, 210, 100, 0) 70%)',
                    animation: 'pulse-sun 12s ease-in-out infinite',
                    filter: 'blur(60px)'
                }}
            />
        </div>
    );
}

function CloudySky() {
    const clouds = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        top: Math.random() * 70 + '%',
        width: Math.random() * 400 + 300 + 'px',
        height: Math.random() * 150 + 150 + 'px',
        duration: Math.random() * 60 + 80 + 's',
        delay: Math.random() * -100 + 's',
        opacity: Math.random() * 0.4 + 0.2
    }));

    return (
        <div className="w-full h-full relative mix-blend-screen transition-opacity duration-1000">
            {clouds.map(c => (
                <div 
                    key={c.id} 
                    className="cloud"
                    style={{
                        top: c.top,
                        width: c.width,
                        height: c.height,
                        animationDuration: c.duration,
                        animationDelay: c.delay,
                        opacity: c.opacity
                    }}
                />
            ))}
        </div>
    );
}

function RainySky() {
    const drops = Array.from({ length: 150 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100 + '%',
        duration: Math.random() * 0.4 + 0.4 + 's',
        delay: Math.random() * -2 + 's',
        opacity: Math.random() * 0.6 + 0.2
    }));

    return (
        <div className="w-full h-full relative transition-opacity duration-1000">
            {/* Added a subtle dark overlay to make rain feel more natural */}
            <div className="absolute inset-0 bg-slate-900/20" />
            {drops.map(d => (
                <div 
                    key={d.id} 
                    className="drop"
                    style={{
                        left: d.left,
                        animationDuration: d.duration,
                        animationDelay: d.delay,
                        opacity: d.opacity
                    }}
                />
            ))}
        </div>
    );
}

function SnowySky() {
    const flakes = Array.from({ length: 100 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100 + '%',
        duration: Math.random() * 6 + 6 + 's',
        delay: Math.random() * -12 + 's',
        opacity: Math.random() * 0.6 + 0.4,
        size: Math.random() * 5 + 3 + 'px'
    }));

    return (
        <div className="w-full h-full relative transition-opacity duration-1000">
             {/* Added a subtle cool overlay for snow */}
             <div className="absolute inset-0 bg-blue-900/10" />
            {flakes.map(f => (
                <div 
                    key={f.id} 
                    className="flake"
                    style={{
                        left: f.left,
                        width: f.size,
                        height: f.size,
                        animationDuration: f.duration,
                        animationDelay: f.delay,
                        opacity: f.opacity
                    }}
                />
            ))}
        </div>
    );
}

function WindySky() {
    const gusts = Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        top: Math.random() * 100 + '%',
        duration: Math.random() * 2 + 1 + 's',
        delay: Math.random() * -5 + 's',
        opacity: Math.random() * 0.4 + 0.1,
        size: Math.random() * 40 + 20 + 'px'
    }));

    return (
        <div className="w-full h-full relative transition-opacity duration-1000">
            {/* Added a subtle hazy overlay for wind/dust */}
            <div className="absolute inset-0 bg-teal-900/10 mix-blend-screen" />
            {gusts.map(g => (
                <div 
                    key={g.id} 
                    className="dust"
                    style={{
                        top: g.top,
                        width: g.size,
                        animationDuration: g.duration,
                        animationDelay: g.delay,
                        opacity: g.opacity
                    }}
                />
            ))}
        </div>
    );
}
