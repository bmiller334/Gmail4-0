"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Home, TrendingUp, Sparkles, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navigation() {
    const pathname = usePathname();
    const projectId = "gmail4-0";

    const links = [
        { name: "Overview", href: "/", icon: LayoutDashboard },
        { name: "Assistant", href: "/assistant", icon: Sparkles },
        { name: "Finance", href: "/finance", icon: TrendingUp },
        { name: "Home", href: "/home", icon: Home },
    ];

    const gcpLinks = [
        { name: "GCP Console", href: `https://console.cloud.google.com/?project=${projectId}` },
        { name: "Cloud Logging", href: `https://console.cloud.google.com/logs/query?project=${projectId}` },
        { name: "Cloud Run", href: `https://console.cloud.google.com/run?project=${projectId}` },
        { name: "Pub/Sub", href: `https://console.cloud.google.com/cloudpubsub?project=${projectId}` },
        { name: "Cloud Build", href: `https://console.cloud.google.com/cloud-build/builds?project=${projectId}` },
        { name: "Billing", href: `https://console.cloud.google.com/billing?project=${projectId}` },
    ];

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 bg-background/60 backdrop-blur-lg border border-border/50 rounded-full shadow-lg">
            {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                    <Link
                        key={link.name}
                        href={link.href}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                            isActive 
                                ? "bg-primary text-primary-foreground shadow-sm" 
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{link.name}</span>
                    </Link>
                );
            })}
            
            <div className="w-px h-6 bg-border mx-1"></div>

            <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 outline-none">
                    <Cloud className="w-4 h-4 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>GCP Quicklinks</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {gcpLinks.map((link) => (
                        <DropdownMenuItem key={link.name} asChild>
                            <a href={link.href} target="_blank" rel="noopener noreferrer">
                                {link.name}
                            </a>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
