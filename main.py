from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Added global state for interactivity
SYSTEM_STATE = {
    "forced_leak": False,
    "acknowledged": False,
    "wind_direction": "North",
    "wind_speed": 12
}

SENSORS = {
    "NODE_01": {"location": "Sector 4 CNG Valve", "type": "pipeline", "base_ppm": 2.0},
    "NODE_02": {"location": "City Outskirts Landfill", "type": "landfill", "base_ppm": 15.0},
    "NODE_03": {"location": "Dairy Farm Cluster", "type": "livestock", "base_ppm": 8.0}
}

@app.post("/api/trigger-leak")
def trigger_leak():
    SYSTEM_STATE["forced_leak"] = True
    SYSTEM_STATE["acknowledged"] = False
    return {"status": "Leak triggered"}

@app.post("/api/acknowledge")
def acknowledge_alert():
    SYSTEM_STATE["acknowledged"] = True
    return {"status": "Alert acknowledged"}

@app.post("/api/reset")
def reset_system():
    SYSTEM_STATE["forced_leak"] = False
    SYSTEM_STATE["acknowledged"] = False
    # Randomize wind on reset
    SYSTEM_STATE["wind_direction"] = random.choice(["North", "South", "East", "West"])
    SYSTEM_STATE["wind_speed"] = random.randint(5, 20)
    return {"status": "System reset"}

@app.get("/api/telemetry")
def get_telemetry():
    telemetry_data = []

    for node_id, data in SENSORS.items():
        current_ppm = data["base_ppm"] + random.uniform(-1, 5)
        
        # Inject interactive leak
        if node_id == "NODE_01" and SYSTEM_STATE["forced_leak"]:
            # If acknowledged, PPM drops slightly but remains elevated. If not, it spikes huge.
            if SYSTEM_STATE["acknowledged"]:
                current_ppm += random.uniform(20, 30)
            else:
                current_ppm += random.uniform(80, 150)

        status = "Safe"
        alert_level = "green"
        attribution = "Normal background levels."

        if current_ppm > 50 and data["type"] == "pipeline":
            status = "CRITICAL LEAK"
            alert_level = "red" if not SYSTEM_STATE["acknowledged"] else "yellow"
            attribution = f"Point-source anomaly detected. Wind ({SYSTEM_STATE['wind_speed']}km/h {SYSTEM_STATE['wind_direction']}) aligns with CNG Valve geometry."
            if SYSTEM_STATE["acknowledged"]:
                attribution += " [TEAM DISPATCHED]"
        elif current_ppm > 20 and data["type"] == "landfill":
            status = "Elevated Emissions"
            alert_level = "yellow"
            attribution = "Diffuse emission spike. Consistent with decomposing organic matter off-gassing."
        elif current_ppm > 15 and data["type"] == "livestock":
            status = "Background Methane"
            alert_level = "green"
            attribution = "Elevated levels, but pattern matches steady herd emissions. No pipeline nearby."

        telemetry_data.append({
            "node_id": node_id,
            "location": data["location"],
            "ppm": round(current_ppm, 2),
            "status": status,
            "alert_level": alert_level,
            "attribution": attribution,
            "timestamp": int(time.time())
        })

    return {
        "weather": {"wind_direction": SYSTEM_STATE["wind_direction"], "wind_speed": SYSTEM_STATE["wind_speed"]},
        "sensors": telemetry_data
    }