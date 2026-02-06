import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ErrorTicker } from "@/components/error-ticker";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <ErrorTicker />
        <main className="flex-1">
            {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
