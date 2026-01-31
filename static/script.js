// ================== GLOBAL STATE ==================
const BASE_URL = "http://127.0.0.1:5000";
let currentMode = "normal"; // normal | emergency | incident
let currentAQI = 150;
let signalState = "red";
let autoCycleTimeout = null;

// ================== API CALL ==================
async function callAPI(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  return await res.json();
}
function updateOutput(title, data) {
  let text = `=== ${title} ===\n\n`;

  for (let key in data) {
    text += `${key}: ${data[key]}\n`;
  }

  document.getElementById("output").textContent = text;
}
function setActiveButton(btn) {
  document.querySelectorAll("#buttons button")
    .forEach(b => b.classList.remove("active"));

  btn.classList.add("active");
}



// ================== SIGNAL CONTROLLER ==================
function updateSignal(color) {
  signalState = color;

  document.querySelectorAll(".signal").forEach(light => {
    light.classList.remove("active", "emergency");
  });

  const active = document.querySelector(`.signal.${color}`);
  if (active) {
    active.classList.add("active");
    if (currentMode === "emergency" && color === "green") {
      active.classList.add("emergency");
    }
  }

  // 🚦 Traffic reacts ONLY here
  if (color === "green") {
    animateTrafficFlow(currentMode === "heavy" ? "slow" : "normal");
  }
}

// ================== AUTO SIGNAL CYCLE ==================
function startAutoCycle() {
  clearTimeout(autoCycleTimeout);

  autoCycleTimeout = setTimeout(() => {
    updateSignal("yellow");

    autoCycleTimeout = setTimeout(() => {
      updateSignal("green");
    }, 3000);

  }, 4000);
}

// ================== AQI ==================
function updateAQI(delta) {
  currentAQI += delta;
  currentAQI = Math.max(150, Math.min(500, currentAQI));

  document.getElementById("aqi-number").textContent = currentAQI;

  const fill = document.getElementById("aqi-fill");
  const label = document.getElementById("aqi-label");

  const height = 50 + ((currentAQI - 150) / 350) * 50;
  fill.style.height = height + "%";

  if (currentAQI <= 200) {
    fill.style.background = "#ffb000";
    label.textContent = "Moderate";
  } else if (currentAQI <= 300) {
    fill.style.background = "#ff7e00";
    label.textContent = "Poor";
  } else {
    fill.style.background = "#ff0000";
    label.textContent = "Very Poor";
  }
}

function updateStatus(text) {
  document.getElementById("signal-status").textContent =
    "Status: " + text;
}

function updateTimer(text) {
  document.getElementById("signal-timer").textContent =
    "Next update in: " + text;
}


// ================== TRAFFIC FLOW ==================
function animateTrafficFlow(speed = "normal") {
  if (signalState !== "green") return;

  const cars = document.querySelectorAll(".road-panel .car");
  const duration = speed === "slow" ? "2.6s" : "1.4s";
  const delay = speed === "slow" ? 500 : 250;

  cars.forEach((car, i) => {
    car.style.transition = "none";
    car.style.left = "240px"; // start RIGHT

    car.offsetHeight; // force reflow

    car.style.transition = `left ${duration} linear`;

    setTimeout(() => {
      car.style.left = "-80px"; // exit LEFT
    }, i * delay);
  });
}

// ================== EMERGENCY ANIMATION ==================
function animateEmergencyVehicle(type) {
  const ambulance = document.querySelector(".road-panel .ambulance");
  const firetruck = document.querySelector(".road-panel .firetruck");
  const cars = document.querySelectorAll(".road-panel .car");

  const vehicle = type === "fire" ? firetruck : ambulance;
  if (!vehicle) return;

  // STEP 1: reset
  ambulance.classList.add("hidden");
  firetruck.classList.add("hidden");

  // STEP 2: show emergency vehicle in center (STOPPED)
  vehicle.classList.remove("hidden");
  vehicle.style.transition = "none";
  vehicle.style.left = "100px";   // center
  updateSignal("red");

  // STEP 3: wait a moment (halt)
  setTimeout(() => {

    // cars move slightly forward/backward (same lane)
    cars.forEach((car, i) => {
      car.style.transition = "all 0.6s ease";
      car.style.top = i % 2 === 0 ? "180px" : "40px";
      car.style.opacity = "0.4";
    });

    updateSignal("green");

    // STEP 4: emergency vehicle moves
    vehicle.offsetHeight;
    vehicle.style.transition = "left 1.6s linear";
    vehicle.style.left = "-80px";

  }, 800);   // 👈 halt time

  // STEP 5: restore traffic
  setTimeout(() => {
    vehicle.classList.add("hidden");

    cars.forEach(car => {
  car.style.transition = "none";
  car.style.top = "";
  car.style.left = "";
  car.style.opacity = "1";

  car.offsetHeight;   // force reset
});

    updateSignal("red");
    currentMode = "normal";
    updateSignal("green");
  }, 2600);
}


    


