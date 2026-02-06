import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat') || '37.9781'; // Syracuse, KS
    const lon = searchParams.get('lon') || '-101.7513';

    try {
        // Using Open-Meteo API (Free, no key required)
        // Added hourly=temperature_2m,precipitation_probability,weathercode to fetch hourly data
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&hourly=temperature_2m,precipitation_probability,weathercode&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=auto`
        );
        
        if (!response.ok) throw new Error("Weather API failed");
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
    }
}
