let planets = [];
let path = [];
let numPlanets = 4;
let fuel;
let maxFuel;
let displayFuel; // For smooth bar animation
let gameState = "START"; 
let currentLevel = 1;
const MAX_PLANETS = 12; 

// --- FX VARIABLES ---
let stars = [];
let nebulas = [];
let comets = [];
let particles = []; 
let floatingTexts = []; // Array for the "-15 Fuel" popups
let shakeAmount = 0; // Global screen shake value
let btnRestart, btnUndo;

function setup() {
  createCanvas(600, 600);
  
  // Create Starfield
  for (let i = 0; i < 150; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(0.5, 2.5),
      baseAlpha: random(100, 255),
      offset: random(TWO_PI) 
    });
  }

  // Create Nebulas
  for (let i = 0; i < 5; i++) {
    nebulas.push(new Nebula());
  }
  
  resetLevel();
}

function draw() {
  // --- JUICE: SCREEN SHAKE ---
  push(); // Save coordinate system
  if (shakeAmount > 0) {
    translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
    shakeAmount *= 0.9; // Decay the shake
    if (shakeAmount < 0.5) shakeAmount = 0;
  }

  background(15, 15, 30); 
  
  drawNebulas();
  drawStars();
  handleComets(); 

  if (gameState === "START") {
    drawStartScreen();
  } else if (gameState === "PLAY") {
    drawGame();
  } else if (gameState === "WIN") {
    drawGame(); 
    handleParticles(); 
    drawWinOverlay();
  } else if (gameState === "GAMEOVER") {
    drawGame();
    drawGameOverOverlay();
  } else if (gameState === "FINAL_WIN") {
    drawGame(); 
    handleParticles();
    if (frameCount % 10 === 0) spawnWinConfetti(); 
    drawFinalScreen();
  }
  
  // Handle Floating Text (renders on top of everything)
  handleFloatingText();
  
  // --- JUICE: CUSTOM CURSOR ---
  // Draw a cool reticle
  noCursor();
  stroke(255, 100);
  noFill();
  circle(mouseX, mouseY, 20);
  line(mouseX - 15, mouseY, mouseX + 15, mouseY);
  line(mouseX, mouseY - 15, mouseX, mouseY + 15);

  pop(); // Restore coordinate system (undo shake)
}

// --- CORE LOGIC ---

function resetLevel() {
  planets = [];
  path = [];
  
  // Generate Planets (Now strictly Objects, not just Vectors)
  let attempts = 0;
  while (planets.length < numPlanets && attempts < 1000) {
    let buffer = 60;
    let x = random(buffer, width - buffer);
    let y = random(buffer, height - 180); 
    let v = createVector(x, y);
    
    let overlapping = false;
    for (let p of planets) {
      if (dist(v.x, v.y, p.pos.x, p.pos.y) < 60) { // Bigger buffer
        overlapping = true;
        break;
      }
    }
    
    if (!overlapping) {
      // JUICE: Start size at 0 for "Pop In" effect
      planets.push({ pos: v, size: 0, baseColor: color(255, 80, 80) });
    }
    attempts++;
  }

  // Greedy Scout Calculation
  let scoutFuel = calculateGreedyPathCost();
  maxFuel = Math.ceil((scoutFuel / 10) * 1.05); 
  fuel = maxFuel;
  displayFuel = maxFuel; // Sync display

  path.push(0); 
  particles = []; 
  gameState = "PLAY";
  
  // Trigger Level Start Shake
  shakeAmount = 5;
}

function calculateGreedyPathCost() {
  let visited = [0];
  let current = 0;
  let totalDist = 0;
  
  while (visited.length < planets.length) {
    let record = Infinity;
    let nextIndex = -1;
    
    for (let i = 0; i < planets.length; i++) {
      if (!visited.includes(i)) {
        let d = dist(planets[current].pos.x, planets[current].pos.y, planets[i].pos.x, planets[i].pos.y);
        if (d < record) {
          record = d;
          nextIndex = i;
        }
      }
    }
    
    if (nextIndex !== -1) {
      visited.push(nextIndex);
      totalDist += record;
      current = nextIndex;
    }
  }
  totalDist += dist(planets[current].pos.x, planets[current].pos.y, planets[0].pos.x, planets[0].pos.y);
  return totalDist;
}