// ================== BUTTON HANDLERS ==================
function heavyTraffic() {
  currentMode = "heavy";
  clearAccident();
  callAPI("/simulate_traffic/2").then(data => {
    updateOutput("TRAFFIC ANALYSIS", {
      "Traffic Length (km)": data.traffic_length_km,
      "Condition": "Heavy Traffic",
      "Red Light Duration (sec)": data.red_light_seconds,
      "AI Decision": "Increase red signal time"
    });

    updateStatus("RED");
    updateTimer(data.red_light_seconds);
  });

  updateAQI(8);
  updateSignal("red");
  startAutoCycle();
}



function ambulance() {
  currentMode = "emergency";
  clearAccident();
  callAPI("/simulate_emergency/Ambulance").then(data => {
    updateOutput("EMERGENCY MODE", {
      "Vehicle": data.vehicle,
      "Priority": data.priority,
      "Signal": data.signal,
      "Action": "Green corridor created"
    });

    updateStatus("GREEN (EMERGENCY)");
    updateTimer("Immediate");
  });

  updateAQI(1);
  animateEmergencyVehicle("ambulance");
}



function fireTruck() {
  currentMode = "emergency";
  clearAccident();
  callAPI("/simulate_emergency/FireTruck").then(data => {
    updateOutput("EMERGENCY MODE", {
      "Vehicle": data.vehicle,
      "Priority": data.priority,
      "Signal": data.signal,
      "Action": "Green corridor created"
    });

    updateStatus("GREEN (EMERGENCY)");
    updateTimer("Immediate");
  });

  updateAQI(1);
  animateEmergencyVehicle("fire");
}



function lowTraffic() {
  currentMode = "normal";
  clearAccident();
  callAPI("/simulate_traffic/0.5").then(data => {
    updateOutput("TRAFFIC ANALYSIS", {
      "Traffic Length (km)": data.traffic_length_km,
      "Condition": "Low Traffic",
      "Red Light Duration (sec)": data.red_light_seconds,
      "AI Decision": "Maintain normal flow"
    });

    updateStatus("GREEN");
    updateTimer(data.red_light_seconds);
  });

  updateAQI(2);
  updateSignal("green");
}





function accident() {
  currentMode = "incident";
   clearAccident();
  callAPI("/simulate_incident/Accident").then(data => {
    updateOutput("ACCIDENT DETECTED", {
      "Incident": data.incident,
      "Severity": data.severity,
      "Action": data.action,
      "Traffic Status": "SLOW MOVING"
    });

    updateStatus("RED – ACCIDENT");
    updateTimer("Caution Mode");
  });

  updateAQI(5);
  animateAccident();
}




// ================== INIT ==================
updateSignal("red");
updateAQI(0);

function animateAccident() {
  const cars = document.querySelectorAll(".road-panel .car");
  const blast = document.querySelector(".accident");

  // 👇 Accident lane cars (niche wali lane)
  const redCar = cars[3];   // RIGHT → LEFT
  const blueCar = cars[4];  // LEFT → RIGHT

  // cleanup
  blast.classList.add("hidden");

  // SAME lane alignment
  redCar.style.top = "130px";
  blueCar.style.top = "130px";

  // RESET transitions
  redCar.style.transition = "none";
  blueCar.style.transition = "none";

  // 🔴 RED car comes from RIGHT
  redCar.style.left = "240px";

  // 🔵 BLUE car comes from LEFT
  blueCar.style.left = "-60px";

  // force reflow
  redCar.offsetHeight;

  // MOVE towards each other
  redCar.style.transition = "left 1.2s linear";
  blueCar.style.transition = "left 1.2s linear";

  // ❗ STOP with small GAP (no overlap)
  redCar.style.left = "125px";
  blueCar.style.left = "95px";

  // 💥🔥 appear EXACTLY in between (3–5px gap)
  setTimeout(() => {
    blast.style.left = "110px";   // midpoint
    blast.classList.remove("hidden");
    updateSignal("red");
  }, 1200);

  // ⚠️ Upper cars slow down only
  cars.forEach((car, i) => {
    if (i < 3) {
      car.style.transition = "left 3s linear";
    }
  });
}




function clearAccident() {
  const blast = document.querySelector(".accident");
  if (blast) blast.classList.add("hidden");
}

