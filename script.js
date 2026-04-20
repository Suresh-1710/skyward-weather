// Config bindings from config.js
const API_KEY = CONFIG.API_KEY; 
const API_BASE = CONFIG.API_BASE;

// ===================== STATE =====================
let currentUnit = 'metric';
let isDarkMode = localStorage.getItem('themeMode') === 'dark';
let isLoading = false;

// ===================== DOM ELEMENTS =====================
const els = {
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    geolocateBtn: document.getElementById('geolocateBtn'),
    messageContainer: document.getElementById('messageContainer'),
    loadingState: document.getElementById('loadingState'),
    weatherContent: document.getElementById('weatherContent'),
    noData: document.getElementById('noData'),
    locName: document.getElementById('locationName'),
    lastUpdated: document.getElementById('lastUpdated'),
    wIcon: document.getElementById('weatherIcon'),
    temp: document.getElementById('temperature'),
    desc: document.getElementById('description'),
    feels: document.getElementById('feelsLike'),
    humidity: document.getElementById('humidity'),
    wind: document.getElementById('windSpeed'),
    minTemp: document.getElementById('minTemp'),
    maxTemp: document.getElementById('maxTemp'),
    forecastGrid: document.getElementById('forecastGrid'),
    parallaxBg: document.getElementById('parallax-bg'),
    sunMoon: document.getElementById('layer-sun-moon'),
    layerRain: document.getElementById('layer-rain')
};

// ===================== INIT & EVENTS =====================
function init() {
    setupRipples();
    applyTheme();
    setupEventListeners();
}

function setupEventListeners() {
    els.themeToggle.addEventListener('click', toggleTheme);
    els.searchBtn.addEventListener('click', () => searchCity());
    els.geolocateBtn.addEventListener('click', useGeolocation);
    els.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchCity();
    });

    // Parallax mouse movement
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX * -1) / 100;
        const y = (e.clientY * -1) / 100;
        els.parallaxBg.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
}

// Ripple Effect
function setupRipples() {
    const buttons = document.querySelectorAll('.btn-ripple');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Remove existing ripples
            const existingRipples = this.querySelectorAll('.ripple');
            existingRipples.forEach(r => r.remove());

            let ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);
            
            let rect = this.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            
            // Apply coordinates and animation
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            setTimeout(() => { ripple.remove(); }, 600);
        });
    });
}

// ===================== THEME & BG =====================
function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('themeMode', isDarkMode ? 'dark' : 'light');
    applyTheme();
}

function applyTheme() {
    els.themeIcon.textContent = isDarkMode ? '☀️' : '🌙';
    updateBackgroundState('default'); // reset to theme default base
}

function updateBackgroundState(weatherMain) {
    const main = (weatherMain || '').toLowerCase();
    
    // Hide rain by default
    els.layerRain.style.opacity = '0';

    if (main.includes('rain') || main.includes('drizzle')) {
        els.parallaxBg.style.background = 'var(--sky-gradient-rain)';
        els.layerRain.style.opacity = '0.7';
    } else if (main.includes('cloud')) {
        els.parallaxBg.style.background = 'var(--sky-gradient-cloudy)';
    } else {
        els.parallaxBg.style.background = isDarkMode ? 'var(--sky-gradient-night)' : 'var(--sky-gradient-day)';
    }

    if (isDarkMode) {
        // Moon
        els.sunMoon.style.background = 'radial-gradient(circle, rgba(200,200,200,1) 0%, rgba(150,150,150,1) 50%, rgba(0,0,0,0) 70%)';
        els.sunMoon.style.boxShadow = '0 0 40px rgba(255,255,255,0.3)';
    } else {
        // Sun
        els.sunMoon.style.background = 'radial-gradient(circle, rgba(255,230,150,1) 0%, rgba(255,200,0,1) 50%, rgba(255,200,0,0) 70%)';
        els.sunMoon.style.boxShadow = '0 0 60px rgba(255,200,0,0.6)';
    }
}

