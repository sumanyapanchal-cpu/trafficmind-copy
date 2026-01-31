// ================== GLOBAL STATE ==================
const BASE_URL = window.location.origin;
const RED_DURATION = 4;    // seconds
const GREEN_DURATION = 15; // seconds

let aqi = 150;

const AQI_MIN = 130;
const AQI_MAX = 180;

function clampAQI(value) {
  return Math.max(AQI_MIN, Math.min(AQI_MAX, value));
}

function updateAQI(delta) {
  aqi = clampAQI(aqi + delta);
  renderAQI();
}

// ===== AQI & TIMER SAFETY HELPERS =====
let aqiInterval = null;
let emergencyAQIInterval = null;

function stopAQIInterval() {
  if (aqiInterval !== null) {
    clearInterval(aqiInterval);
    aqiInterval = null;
  }
}

function stopSignalTimer() {
  if (signalCountdown) {
    clearInterval(signalCountdown);
    signalCountdown = null;
  }
}

function showDashTimer() {
  const timerEl = document.getElementById("signal-timer");
  if (timerEl) {
    timerEl.textContent = "Next update in: —";
  }
}

let currentMode = "normal";
let currentSignal = "red";
let autoCycleTimeout;
let signalCountdown;
let currentAQI = 150; // starting AQI
let emergencyTimeout;
let aqiMode = "normal";
function showDashTimer() {
  const timerEl = document.getElementById("signal-timer-display");
  if (timerEl) timerEl.textContent = "-";
}

function stopSignalTimer() {
  clearInterval(signalCountdown);
}


// ================== API CALL ==================
async function callAPI(endpoint, type) {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  const data = await res.json();

  let output = "";

  // Traffic simulation
  if (data.traffic_length_km !== undefined) {
    output = `
🚦 TRAFFIC ANALYSIS REPORT

• Traffic Length: ${data.traffic_length_km} km
• Red Light Time: ${data.red_light_seconds} seconds

🧠 Decision:
Signal timing adjusted dynamically based on congestion.
`;
  }
  // Emergency vehicle
  else if (data.vehicle) {
    output = `
🚑 EMERGENCY OVERRIDE ACTIVATED

• Vehicle: ${data.vehicle}
• Signal Status: ${data.signal}
• Priority Level: ${data.priority}

✅ Green corridor created successfully.
`;
  }
  // Incident
  else if (data.incident) {
    output = `
⚠️ INCIDENT DETECTED

• Type: ${data.incident}
• Location: ${data.location}
• Severity: ${data.severity}

📢 Action Taken:
${data.action}
`;
  }

  // Decide traffic light based on request type
  if (type === "heavy") {
    updateSignal("red");
    showHeavyTraffic();
  } else if (type === "light") {
    updateSignal("green");
    showLightTraffic();
  } else if (type === "emergency") {
    updateSignal("green");
  } else if (type === "incident") {
    updateSignal("yellow");
    showAccident();
  }

  document.getElementById("output").textContent = output;
}

// ================== TRAFFIC LIGHT CONTROLLER ==================
function updateSignal(color) {
  currentSignal = color;

  // Update signal lights
  document.querySelectorAll(".signal-circle").forEach(light => {
    light.classList.remove("active");
  });

  const signalMap = {
    red: ".red-signal",
    yellow: ".yellow-signal",
    green: ".green-signal"
  };

  const activeSignal = document.querySelector(signalMap[color]);
  if (activeSignal) activeSignal.classList.add("active");

  // 🚗 CONTROL CARS BASED ON SIGNAL
  const cars = document.querySelectorAll(".traffic-car");

  if (color === "red") {
    cars.forEach(car => {
      car.style.animationPlayState = "paused";
    });
  }
// Clear timer when green
const timerEl = document.getElementById("signal-timer-display");
if (timerEl) timerEl.textContent = "";

  if (color === "green") {
  cars.forEach((car, index) => {
    // Let cars go in batches (realistic flow)
    setTimeout(() => {
      car.style.animationPlayState = "running";
    }, index * 120); // ⏱️ staggered release
  });
}


  // Auto-cycle only from RED → GREEN
  if (color === "red" && currentMode === "normal") {
  startAutoCycle();
}
}