function drawGame() {
  // 1. Draw Path
  strokeWeight(3);
  // JUICE: Faster, brighter pulse
  let pulse = map(sin(millis() * 0.01), -1, 1, 150, 255);
  
  for (let i = 0; i < path.length - 1; i++) {
    let p1 = planets[path[i]].pos;
    let p2 = planets[path[i+1]].pos;
    
    stroke(0, 255, 255, pulse); 
    line(p1.x, p1.y, p2.x, p2.y);
    drawCostLabel(p1, p2, "FIXED");
  }

  // 2. Planning Mode
  if (gameState === "PLAY") {
    let currentIdx = path[path.length - 1];
    let currentPlanet = planets[currentIdx];

    stroke(255, 255, 0, 150); 
    strokeWeight(1);
    line(currentPlanet.pos.x, currentPlanet.pos.y, mouseX, mouseY);

    for (let i = 0; i < planets.length; i++) {
      let isVisited = path.includes(i);
      let isHome = (i === 0);
      let allVisited = (path.length === planets.length);
      let canGoTo = (!isVisited) || (isHome && allVisited);
      
      if (canGoTo && i !== currentIdx) {
        stroke(255, 255, 255, 30); 
        line(currentPlanet.pos.x, currentPlanet.pos.y, planets[i].pos.x, planets[i].pos.y);
        drawCostLabel(currentPlanet.pos, planets[i].pos, "PLAN");
      }
    }
  }

  // 3. Draw Planets with JUICE (Smooth Scaling)
  for (let i = 0; i < planets.length; i++) {
    let p = planets[i];
    let isHover = dist(mouseX, mouseY, p.pos.x, p.pos.y) < 25;
    
    // Target size logic
    let targetSize = 30;
    if (isHover) targetSize = 50; // Expand on hover
    if (i === 0) targetSize += 5; // Home is bigger
    
    // JUICE: Lerp size for smooth animation
    p.size = lerp(p.size, targetSize, 0.2);
    
    // Color Logic
    let c;
    if (path.includes(i)) c = color(100, 255, 100); 
    else c = color(255, 80, 80); 
    if (i === 0) c = color(255, 220, 50); 
    
    // Glow
    noStroke();
    fill(red(c), green(c), blue(c), 50);
    circle(p.pos.x, p.pos.y, p.size * 1.5); 

    // Body
    fill(c); 
    circle(p.pos.x, p.pos.y, p.size);
    
    // Label
    fill(0);
    textSize(12);
    textAlign(CENTER, CENTER);
    text(i === 0 ? "H" : (path.includes(i) ? path.indexOf(i) : ""), p.pos.x, p.pos.y);
  }

  drawUI();
}

// --- VISUAL FX ---

function drawStars() {
  noStroke();
  for (let s of stars) {
    // JUICE: Stars twinkle independently
    let alpha = map(sin(millis() * 0.005 + s.offset), -1, 1, 50, 255);
    fill(255, 255, 255, alpha);
    circle(s.x, s.y, s.size);
  }
}

function drawNebulas() {
  for (let n of nebulas) { n.update(); n.display(); }
}

function handleComets() {
  if (random(1) < 0.01 && comets.length < 2) comets.push(new Comet());
  for (let i = comets.length - 1; i >= 0; i--) {
    comets[i].update();
    comets[i].display();
    if (comets[i].isDead()) comets.splice(i, 1);
  }
}

function handleParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].alpha <= 0) particles.splice(i, 1);
  }
}

function handleFloatingText() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].update();
    floatingTexts[i].display();
    if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
  }
}

function spawnWinConfetti() {
  for (let i = 0; i < 30; i++) particles.push(new Particle(width/2, height/2));
}

// --- CLASSES ---

class FloatingText {
  constructor(txt, x, y, color) {
    this.txt = txt;
    this.pos = createVector(x, y);
    this.life = 255;
    this.color = color;
  }
  update() {
    this.pos.y -= 1.5; // Float up
    this.life -= 5;    // Fade out
  }
  display() {
    fill(red(this.color), green(this.color), blue(this.color), this.life);
    noStroke();
    textSize(16);
    textStyle(BOLD);
    textAlign(CENTER);
    text(this.txt, this.pos.x, this.pos.y);
    textStyle(NORMAL);
  }
}

