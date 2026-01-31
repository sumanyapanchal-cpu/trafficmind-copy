# -------------------------------
# TRAFFICMIND - BACKEND (BRAIN)
# -------------------------------

# Import Flask (this lets us build a backend)
from flask import Flask, jsonify, request, render_template


# Create the app
# DO NOT change this line
app = Flask(__name__)
# -------------------------------
# HOME ROUTE (TEST PAGE)
# -------------------------------
@app.route("/")
def home():
    return render_template("index.html")

# -------------------------------
# SIMPLE TEST PAGE
# -------------------------------
@app.route("/test")
def test_page():
    return """
    <h2>TrafficMind – Test Panel</h2>

    <p><a href='/simulate_traffic/2'>🚦 Simulate Heavy Traffic (2 km)</a></p>
    <p><a href='/simulate_traffic/0.5'>🚗 Simulate Low Traffic (0.5 km)</a></p>

    <p><a href='/simulate_emergency/Ambulance'>🚑 Emergency: Ambulance</a></p>
    <p><a href='/simulate_emergency/FireTruck'>🚒 Emergency: Fire Truck</a></p>

    <p><a href='/simulate_incident/Accident'>⚠️ Incident: Accident</a></p>
    """
# -------------------------------
# SIMULATION ROUTES
# -------------------------------

@app.route("/simulate_traffic/<length>")
def simulate_traffic(length):
    length = float(length)   # 👈 THIS LINE FIXES EVERYTHING
    red_time = decide_red_light_time(length)
    return jsonify({
    "traffic_length_km": length,
    "red_light_seconds": red_time
})


@app.route("/simulate_emergency/<vehicle>")
def simulate_emergency(vehicle):
    return jsonify({
    "vehicle": vehicle,
    "signal": "GREEN IMMEDIATELY",
    "priority": "HIGH"
})



@app.route("/simulate_incident/<incident>")
def simulate_incident(incident):
   return jsonify({
    "incident": incident,
    "action": "Authorities alerted",
    "severity": "MEDIUM"
})


# -------------------------------
# AI LOGIC : Traffic Decision
# -------------------------------

def decide_red_light_time(traffic_length_km):
    """
    This function decides how long the red light should stay ON
    based on traffic length.
    """

    if traffic_length_km > 1.5:
        return 30   # heavy traffic
    else:
        return 20   # low traffic


# -------------------------------
# ROUTE 1: NORMAL TRAFFIC CONTROL
# -------------------------------
@app.route("/traffic", methods=["POST"])
def traffic_control():

    # Get data sent from frontend
    data = request.json
    traffic_length = data["traffic_length"]

    # AI decides timing
    red_time = decide_red_light_time(traffic_length)

    # Send response
    return jsonify({
        "status": "Traffic adjusted",
        "traffic_length_km": traffic_length,
        "red_light_seconds": red_time
    })


# -------------------------------
# ROUTE 2: EMERGENCY VEHICLE
# -------------------------------
@app.route("/emergency", methods=["POST"])
def emergency_vehicle():

    data = request.json
    vehicle_type = data["vehicle_type"]

    return jsonify({
        "priority": "HIGH",
        "vehicle": vehicle_type,
        "signal": "GREEN IMMEDIATELY",
        "message": "Emergency vehicle given priority"
    })


# ----------------------------------
# ROUTE 3: INCIDENT DETECTION
# ----------------------------------

@app.route("/incident", methods=["POST"])
def incident_detected():

    data = request.get_json()

    incident_type = data.get("incident_type")
    location = data.get("location")

    return jsonify({
        "incident": incident_type,
        "location": location,
        "action": "Authorities alerted",
        "severity": "MEDIUM",
        "status": "HANDLED"
    })




# -------------------------------
# START THE SERVER
# -------------------------------
if __name__ == "__main__":
    app.run(debug=True)