// ===================== MESSAGES =====================
function showMessage(msg, type = 'error') {
    els.messageContainer.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
    setTimeout(() => { els.messageContainer.innerHTML = ''; }, 3000);
}

// ===================== LOGIC =====================
function setLoading(loading) {
    isLoading = loading;
    els.searchBtn.disabled = loading;
    if(loading) {
        els.loadingState.classList.remove('hidden');
        els.weatherContent.classList.add('hidden');
        els.noData.classList.add('hidden');
    } else {
        els.loadingState.classList.add('hidden');
    }
}

function useGeolocation() {
    if (!navigator.geolocation) return showMessage('Geolocation not supported');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
        pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        err => { setLoading(false); showMessage('Location access denied'); }
    );
}

async function searchCity() {
    const city = els.cityInput.value.trim();
    if (!city) return;
    setLoading(true);
    try {
        const res = await fetch(`${API_BASE}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`);
        if (!res.ok) throw new Error('City not found');
        const data = await res.json();
        
        // Fetch forecast as well
        const forecastRes = await fetch(`${API_BASE}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`);
        const forecastData = await forecastRes.json();
        
        displayData(data, forecastData);
    } catch(err) {
        setLoading(false);
        showMessage(err.message, 'error');
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        const res = await fetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`);
        if (!res.ok) throw new Error('Weather data failed');
        const data = await res.json();
        
        const forecastRes = await fetch(`${API_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`);
        const forecastData = await forecastRes.json();

        displayData(data, forecastData);
    } catch(err) {
        setLoading(false);
        showMessage(err.message, 'error');
    }
}

// Display Data
function displayData(current, forecastData) {
    // Current Weather
    const mainCondition = current.weather[0].main;
    els.locName.textContent = current.name;
    els.temp.textContent = `${Math.round(current.main.temp)}°`;
    els.desc.textContent = current.weather[0].description;
    els.feels.textContent = `Feels like ${Math.round(current.main.feels_like)}°`;
    els.humidity.textContent = `${current.main.humidity}%`;
    els.wind.textContent = `${current.wind.speed} m/s`;
    els.minTemp.textContent = `${Math.round(current.main.temp_min)}°`;
    els.maxTemp.textContent = `${Math.round(current.main.temp_max)}°`;
    els.lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
    
    els.wIcon.textContent = getIcon(current.weather[0].icon);
    
    // Background Update
    updateBackgroundState(mainCondition);

    // Forecast processing
    const daily = {};
    forecastData.list.forEach(item => {
        const d = new Date(item.dt*1000).toLocaleDateString();
        if(!daily[d]) daily[d] = item;
    });
    const days = Object.values(daily).slice(0,5);
    
    els.forecastGrid.innerHTML = '';
    days.forEach(day => {
        const dt = new Date(day.dt*1000);
        const dayName = dt.toLocaleDateString('en-US', {weekday:'short'});
        els.forecastGrid.innerHTML += `
            <div class="forecast-card">
                <div class="f-date">${dayName}</div>
                <div class="f-icon">${getIcon(day.weather[0].icon)}</div>
                <div class="f-temps">
                    <span style="color:#FF9A9E">${Math.round(day.main.temp_max)}°</span>
                    <span style="color:#ccc">${Math.round(day.main.temp_min)}°</span>
                </div>
            </div>
        `;
    });

    els.weatherContent.classList.remove('hidden');
    setLoading(false);
}

function getIcon(code) {
    const map = {
        '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'🌤️',
        '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️',
        '09d':'🌧️', '09n':'🌧️', '10d':'🌦️', '10n':'🌧️',
        '11d':'⛈️', '11n':'⛈️', '13d':'❄️', '13n':'❄️',
        '50d':'🌫️', '50n':'🌫️'
    };
    return map[code] || '🌤️';
}

init();
