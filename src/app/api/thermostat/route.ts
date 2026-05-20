import { NextRequest, NextResponse } from "next/server";
import { getThermostatConfig, getThermostatState, saveThermostatConfig, updateThermostatState } from "@/lib/thermostat-service";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const config = await getThermostatConfig();
        const state = await getThermostatState();
        
        // Return details safely. Mask raw secrets before sending to client.
        return NextResponse.json({
            mode: config.mode,
            state,
            config: {
                mode: config.mode,
                nestConfig: {
                    enterpriseId: config.nestConfig.enterpriseId,
                    clientId: config.nestConfig.clientId ? `${config.nestConfig.clientId.substring(0, 6)}...` : null,
                    isSecretConfigured: !!config.nestConfig.clientSecret,
                    isRefreshTokenConfigured: !!config.nestConfig.refreshToken
                },
                haConfig: {
                    endpoint: config.haConfig.endpoint,
                    isTokenConfigured: !!config.haConfig.longLivedToken,
                    entityId: config.haConfig.entityId
                }
            }
        });
    } catch (e: any) {
        console.error("Thermostat GET API failed:", e.message || e);
        return NextResponse.json({ error: e.message || "Failed to query thermostat state" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action } = body;

        if (action === 'saveConfig') {
            const { mode, nestConfig, haConfig } = body;
            
            if (mode && mode !== 'demo' && mode !== 'nest' && mode !== 'homeassistant') {
                return NextResponse.json({ error: "Invalid mode. Must be 'demo', 'nest', or 'homeassistant'" }, { status: 400 });
            }

            const dbUpdates: any = {};
            if (mode) dbUpdates.mode = mode;
            
            if (nestConfig) {
                // Read existing config first to avoid overwriting password-masked keys
                const current = await getThermostatConfig();
                dbUpdates.nestConfig = {
                    enterpriseId: nestConfig.enterpriseId ?? current.nestConfig.enterpriseId,
                    clientId: nestConfig.clientId ?? current.nestConfig.clientId,
                    clientSecret: nestConfig.clientSecret || current.nestConfig.clientSecret, // only overwrite if new string provided
                    refreshToken: nestConfig.refreshToken || current.nestConfig.refreshToken
                };
            }
            
            if (haConfig) {
                const current = await getThermostatConfig();
                dbUpdates.haConfig = {
                    endpoint: haConfig.endpoint ?? current.haConfig.endpoint,
                    longLivedToken: haConfig.longLivedToken || current.haConfig.longLivedToken,
                    entityId: haConfig.entityId ?? current.haConfig.entityId
                };
            }

            await saveThermostatConfig(dbUpdates);
            
            return NextResponse.json({ success: true, message: "Thermostat settings updated." });
        }
        
        if (action === 'updateState') {
            const { ambientTemp, targetTemp, humidity, hvacStatus, thermostatMode } = body;
            
            const updates: any = {};
            if (ambientTemp !== undefined) updates.ambientTemp = Number(ambientTemp);
            if (targetTemp !== undefined) updates.targetTemp = Number(targetTemp);
            if (humidity !== undefined) updates.humidity = Number(humidity);
            if (hvacStatus !== undefined) updates.hvacStatus = hvacStatus;
            if (thermostatMode !== undefined) updates.thermostatMode = thermostatMode;

            const updatedState = await updateThermostatState(updates);
            
            return NextResponse.json({ success: true, state: updatedState });
        }

        return NextResponse.json({ error: "Invalid action. Must be 'saveConfig' or 'updateState'" }, { status: 400 });
    } catch (e: any) {
        console.error("Thermostat POST API failed:", e.message || e);
        return NextResponse.json({ error: e.message || "Failed to dispatch thermostat updates" }, { status: 500 });
    }
}
