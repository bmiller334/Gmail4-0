import { ai } from "@/ai/genkit";
import { getNextCalendarEvent, getInboxCount, getUnreadEmailsByCategory } from "@/lib/gmail-service";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Fetch Calendar Event
        const nextEvent = await getNextCalendarEvent();

        // 2. Fetch Weather (Syracuse, KS)
        let weatherText = "weather data unavailable";
        try {
            const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=37.9781&longitude=-101.7513&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=auto`
            );
            if (weatherRes.ok) {
                const weatherData = await weatherRes.json();
                const temp = Math.round(weatherData.current_weather.temperature);
                const max = Math.round(weatherData.daily.temperature_2m_max[0]);
                const min = Math.round(weatherData.daily.temperature_2m_min[0]);
                const wind = weatherData.current_weather.windspeed;
                weatherText = `${temp}°F (H: ${max}°F, L: ${min}°F), wind speed ${wind}mph`;
            }
        } catch (e) {
            console.warn("Weather fetch failed for briefing:", e);
        }

        // 3. Fetch Inbox Metrics & Action Needed Emails
        const inboxCount = await getInboxCount().catch(() => 0);
        const urgentEmails = await getUnreadEmailsByCategory("[Action Required]", 5).catch(() => []);

        // 4. Generate AI briefing with Genkit
        const prompt = `
You are a warm, supportive personal life assistant. Generate a highly custom, encouraging morning briefing for the user's personal home page.
Keep it strictly under 3 sentences. Do not use markdown bold/italic tags. Make it sound elegant and premium.

Here is the context:
- Current Weather in Syracuse, KS: ${weatherText}
- Next Calendar Event today: ${nextEvent && nextEvent.start ? `"${nextEvent.summary}" at ${new Date(nextEvent.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : "No calendar events remaining today"}
- Inbox State: ${inboxCount} unread emails in inbox.
- Urgent Action Needed Emails: ${urgentEmails.length > 0 ? urgentEmails.map(e => `"${e.subject}" from ${e.sender}`).join(", ") : "No urgent action items"}

Example tone:
"Good morning! Your day starts clear and cool at 64 degrees. You have a quiet calendar today with just one event at 2:00 PM, and your inbox is clean of any urgent emails. Enjoy your coffee!"
`;

        const { text } = await ai.generate({
            prompt: prompt,
            config: {
                temperature: 0.7,
            }
        });

        return NextResponse.json({
            briefing: text.trim(),
            weather: weatherText,
            nextEvent,
            inboxCount,
            urgentCount: urgentEmails.length
        });
    } catch (error: any) {
        console.error("Daily briefing generation failed:", error);
        return NextResponse.json({
            briefing: "Good morning! Welcome back to your dashboard. Your systems are online, and we are ready for the day ahead.",
            error: error.message
        }, { status: 500 });
    }
}
