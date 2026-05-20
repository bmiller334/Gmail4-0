import "./env-fix"; // MUST BE FIRST IMPORT
import { getFirestore } from 'firebase-admin/firestore';

export interface ThermostatState {
    ambientTemp: number; // in Fahrenheit
    targetTemp: number;  // in Fahrenheit
    humidity: number;    // % relative humidity
    hvacStatus: 'heating' | 'cooling' | 'off' | 'idle';
    thermostatMode: 'heat' | 'cool' | 'eco' | 'off';
}

export interface NestConfig {
    enterpriseId: string | null;
    clientId: string | null;
    clientSecret: string | null;
    refreshToken: string | null;
}

export interface HAConfig {
    endpoint: string | null; // e.g. http://192.168.1.100:8123
    longLivedToken: string | null;
    entityId: string | null; // e.g. climate.thermostat
}

export interface ThermostatConfig {
    mode: 'demo' | 'nest' | 'homeassistant';
    demoState: ThermostatState;
    nestConfig: NestConfig;
    haConfig: HAConfig;
}

const COLLECTION_SETTINGS = 'settings';
const DOC_THERMOSTAT = 'thermostat';

// Default initial state for demo mode
const DEFAULT_DEMO_STATE: ThermostatState = {
    ambientTemp: 71,
    targetTemp: 72,
    humidity: 44,
    hvacStatus: 'heating',
    thermostatMode: 'heat'
};

// Default keys structure
const DEFAULT_CONFIG: ThermostatConfig = {
    mode: 'demo',
    demoState: DEFAULT_DEMO_STATE,
    nestConfig: { enterpriseId: null, clientId: null, clientSecret: null, refreshToken: null },
    haConfig: { endpoint: null, longLivedToken: null, entityId: 'climate.thermostat' }
};

// Conversions since Nest SDM API uses Celsius
function cToF(c: number): number {
    return Math.round((c * 9/5) + 32);
}

function fToC(f: number): number {
    return Math.round(((f - 32) * 5/9) * 10) / 10;
}

/**
 * Fetch thermostat configuration from Firestore
 */
export async function getThermostatConfig(): Promise<ThermostatConfig> {
    try {
        const db = getFirestore();
        const doc = await db.collection(COLLECTION_SETTINGS).doc(DOC_THERMOSTAT).get();
        if (doc.exists) {
            const data = doc.data();
            return {
                mode: data?.mode || 'demo',
                demoState: { ...DEFAULT_DEMO_STATE, ...(data?.demoState || {}) },
                nestConfig: {
                    enterpriseId: data?.nestConfig?.enterpriseId || null,
                    clientId: data?.nestConfig?.clientId || null,
                    clientSecret: data?.nestConfig?.clientSecret || null,
                    refreshToken: data?.nestConfig?.refreshToken || null
                },
                haConfig: {
                    endpoint: data?.haConfig?.endpoint || null,
                    longLivedToken: data?.haConfig?.longLivedToken || null,
                    entityId: data?.haConfig?.entityId || 'climate.thermostat'
                }
            };
        }
    } catch (e) {
        console.warn("Firestore not available in getThermostatConfig, using default config:", e);
    }
    return DEFAULT_CONFIG;
}

/**
 * Save configuration properties (credentials, modes) to Firestore
 */
export async function saveThermostatConfig(updates: Partial<Omit<ThermostatConfig, 'demoState'>>): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(COLLECTION_SETTINGS).doc(DOC_THERMOSTAT);
    await docRef.set({
        ...updates,
        updatedAt: new Date()
    }, { merge: true });
}

/**
 * Refreshes Google Nest OAuth2 access token
 */
async function getNestAccessToken(nestConfig: NestConfig): Promise<string> {
    if (!nestConfig.clientId || !nestConfig.clientSecret || !nestConfig.refreshToken) {
        throw new Error("Nest credentials missing essential OAuth keys.");
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: nestConfig.clientId,
            client_secret: nestConfig.clientSecret,
            refresh_token: nestConfig.refreshToken,
            grant_type: "refresh_token"
        })
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
        throw new Error(`Google OAuth2 token exchange failed: ${data.error_description || data.error || 'Unknown error'}`);
    }

    return data.access_token;
}

