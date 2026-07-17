"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Home, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
    const pathname = usePathname();

    const links = [
        { name: "Overview", href: "/", icon: LayoutDashboard },
        { name: "Assistant", href: "/assistant", icon: Sparkles },
        { name: "Finance", href: "/finance", icon: TrendingUp },
        { name: "Home", href: "/home", icon: Home },
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
        </div>
    );
}