function updateAQI(change) {
  currentAQI += change;

  // Clamp AQI (realistic bounds)
  if (currentAQI < 50) currentAQI = 50;
  if (currentAQI > 500) currentAQI = 500;

  // Update number
  document.getElementById("aqi-number").textContent = currentAQI;

  const fill = document.getElementById("aqi-fill");
  const label = document.getElementById("aqi-label");

  // Map AQI to height (max 100%)
  // Map AQI (50–500) → bar height (0–100%)
const normalizedAQI = Math.max(50, Math.min(currentAQI, 500));
const height = ((normalizedAQI - 50) / (500 - 50)) * 100;

fill.style.height = height + "%";


  // AQI categories
  if (currentAQI <= 50) {
    fill.style.background = "#00e400";
    label.textContent = "Good";
  } else if (currentAQI <= 100) {
    fill.style.background = "#a3c853";
    label.textContent = "Satisfactory";
  } else if (currentAQI <= 200) {
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
function updateStatus(statusText, nextUpdateText) {
  document.getElementById("signal-status").textContent =
    "Status: " + statusText;

  document.getElementById("signal-timer").textContent =
    "Next update in: " + nextUpdateText;
}


// ================== AUTO CYCLE ==================
function startAutoCycle() {
  clearInterval(signalCountdown);

  const timerEl = document.getElementById("signal-timer-display");

  // Start with RED countdown
  let timeLeft = RED_DURATION;
  timerEl.textContent = timeLeft;

  signalCountdown = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;

    // 🔴 RED finished → switch to GREEN
    if (currentSignal === "red" && timeLeft <= 0) {
      updateSignal("green");
      timeLeft = GREEN_DURATION;
      timerEl.textContent = timeLeft;
    }

    // 🟢 GREEN finished → switch back to RED
    else if (currentSignal === "green" && timeLeft <= 0) {
      updateSignal("red");
      timeLeft = RED_DURATION;
      timerEl.textContent = timeLeft;
    }

  }, 1000);
}



// ================== BUTTON FUNCTIONS ==================
function heavyTraffic() {
  updateAQI(+5);

  updateStatus("Heavy congestion detected", "30 seconds");
  callAPI("/simulate_traffic/2", "heavy");
  
  
}


function lowTraffic() {
  updateAQI(-4);
  updateStatus("Traffic flowing smoothly", "20 seconds");
  callAPI("/simulate_traffic/0.5", "light");
  
  // After traffic clears, gradually reduce AQI
}

function accident() {
  updateAQI(+3)
  stopSignalTimer();   // ⛔ stop countdown
  showDashTimer();    // ➖ show "-"
  
  updateStatus("Incident under monitoring", "45 seconds");
  callAPI("/simulate_incident/Accident", "incident");
  

}

function ambulance() {
  updateAQI(+2);
  // 🔒 lock AQI to emergency mode
  aqiMode = "emergency";
  stopAQIInterval();
  stopSignalTimer();
  showDashTimer();

  updateStatus("Emergency corridor active", "Until cleared");
  startEmergencyAnimation('Ambulance');
  callAPI("/simulate_emergency/Ambulance", "emergency");



}



function fireTruck() {
  updateAQI(+4)
  // 🔐 lock AQI to emergency mode
  aqiMode = "emergency";

  stopAQIInterval();
  stopSignalTimer();
  showDashTimer(); // show "-"

  updateStatus("Emergency corridor active", "Until cleared");
  startEmergencyAnimation("FireTruck");
  callAPI("/simulate_emergency/FireTruck", "emergency");

}


// ================== EMERGENCY ANIMATION CONTROLS ==================
function startEmergencyAnimation(type) {
  clearTimeout(emergencyTimeout);
  currentMode = 'emergency';

  // Show heavy traffic in background
  showHeavyTraffic();

  // Hide accident if showing
  document.getElementById('accident-scene').classList.remove('show');

  const element = type.toLowerCase().includes('ambulance') 
    ? document.getElementById('ambulance-scene')
    : document.getElementById('firetruck-scene');

  if (!element) return;

  element.classList.remove('animate');
  void element.offsetWidth; // Trigger reflow
  element.classList.add('animate');

  // Activate green immediately
  updateSignal('green');

  // Stop animation after duration
  emergencyTimeout = setTimeout(() => {
    stopEmergencyAnimation();
  }, 3500);
}