/**
 * Fetch dynamic thermostat status
 */
export async function getThermostatState(): Promise<ThermostatState> {
    const config = await getThermostatConfig();

    if (config.mode === 'nest' && config.nestConfig.enterpriseId) {
        try {
            const accessToken = await getNestAccessToken(config.nestConfig);
            
            // Get all devices under the enterprise
            const res = await fetch(`https://smartdevicemanagement.googleapis.com/v1/enterprises/${config.nestConfig.enterpriseId}/devices`, {
                headers: { "Authorization": `Bearer ${accessToken}` }
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(`Nest API device query failed: ${data.error?.message || 'Unknown'}`);
            }

            // Find the thermostat device
            const thermostat = (data.devices || []).find((d: any) => d.type === 'sdm.devices.types.THERMOSTAT');
            if (!thermostat) {
                throw new Error("No Nest Thermostat device found under registered enterprise.");
            }

            // Extract traits
            const traits = thermostat.traits || {};
            const ambientC = traits['sdm.devices.traits.Temperature']?.ambientTemperatureCelsius || 21;
            const humidityPercent = traits['sdm.devices.traits.Humidity']?.ambientHumidityPercent || 40;
            const hvacStatusRaw = traits['sdm.devices.traits.ThermostatHvac']?.status || 'OFF'; // HEATING, COOLING, OFF
            const modeRaw = traits['sdm.devices.traits.ThermostatMode']?.mode || 'OFF'; // HEAT, COOL, HEATCOOL, OFF
            const ecoModeRaw = traits['sdm.devices.traits.ThermostatEco']?.mode || 'OFF'; // ECO, OFF
            
            // Target setpoint temperature (Nest uses setpointC for single mode, or coolSetpointC/heatSetpointC for ranges)
            let targetC = ambientC;
            if (ecoModeRaw === 'ECO') {
                targetC = traits['sdm.devices.traits.ThermostatEco']?.heatSetpointCelsius || ambientC;
            } else if (modeRaw === 'HEAT') {
                targetC = traits['sdm.devices.traits.ThermostatTemperatureSetpoint']?.heatSetpointCelsius || ambientC;
            } else if (modeRaw === 'COOL') {
                targetC = traits['sdm.devices.traits.ThermostatTemperatureSetpoint']?.coolSetpointCelsius || ambientC;
            } else if (modeRaw === 'HEATCOOL') {
                const heatS = traits['sdm.devices.traits.ThermostatTemperatureSetpoint']?.heatSetpointCelsius || ambientC;
                const coolS = traits['sdm.devices.traits.ThermostatTemperatureSetpoint']?.coolSetpointCelsius || ambientC;
                targetC = (heatS + coolS) / 2; // Midpoint for display simplify
            }

            const hvacStatusMap: Record<string, 'heating' | 'cooling' | 'off' | 'idle'> = {
                'HEATING': 'heating',
                'COOLING': 'cooling',
                'OFF': 'off',
                'IDLE': 'idle'
            };

            const modeMap: Record<string, 'heat' | 'cool' | 'eco' | 'off'> = {
                'HEAT': 'heat',
                'COOL': 'cool',
                'ECO': 'eco',
                'OFF': 'off',
                'HEATCOOL': 'heat' // default mapping fallback
            };

            return {
                ambientTemp: cToF(ambientC),
                targetTemp: cToF(targetC),
                humidity: humidityPercent,
                hvacStatus: hvacStatusMap[hvacStatusRaw] || 'idle',
                thermostatMode: ecoModeRaw === 'ECO' ? 'eco' : (modeMap[modeRaw] || 'off')
            };

        } catch (nestErr: any) {
            console.error("Nest SDM API query failed, falling back to cached Firestore Demo state:", nestErr.message || nestErr);
        }
    }

    if (config.mode === 'homeassistant' && config.haConfig.endpoint && config.haConfig.longLivedToken && config.haConfig.entityId) {
        try {
            const cleanEndpoint = config.haConfig.endpoint.replace(/\/$/, "");
            const res = await fetch(`${cleanEndpoint}/api/states/${config.haConfig.entityId}`, {
                headers: {
                    "Authorization": `Bearer ${config.haConfig.longLivedToken}`,
                    "Content-Type": "application/json"
                }
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(`Home Assistant query failed: ${data.message || 'Unknown'}`);
            }

            const state = data.state; // e.g. 'heat', 'cool', 'off', 'idle'
            const attributes = data.attributes || {};
            const ambient = attributes.current_temperature || 70;
            const target = attributes.temperature || attributes.target_temp_high || attributes.target_temp_low || 72;
            const humidity = attributes.current_humidity || 40;
            
            const hvacAction = attributes.hvac_action || 'idle'; // 'heating', 'cooling', 'idle', 'off'
            
            const modeMap: Record<string, 'heat' | 'cool' | 'eco' | 'off'> = {
                'heat': 'heat',
                'cool': 'cool',
                'eco': 'eco',
                'off': 'off',
                'auto': 'heat'
            };

            // Home Assistant handles temperature units automatically, but attributes tell us if C or F
            const unit = attributes.temperature_unit || 'F';
            const convertedAmbient = unit.toUpperCase().includes('C') ? cToF(ambient) : Math.round(ambient);
            const convertedTarget = unit.toUpperCase().includes('C') ? cToF(target) : Math.round(target);

            return {
                ambientTemp: convertedAmbient,
                targetTemp: convertedTarget,
                humidity,
                hvacStatus: hvacAction === 'heating' ? 'heating' : (hvacAction === 'cooling' ? 'cooling' : (hvacAction === 'off' ? 'off' : 'idle')),
                thermostatMode: modeMap[state] || 'off'
            };
        } catch (haErr: any) {
            console.error("Home Assistant API query failed, falling back to cached Firestore Demo state:", haErr.message || haErr);
        }
    }

    // Default Demo Mode fallback (persisted in Firestore)
    return config.demoState;
}

/**
 * Execute temperature adjustments or mode updates
 */
export async function updateThermostatState(updates: Partial<ThermostatState>): Promise<ThermostatState> {
    const config = await getThermostatConfig();
    const db = getFirestore();
    const docRef = db.collection(COLLECTION_SETTINGS).doc(DOC_THERMOSTAT);

    const currentState = await getThermostatState();
    const newState: ThermostatState = {
        ...currentState,
        ...updates
    };

    // Calculate simulated HVAC status when user alters target temperatures in Demo mode
    if (newState.thermostatMode === 'off') {
        newState.hvacStatus = 'off';
    } else if (newState.thermostatMode === 'eco') {
        newState.hvacStatus = 'idle';
    } else if (newState.thermostatMode === 'heat') {
        newState.hvacStatus = newState.targetTemp > newState.ambientTemp ? 'heating' : 'idle';
    } else if (newState.thermostatMode === 'cool') {
        newState.hvacStatus = newState.targetTemp < newState.ambientTemp ? 'cooling' : 'idle';
    }

    if (config.mode === 'nest' && config.nestConfig.enterpriseId) {
        try {
            const accessToken = await getNestAccessToken(config.nestConfig);
            
            // Get devices list to resolve the device resource name
            const listRes = await fetch(`https://smartdevicemanagement.googleapis.com/v1/enterprises/${config.nestConfig.enterpriseId}/devices`, {
                headers: { "Authorization": `Bearer ${accessToken}` }
            });
            const listData = await listRes.json();
            const thermostat = (listData.devices || []).find((d: any) => d.type === 'sdm.devices.types.THERMOSTAT');
            
            if (thermostat) {
                const deviceName = thermostat.name; // full resource name e.g. enterprises/ent-id/devices/dev-id
                
                // 1. Send Mode Updates if altered
                if (updates.thermostatMode !== undefined) {
                    let nestMode = 'OFF';
                    let nestEco = 'OFF';
                    
                    if (updates.thermostatMode === 'heat') nestMode = 'HEAT';
                    else if (updates.thermostatMode === 'cool') nestMode = 'COOL';
                    else if (updates.thermostatMode === 'eco') nestEco = 'ECO';
                    
                    if (nestEco === 'ECO') {
                        await fetch(`https://smartdevicemanagement.googleapis.com/v1/${deviceName}:executeCommand`, {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
                            body: JSON.stringify({
                                command: "sdm.devices.commands.ThermostatEco.SetMode",
                                params: { mode: "ECO" }
                            })
                        });
                    } else {
                        // Deactivate eco if active
                        if (currentState.thermostatMode === 'eco') {
                            await fetch(`https://smartdevicemanagement.googleapis.com/v1/${deviceName}:executeCommand`, {
                                method: "POST",
                                headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    command: "sdm.devices.commands.ThermostatEco.SetMode",
                                    params: { mode: "OFF" }
                                })
                            });
                        }
                        // Change Thermostat mode
                        await fetch(`https://smartdevicemanagement.googleapis.com/v1/${deviceName}:executeCommand`, {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
                            body: JSON.stringify({
                                command: "sdm.devices.commands.ThermostatMode.SetMode",
                                params: { mode: nestMode }
                            })
                        });
                    }
                }

                // 2. Send Temperature Setpoint Updates if targetTemp altered and in non-eco mode
                if (updates.targetTemp !== undefined && newState.thermostatMode !== 'eco' && newState.thermostatMode !== 'off') {
                    const targetC = fToC(newState.targetTemp);
                    const cmd = newState.thermostatMode === 'heat' 
                        ? 'sdm.devices.commands.ThermostatTemperatureSetpoint.SetHeat'
                        : 'sdm.devices.commands.ThermostatTemperatureSetpoint.SetCool';
                    const paramKey = newState.thermostatMode === 'heat' ? 'heatCelsius' : 'coolCelsius';

                    await fetch(`https://smartdevicemanagement.googleapis.com/v1/${deviceName}:executeCommand`, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({
                            command: cmd,
                            params: { [paramKey]: targetC }
                        })
                    });
                }
            }
            
            // Double check state
            return await getThermostatState();
        } catch (nestErr: any) {
            console.error("Nest SDM command dispatch failed, updating Demo state fallback:", nestErr.message || nestErr);
        }
    }

    if (config.mode === 'homeassistant' && config.haConfig.endpoint && config.haConfig.longLivedToken && config.haConfig.entityId) {
        try {
            const cleanEndpoint = config.haConfig.endpoint.replace(/\/$/, "");
            
            // 1. Send Mode Updates if altered
            if (updates.thermostatMode !== undefined) {
                let haHvacMode = 'off';
                if (updates.thermostatMode === 'heat') haHvacMode = 'heat';
                else if (updates.thermostatMode === 'cool') haHvacMode = 'cool';
                else if (updates.thermostatMode === 'eco') haHvacMode = 'eco';

                await fetch(`${cleanEndpoint}/api/services/climate/set_hvac_mode`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${config.haConfig.longLivedToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        entity_id: config.haConfig.entityId,
                        hvac_mode: haHvacMode
                    })
                });
            }

            // 2. Send Temperature updates if altered
            if (updates.targetTemp !== undefined) {
                // Home Assistant set_temperature accepts Fahrenheit directly if Home Assistant is configured in Imperial
                await fetch(`${cleanEndpoint}/api/services/climate/set_temperature`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${config.haConfig.longLivedToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        entity_id: config.haConfig.entityId,
                        temperature: newState.targetTemp
                    })
                });
            }

            // Refresh state
            return await getThermostatState();
        } catch (haErr: any) {
            console.error("Home Assistant command dispatch failed, updating Demo state fallback:", haErr.message || haErr);
        }
    }

    // Always update Firestore demoState as a fallback and database cache record
    await docRef.set({
        demoState: newState,
        updatedAt: new Date()
    }, { merge: true });

    return newState;
}