class Nebula {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.size = random(200, 400);
    this.color = color(random(50, 100), 0, random(100, 200), 5); 
    this.offset = random(1000);
  }
  update() { this.pos.x += map(noise(this.offset), 0, 1, -0.2, 0.2); this.offset += 0.01; }
  display() { noStroke(); fill(this.color); circle(this.pos.x, this.pos.y, this.size); }
}

class Comet {
  constructor() {
    this.pos = createVector(random(width), -50);
    this.vel = createVector(random(-3, 3), random(3, 6)); 
    this.history = [];
  }
  update() { this.pos.add(this.vel); this.history.push(this.pos.copy()); if (this.history.length > 20) this.history.shift(); }
  display() {
    noStroke();
    for (let i = 0; i < this.history.length; i++) {
      let pos = this.history[i];
      let size = map(i, 0, this.history.length, 1, 6);
      let alpha = map(i, 0, this.history.length, 0, 255);
      fill(200, 200, 255, alpha);
      circle(pos.x, pos.y, size);
    }
  }
  isDead() { return (this.pos.y > height + 50); }
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 8));
    this.alpha = 255;
    this.color = color(random(100, 255), random(100, 255), 255);
    this.drag = 0.95;
  }
  update() { this.pos.add(this.vel); this.vel.mult(this.drag); this.alpha -= 4; }
  display() { noStroke(); fill(red(this.color), green(this.color), blue(this.color), this.alpha); circle(this.pos.x, this.pos.y, random(3,6)); }
}

// --- UI & CONTROL ---

function drawCostLabel(p1, p2, type) {
  let midX = (p1.x + p2.x) / 2;
  let midY = (p1.y + p2.y) / 2;
  let cost = Math.floor(dist(p1.x, p1.y, p2.x, p2.y) / 10);
  
  noStroke();
  rectMode(CENTER);
  if (type === "FIXED") { fill(0, 0, 0, 200); rect(midX, midY, 24, 16, 4); fill(0, 255, 255); } 
  else { fill(0, 0, 0, 150); rect(midX, midY, 24, 16, 4); fill(200); }
  textAlign(CENTER, CENTER); textSize(10); text(cost, midX, midY);
}

function drawUI() {
  fill(30, 30, 50); rectMode(CORNER); rect(0, height - 120, width, 120);
  
  fill(255); textAlign(LEFT); textSize(14);
  text(`Level: ${currentLevel}`, 20, height - 90);
  let complexity = factorial(numPlanets - 1) / 2; 
  text(`Paths: ${complexity}`, 20, height - 60);
  
  textAlign(RIGHT); textSize(16);
  text(`Fuel: ${Math.floor(fuel)} / ${Math.floor(maxFuel)}`, width - 20, height - 90);
  
  // JUICE: Smooth Fuel Bar
  displayFuel = lerp(displayFuel, fuel, 0.1); // Smooth transition
  
  noStroke(); fill(40); rect(width - 220, height - 80, 200, 20, 10);
  let fuelPct = constrain(displayFuel / maxFuel, 0, 1);
  
  if (fuelPct > 0.5) fill(0, 255, 0); 
  else if (fuelPct > 0.2) fill(255, 165, 0); 
  else fill(255, 0, 0);
  
  rect(width - 220, height - 80, 200 * fuelPct, 20, 10);
  
  drawButton("UNDO", 20, height - 40, 80, 30, () => {
    if (path.length > 1 && gameState !== "WIN" && gameState !== "FINAL_WIN") {
      let currentIdx = path.pop(); 
      let prevIdx = path[path.length - 1]; 
      let cost = Math.floor(dist(planets[prevIdx].pos.x, planets[prevIdx].pos.y, planets[currentIdx].pos.x, planets[currentIdx].pos.y) / 10);
      fuel += cost;
      
      // Refund Text
      floatingTexts.push(new FloatingText("+" + cost, planets[currentIdx].pos.x, planets[currentIdx].pos.y - 20, color(0, 255, 0)));
      
      gameState = "PLAY"; 
    }
  });
  
  drawButton("RESTART", 110, height - 40, 80, 30, () => {
    if (gameState !== "FINAL_WIN") {
      path = [0]; fuel = maxFuel; displayFuel = maxFuel; gameState = "PLAY";
      shakeAmount = 5; // Little shake on reset
    } else {
      currentLevel = 1; numPlanets = 4; resetLevel();
    }
  });
}