function stopEmergencyAnimation() {
  clearTimeout(emergencyTimeout);

  document.getElementById('ambulance-scene').classList.remove('animate');
  document.getElementById('firetruck-scene').classList.remove('animate');
  // 🛑 stop AQI improvement after emergency ends
if (emergencyAQIInterval) {
  clearInterval(emergencyAQIInterval);
  emergencyAQIInterval = null;
}

  // Clear traffic
  clearHeavyTraffic();

  currentMode = 'normal';
  updateSignal('red');
}

function showAccident() {
  clearTimeout(emergencyTimeout);
  
  // Show heavy traffic in background
  showHeavyTraffic();
  
  document.getElementById('accident-scene').classList.add('show');

  emergencyTimeout = setTimeout(() => {
    document.getElementById('accident-scene').classList.remove('show');
    // Clear traffic after accident
    clearHeavyTraffic();
  }, 4000);
}

function showHeavyTraffic() {
  const container = document.getElementById('traffic-cars');
  container.innerHTML = '';

  const colors = ['color-red', 'color-blue', 'color-white', 'color-black'];
  const lanes = [63, 143, 223, 303, 383]; // Centered on all 5 lanes
  const vehicleCount = 30;

  for (let i = 0; i < vehicleCount; i++) {
    const car = document.createElement('div');
    car.className = 'traffic-car ' + colors[Math.floor(Math.random() * colors.length)];
    
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const spacing = Math.random() * 18 + 22;
    
    car.style.top = lane + 'px';
    car.style.left = (i * spacing) + 'px';
    
    // Add headlights
    const leftLight = document.createElement('div');
    leftLight.className = 'headlight headlight-left';
    
    const rightLight = document.createElement('div');
    rightLight.className = 'headlight headlight-right';
    
    // Add windshield
    const windshield = document.createElement('div');
    windshield.className = 'windshield';
    
    // Add rear window
    const rearWindow = document.createElement('div');
    rearWindow.className = 'rear-window';
    
    // Add door line
    const door = document.createElement('div');
    door.className = 'door';
    
    // Add rear light
    const rearLight = document.createElement('div');
    rearLight.className = 'rear-light';
    
    car.appendChild(leftLight);
    car.appendChild(rightLight);
    car.appendChild(windshield);
    car.appendChild(rearWindow);
    car.appendChild(door);
    car.appendChild(rearLight);
    
    container.appendChild(car);
    // Respect current signal
if (currentSignal === "red") {
  car.style.animationPlayState = "paused";
  if (currentSignal === "green") {
  car.style.animationPlayState = "running";
  updateAQI(-4);


}
}
  }
}

function clearHeavyTraffic() {
  document.getElementById('traffic-cars').innerHTML = '';
}

function showLightTraffic() {
  const container = document.getElementById('traffic-cars');
  container.innerHTML = '';

  const colors = ['color-red', 'color-blue', 'color-white', 'color-black'];
  const lanes = [63, 143, 223, 303, 383]; // Centered on all 5 lanes
  const vehicleCount = 6;

  for (let i = 0; i < vehicleCount; i++) {
    const car = document.createElement('div');
    car.className = 'traffic-car ' + colors[Math.floor(Math.random() * colors.length)];
    
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const spacing = Math.random() * 60 + 100;
    
    car.style.top = lane + 'px';
    car.style.left = (80 + i * spacing) + 'px';
    
    // Add headlights
    const leftLight = document.createElement('div');
    leftLight.className = 'headlight headlight-left';
    
    const rightLight = document.createElement('div');
    rightLight.className = 'headlight headlight-right';
    
    // Add windshield
    const windshield = document.createElement('div');
    windshield.className = 'windshield';
    
    // Add rear window
    const rearWindow = document.createElement('div');
    rearWindow.className = 'rear-window';
    
    // Add door line
    const door = document.createElement('div');
    door.className = 'door';
    
    // Add rear light
    const rearLight = document.createElement('div');
    rearLight.className = 'rear-light';
    
    car.appendChild(leftLight);
    car.appendChild(rightLight);
    car.appendChild(windshield);
    car.appendChild(rearWindow);
    car.appendChild(door);
    car.appendChild(rearLight);
    
    container.appendChild(car);
    if (currentSignal === "red") {
  car.style.animationPlayState = "paused";
  if (currentSignal === "green") {
  car.style.animationPlayState = "running";
}
}
  }
}

// ===== INITIAL AQI RENDER ON PAGE LOAD =====
updateAQI(0)