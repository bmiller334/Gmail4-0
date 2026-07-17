import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/navigation";
import { WeatherBackground } from "@/components/weather-background";
export const metadata: Metadata = {
  title: 'Inbox Zero',
  description: 'AI-powered email sorter',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen relative overflow-hidden bg-transparent">
        <WeatherBackground />
        <Navigation />
        <main className="flex-1 relative z-10 pt-20">
            {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