function drawButton(label, x, y, w, h, action) {
  let isHover = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
  if (isHover) fill(100, 100, 255); else fill(60, 60, 100);
  stroke(200); strokeWeight(1); rectMode(CORNER); rect(x, y, w, h, 5);
  noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(12); text(label, x + w/2, y + h/2);
  if (!window.btnRegions) window.btnRegions = [];
  window.btnRegions.push({x, y, w, h, action});
}

function mousePressed() {
  if (window.btnRegions) {
    for (let btn of window.btnRegions) {
      if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) {
        btn.action(); return; 
      }
    }
  }

  if (gameState === "PLAY") {
    checkPlanetClick();
  } else if (gameState === "WIN") {
    if (numPlanets < MAX_PLANETS) {
      currentLevel++;
      numPlanets++; 
      resetLevel();
    } else {
      gameState = "FINAL_WIN";
    }
  } else if (gameState === "GAMEOVER" || gameState === "START") {
    currentLevel = 1; numPlanets = 4; resetLevel();
  }
}

function checkPlanetClick() {
  let lastIdx = path[path.length - 1];
  let lastPlanet = planets[lastIdx];
  for (let i = 0; i < planets.length; i++) {
    let d = dist(mouseX, mouseY, planets[i].pos.x, planets[i].pos.y);
    if (d < 30) { // Larger click area
      let cost = Math.floor(dist(lastPlanet.pos.x, lastPlanet.pos.y, planets[i].pos.x, planets[i].pos.y) / 10);
      let isHome = (i === 0);
      let visitedAll = (path.length === planets.length);
      let alreadyVisited = path.includes(i);
      
      if (!alreadyVisited && fuel >= cost) { 
        path.push(i); 
        fuel -= cost; 
        // JUICE: Shake and Text
        shakeAmount = 2;
        floatingTexts.push(new FloatingText("-" + cost, planets[i].pos.x, planets[i].pos.y - 20, color(255, 100, 100)));
      }
      else if (isHome && visitedAll && fuel >= cost) { 
        path.push(i); 
        fuel -= cost; 
        gameState = "WIN"; 
        shakeAmount = 10; // Big victory shake
        spawnWinConfetti(); 
      }
      
      if (fuel <= 0 && gameState !== "WIN") {
        gameState = "GAMEOVER";
        shakeAmount = 15; // Trauma shake
      }
      break; 
    }
  }
}

function factorial(n) {
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}

function drawStartScreen() {
  window.btnRegions = [];
  textAlign(CENTER); fill(255); textSize(40); text("GALACTIC CIRCUIT", width / 2, height / 2 - 40);
  textSize(16); fill(200, 200, 255); text("Click to Initialize Systems", width / 2, height / 2 + 50);
}

function drawWinOverlay() {
  window.btnRegions = [];
  fill(0, 0, 0, 150); rectMode(CORNER); rect(0, 0, width, height);
  textAlign(CENTER); fill(0, 255, 0); textSize(40); text("SURVEY COMPLETE!", width / 2, height / 2);
  textSize(20); fill(255); text("Click for Next Sector", width / 2, height / 2 + 50);
}

function drawGameOverOverlay() {
  window.btnRegions = [];
  fill(0, 0, 0, 150); rectMode(CORNER); rect(0, 0, width, height);
  textAlign(CENTER); fill(255, 0, 0); textSize(40); text("FUEL DEPLETED", width / 2, height / 2);
  textSize(20); fill(255); text("Click to Retry Sector", width / 2, height / 2 + 50);
}

function drawFinalScreen() {
  fill(0, 0, 0, 200); rectMode(CORNER); rect(0, 0, width, height);
  textAlign(CENTER); 
  fill(0, 255, 255); textSize(32); text("GALACTIC MASTER!", width / 2, height / 2 - 80);
  fill(255); textSize(16); text("You have solved the 12-Planet System.", width/2, height/2 - 40);
  fill(255, 200, 100); text("Congrats!", width/2, height/2 + 10);
  fill(200); textSize(14); text("Thank you for taking the time to explore this minigame", width/2, height/2 + 40);
    fill(0, 255, 0); textSize(18); text("Press RESTART to play again or simply refresh the page.", width/2, height/2 + 130);
}
