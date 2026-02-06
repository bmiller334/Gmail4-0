"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

// Mock data generator since real financial APIs require paid keys usually
// In a real app, we'd use Alpha Vantage or Yahoo Finance API
const COMMODITIES = [
    { name: "Lumber (1k bdft)", price: 540, change: -12.50 },
    { name: "Copper (lb)", price: 3.85, change: 0.04 },
    { name: "Steel (ton)", price: 820, change: 15.00 },
];

export function CommodityTicker() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Market Pulse</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {COMMODITIES.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">${item.price.toFixed(2)}</span>
                                <span className={`text-xs flex items-center ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {item.change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                    {Math.abs(item.change).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
