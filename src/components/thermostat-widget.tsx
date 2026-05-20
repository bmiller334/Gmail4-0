"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    Thermometer, 
    Settings, 
    Flame, 
    Snowflake, 
    Leaf, 
    Power,
    Plus, 
    Minus, 
    Droplets, 
    Loader2, 
    AlertCircle, 
    CheckCircle,
    Info
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

type ThermostatState = {
    ambientTemp: number;
    targetTemp: number;
    humidity: number;
    hvacStatus: 'heating' | 'cooling' | 'off' | 'idle';
    thermostatMode: 'heat' | 'cool' | 'eco' | 'off';
};

type ThermostatConfig = {
    mode: 'demo' | 'nest' | 'homeassistant';
    nestConfig: {
        enterpriseId: string | null;
        clientId: string | null;
        isSecretConfigured: boolean;
        isRefreshTokenConfigured: boolean;
    };
    haConfig: {
        endpoint: string | null;
        isTokenConfigured: boolean;
        entityId: string | null;
    };
};

export function ThermostatWidget() {
    const [state, setState] = useState<ThermostatState | null>(null);
    const [config, setConfig] = useState<ThermostatConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingState, setUpdatingState] = useState(false);
    
    // Config form states
    const [modeInput, setModeInput] = useState<'demo' | 'nest' | 'homeassistant'>("demo");
    const [nestEnterprise, setNestEnterprise] = useState("");
    const [nestClientId, setNestClientId] = useState("");
    const [nestSecret, setNestSecret] = useState("");
    const [nestRefresh, setNestRefresh] = useState("");
    
    const [haEndpoint, setHaEndpoint] = useState("");
    const [haToken, setHaToken] = useState("");
    const [haEntity, setHaEntity] = useState("climate.thermostat");
    const [savingConfig, setSavingConfig] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Debounce timer ref for temperature API posts
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const fetchThermostat = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch("/api/thermostat");
            if (res.ok) {
                const json = await res.json();
                setState(json.state);
                setConfig(json.config);
                setModeInput(json.mode);
            }
        } catch (e) {
            console.error("Failed to fetch thermostat data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchThermostat();
        
        // Refresh thermostat state periodically every 20 seconds
        const interval = setInterval(() => {
            fetchThermostat(true);
        }, 20000);
        
        return () => {
            clearInterval(interval);
            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        };
    }, []);

    // Perform optimistic state updates locally and dispatch debounced API requests
    const handleTempChange = (change: number) => {
        if (!state || state.thermostatMode === 'off' || state.thermostatMode === 'eco') return;
        
        const newTarget = Math.max(50, Math.min(90, state.targetTemp + change));
        
        // Optimistic UI state
        const originalState = { ...state };
        const updatedState = { ...state, targetTemp: newTarget };
        
        // Model HVAC status shifts optimistically
        if (state.thermostatMode === 'heat') {
            updatedState.hvacStatus = newTarget > state.ambientTemp ? 'heating' : 'idle';
        } else if (state.thermostatMode === 'cool') {
            updatedState.hvacStatus = newTarget < state.ambientTemp ? 'cooling' : 'idle';
        }
        
        setState(updatedState);
        
        // Debounced API post
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        
        updateTimeoutRef.current = setTimeout(async () => {
            setUpdatingState(true);
            try {
                const res = await fetch("/api/thermostat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "updateState", targetTemp: newTarget })
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    setState(json.state);
                } else {
                    // Revert on error
                    setState(originalState);
                    toast({
                        variant: "destructive",
                        title: "Failed to adjust temperature",
                        description: json.error || "Thermostat rejected setpoint change."
                    });
                }
            } catch (e: any) {
                setState(originalState);
                toast({ variant: "destructive", title: "Connection Error", description: e.message });
            } finally {
                setUpdatingState(false);
            }
        }, 800); // 800ms debounce
    };

    const handleModeChange = async (newMode: 'heat' | 'cool' | 'eco' | 'off') => {
        if (!state) return;
        
        const originalState = { ...state };
        const updatedState = { ...state, thermostatMode: newMode };
        
        // Optimistic UI updates
        if (newMode === 'off') {
            updatedState.hvacStatus = 'off';
        } else if (newMode === 'eco') {
            updatedState.hvacStatus = 'idle';
        } else if (newMode === 'heat') {
            updatedState.hvacStatus = state.targetTemp > state.ambientTemp ? 'heating' : 'idle';
        } else if (newMode === 'cool') {
            updatedState.hvacStatus = state.targetTemp < state.ambientTemp ? 'cooling' : 'idle';
        }
        
        setState(updatedState);
        setUpdatingState(true);
        
        try {
            const res = await fetch("/api/thermostat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "updateState", thermostatMode: newMode })
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setState(json.state);
            } else {
                setState(originalState);
                toast({
                    variant: "destructive",
                    title: "Failed to update mode",
                    description: json.error || "Thermostat rejected mode change."
                });
            }
        } catch (e: any) {
            setState(originalState);
            toast({ variant: "destructive", title: "Connection Error", description: e.message });
        } finally {
            setUpdatingState(false);
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingConfig(true);
        
        const payload: any = {
            action: "saveConfig",
            mode: modeInput
        };

        if (modeInput === 'nest') {
            payload.nestConfig = {
                enterpriseId: nestEnterprise || null,
                clientId: nestClientId || null,
                clientSecret: nestSecret || null,
                refreshToken: nestRefresh || null
            };
        } else if (modeInput === 'homeassistant') {
            payload.haConfig = {
                endpoint: haEndpoint || null,
                longLivedToken: haToken || null,
                entityId: haEntity || null
            };
        }

        try {
            const res = await fetch("/api/thermostat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (res.ok && json.success) {
                toast({ title: "Configuration Saved", description: "Smart Thermostat link settings updated." });
                setIsSettingsOpen(false);
                fetchThermostat();
                
                // Clear sensitive fields
                setNestSecret("");
                setNestRefresh("");
                setHaToken("");
            } else {
                toast({ variant: "destructive", title: "Failed to save configuration", description: json.error });
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error Saving Config", description: e.message });
        } finally {
            setSavingConfig(false);
        }
    };

    if (loading) {
        return <div className="h-[360px] flex items-center justify-center text-muted-foreground text-xs animate-pulse bg-muted/20 rounded-xl border border-orange-500/20">Loading Climate Controls...</div>;
    }
    if (!state) return null;

    // Define colors and styles dynamically based on HVAC status and Mode
    let glowClass = "from-slate-500/10 to-transparent border-slate-500/20";
    let dialColor = "#6b7280"; // Gray
    let statusText = "System Off";
    let statusIcon = <Power className="h-4 w-4 text-muted-foreground" />;

    if (state.thermostatMode !== 'off') {
        if (state.hvacStatus === 'heating') {
            glowClass = "from-amber-500/15 via-background to-transparent border-orange-500/20";
            dialColor = "#f97316"; // Orange
            statusText = `Heating to ${state.targetTemp}°`;
            statusIcon = <Flame className="h-4 w-4 text-orange-500 animate-pulse" />;
        } else if (state.hvacStatus === 'cooling') {
            glowClass = "from-blue-500/15 via-background to-transparent border-blue-500/20";
            dialColor = "#3b82f6"; // Blue
            statusText = `Cooling to ${state.targetTemp}°`;
            statusIcon = <Snowflake className="h-4 w-4 text-blue-500 animate-pulse" />;
        } else if (state.thermostatMode === 'eco') {
            glowClass = "from-emerald-500/15 via-background to-transparent border-emerald-500/20";
            dialColor = "#10b981"; // Emerald
            statusText = "Eco Temperature Active";
            statusIcon = <Leaf className="h-4 w-4 text-emerald-500 animate-bounce" />;
        } else {
            // Idle
            glowClass = "from-slate-500/10 via-background to-transparent border-slate-500/10";
            dialColor = "#64748b"; // Slate
            statusText = `Set to ${state.targetTemp}° (Idle)`;
            statusIcon = <Thermometer className="h-4 w-4 text-slate-500" />;
        }
    }

    // SVG parameters
    const size = 180;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    
    // Map current temp range (50 - 90 Fahrenheit) to stroke offset
    const minTemp = 50;
    const maxTemp = 90;
    const currentPercent = Math.max(0, Math.min(100, ((state.targetTemp - minTemp) / (maxTemp - minTemp)) * 100));
    const strokeDashoffset = circumference - (currentPercent / 100) * circumference;

    return (
        <Card className={`hover:scale-[1.005] transition-all duration-300 shadow-md hover:shadow-lg border bg-gradient-to-br ${glowClass} overflow-hidden h-full flex flex-col justify-between`}>
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <Thermometer className="h-4 w-4 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" /> Home Climate Manager
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {config?.mode === 'nest' ? 'Google Nest Connected' : config?.mode === 'homeassistant' ? 'Home Assistant Connected' : 'Simulated Climate Device'}
                    </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                    {config?.mode === 'demo' ? (
                        <Badge variant="secondary" className="text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Demo Mode
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Linked
                        </Badge>
                    )}

                    {/* Settings Trigger */}
                    <Dialog open={isSettingsOpen} onOpenChange={(open) => {
                        setIsSettingsOpen(open);
                        if (open) fetchThermostat();
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-orange-500">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                    <Settings className="h-5 w-5" /> Smart Thermostat Settings
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Choose your sync source (Google Nest SDM or Home Assistant) and configure keys securely.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operational Mode</label>
                                    <Select value={modeInput} onValueChange={(val: any) => setModeInput(val)}>
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="demo">Interactive Demo (Offline)</SelectItem>
                                            <SelectItem value="nest">Google Nest (Smart Device Access API)</SelectItem>
                                            <SelectItem value="homeassistant">Home Assistant (Local REST integration)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Nest SDM Credentials */}
                                {modeInput === 'nest' && (
                                    <div className="space-y-3 border-t pt-3">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Nest Access Details</h4>
                                        
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-muted-foreground">SDM Enterprise ID</label>
                                            <Input 
                                                placeholder={config?.nestConfig?.enterpriseId || "e.g. 52c-7b1f-..."}
                                                value={nestEnterprise}
                                                onChange={(e) => setNestEnterprise(e.target.value)}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-muted-foreground">Plaid/Google Client ID</label>
                                            <Input 
                                                placeholder={config?.nestConfig?.clientId ? "(Configured)" : "Google Cloud OAuth Client ID"}
                                                value={nestClientId}
                                                onChange={(e) => setNestClientId(e.target.value)}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-muted-foreground">OAuth Client Secret</label>
                                            <Input 
                                                type="password"
                                                placeholder={config?.nestConfig?.isSecretConfigured ? "••••••••••••••••" : "Google Cloud OAuth Client Secret"}
                                                value={nestSecret}
                                                onChange={(e) => setNestSecret(e.target.value)}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-muted-foreground">OAuth Refresh Token</label>
                                            <Input 
                                                type="password"
                                                placeholder={config?.nestConfig?.isRefreshTokenConfigured ? "••••••••••••••••" : "Paste your OAuth Refresh Token"}
                                                value={nestRefresh}
                                                onChange={(e) => setNestRefresh(e.target.value)}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Home Assistant Credentials */}
                                {modeInput === 'homeassistant' && (
                                    <div className="space-y-3 border-t pt-3">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Home Assistant Link</h4>
                                        
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-muted-foreground">Base Endpoint URL</label>
                                            <Input 
                                                placeholder={config?.haConfig?.endpoint || "e.g. http://192.168.1.50:8123"}
                                                value={haEndpoint}
                                                onChange={(e) => setHaEndpoint(e.target.value)}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-muted-foreground">Long-Lived Access Token</label>
                                            <Input 
                                                type="password"
                                                placeholder={config?.haConfig?.isTokenConfigured ? "••••••••••••••••" : "Home Assistant Long-Lived Token"}
                                                value={haToken}
                                                onChange={(e) => setHaToken(e.target.value)}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-muted-foreground">Thermostat Climate Entity ID</label>
                                            <Input 
                                                placeholder="climate.thermostat"
                                                value={haEntity}
                                                onChange={(e) => setHaEntity(e.target.value)}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2 justify-end pt-2">
                                    <Button type="submit" disabled={savingConfig} className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9">
                                        {savingConfig ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                        Activate & Link Thermostat
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-1 flex-1 flex flex-col justify-between items-center space-y-4">
                
                {/* Circular Thermostat Visual Dial */}
                <div className="relative flex items-center justify-center my-1 select-none">
                    
                    {/* SVG Gauge Arc */}
                    <svg width={size} height={size} className="transform -rotate-90">
                        {/* Background track circle */}
                        <circle 
                            cx={size / 2} 
                            cy={size / 2} 
                            r={radius} 
                            fill="transparent" 
                            stroke="#e2e8f0" 
                            strokeWidth={strokeWidth - 4} 
                            className="opacity-25"
                        />
                        {/* Interactive setpoint temperature gauge arc */}
                        {state.thermostatMode !== 'off' && (
                            <circle 
                                cx={size / 2} 
                                cy={size / 2} 
                                r={radius} 
                                fill="transparent" 
                                stroke={dialColor} 
                                strokeWidth={strokeWidth} 
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-500 ease-in-out drop-shadow-[0_0_6px_rgba(0,0,0,0.15)]"
                            />
                        )}
                    </svg>

                    {/* Central glowing core stats */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground opacity-75">
                            Indoor
                        </span>
                        
                        <div className="flex items-start">
                            <span className="text-4xl font-extrabold text-foreground font-sans tracking-tighter">
                                {state.ambientTemp}
                            </span>
                            <span className="text-sm font-bold text-muted-foreground pt-1">
                                °F
                            </span>
                        </div>

                        {state.thermostatMode !== 'off' && state.thermostatMode !== 'eco' ? (
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs font-mono font-bold">
                                <span className="opacity-60 text-[10px]">Set:</span>
                                <span className="text-foreground">{state.targetTemp}°</span>
                            </div>
                        ) : state.thermostatMode === 'eco' ? (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold font-mono">
                                <Leaf className="h-3 w-3 shrink-0" /> ECO MODE
                            </div>
                        ) : (
                            <span className="text-[10px] text-muted-foreground font-mono font-bold">OFFLINE</span>
                        )}
                    </div>

                    {/* Interactive Temperature Dials +/- */}
                    {state.thermostatMode !== 'off' && state.thermostatMode !== 'eco' && (
                        <>
                            <button 
                                onClick={() => handleTempChange(-1)} 
                                disabled={updatingState}
                                className="absolute left-[-24px] bg-background border hover:bg-muted p-1.5 rounded-full shadow-md text-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <button 
                                onClick={() => handleTempChange(1)} 
                                disabled={updatingState}
                                className="absolute right-[-24px] bg-background border hover:bg-muted p-1.5 rounded-full shadow-md text-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>

                {/* Ambient climate details */}
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground py-1 bg-muted/20 border border-border/30 rounded-lg px-4 w-full justify-center">
                    <span className="flex items-center gap-1">
                        {statusIcon}
                        <span className="font-bold text-foreground">{statusText}</span>
                    </span>
                    <span className="opacity-30">|</span>
                    <span className="flex items-center gap-1">
                        <Droplets className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-bold text-foreground">{state.humidity}% Humidity</span>
                    </span>
                </div>

                {/* Control Trigger Mode Toggles */}
                <div className="grid grid-cols-4 gap-1.5 w-full pt-1">
                    <Button 
                        variant={state.thermostatMode === 'heat' ? 'default' : 'outline'}
                        onClick={() => handleModeChange('heat')}
                        disabled={updatingState}
                        className={`text-xs font-bold h-8 rounded-lg flex flex-col items-center justify-center p-0 ${state.thermostatMode === 'heat' ? 'bg-orange-500 hover:bg-orange-600 border-orange-500 text-white shadow-orange-500/20' : 'hover:border-orange-500 hover:text-orange-500'}`}
                    >
                        <Flame className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-[9px] uppercase tracking-wider mt-0.5">Heat</span>
                    </Button>
                    
                    <Button 
                        variant={state.thermostatMode === 'cool' ? 'default' : 'outline'}
                        onClick={() => handleModeChange('cool')}
                        disabled={updatingState}
                        className={`text-xs font-bold h-8 rounded-lg flex flex-col items-center justify-center p-0 ${state.thermostatMode === 'cool' ? 'bg-blue-500 hover:bg-blue-600 border-blue-500 text-white shadow-blue-500/20' : 'hover:border-blue-500 hover:text-blue-500'}`}
                    >
                        <Snowflake className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-[9px] uppercase tracking-wider mt-0.5">Cool</span>
                    </Button>
                    
                    <Button 
                        variant={state.thermostatMode === 'eco' ? 'default' : 'outline'}
                        onClick={() => handleModeChange('eco')}
                        disabled={updatingState}
                        className={`text-xs font-bold h-8 rounded-lg flex flex-col items-center justify-center p-0 ${state.thermostatMode === 'eco' ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20' : 'hover:border-emerald-500 hover:text-emerald-500'}`}
                    >
                        <Leaf className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-[9px] uppercase tracking-wider mt-0.5">Eco</span>
                    </Button>
                    
                    <Button 
                        variant={state.thermostatMode === 'off' ? 'default' : 'outline'}
                        onClick={() => handleModeChange('off')}
                        disabled={updatingState}
                        className={`text-xs font-bold h-8 rounded-lg flex flex-col items-center justify-center p-0 ${state.thermostatMode === 'off' ? 'bg-slate-600 hover:bg-slate-700 border-slate-600 text-white' : 'hover:border-slate-500 hover:text-slate-500'}`}
                    >
                        <Power className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-[9px] uppercase tracking-wider mt-0.5">Off</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
