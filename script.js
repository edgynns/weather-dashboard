// API configuration
const API_KEY = '28a2773556576a4e8c0cf77c1fe1e73f'; // Replace with your actual API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const currentWeatherEl = document.getElementById('current-weather');
const forecastCardsEl = document.getElementById('forecast-cards');
const popularCitiesEl = document.getElementById('popular-cities-list');
const locationsListEl = document.getElementById('locations-list');
const celsiusBtn = document.getElementById('celsius');
const fahrenheitBtn = document.getElementById('fahrenheit');
const loader = document.getElementById('loader');

// State variables
let currentUnit = 'metric'; // Default to Celsius
let savedLocations = JSON.parse(localStorage.getItem('savedLocations')) || [];

// Popular cities in Kenya
const popularCities = [
    'Nairobi',
    'Mombasa',
    'Kisumu',
    'Nakuru',
    'Eldoret',
    'Thika',
    'Malindi',
    'Kitale'
];

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    renderPopularCities();
    renderSavedLocations();
    
    // Start with Nairobi if no saved locations
    if (savedLocations.length > 0) {
        getWeatherData(savedLocations[0]);
    } else {
        getWeatherData('Nairobi');
    }
});

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
        cityInput.value = '';
    }
});

popularCitiesEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('city-button')) {
        getWeatherData(e.target.dataset.city);
    }
});

locationsListEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('location-pill')) {
        getWeatherData(e.target.dataset.city);
    } else if (e.target.classList.contains('fa-times')) {
        removeLocation(e.target.parentElement.dataset.city);
    }
});

celsiusBtn.addEventListener('click', () => {
    if (currentUnit !== 'metric') {
        currentUnit = 'metric';
        updateUnitButtons();
        
        // Refresh current city data
        const currentCity = currentWeatherEl.dataset.city;
        if (currentCity) {
            getWeatherData(currentCity);
        }
    }
});

fahrenheitBtn.addEventListener('click', () => {
    if (currentUnit !== 'imperial') {
        currentUnit = 'imperial';
        updateUnitButtons();
        
        // Refresh current city data
        const currentCity = currentWeatherEl.dataset.city;
        if (currentCity) {
            getWeatherData(currentCity);
        }
    }
});

// Functions
function renderPopularCities() {
    popularCitiesEl.innerHTML = popularCities.map(city => 
        `<button class="city-button" data-city="${city}">${city}</button>`
    ).join('');
}

function renderSavedLocations() {
    if (savedLocations.length === 0) {
        locationsListEl.innerHTML = '<p>No saved locations yet</p>';
        return;
    }
    
    locationsListEl.innerHTML = savedLocations.map(city => 
        `<div class="location-pill" data-city="${city}">
            ${city}
            <i class="fas fa-times"></i>
        </div>`
    ).join('');
}

async function getWeatherData(city) {
    showLoader();
    
    try {
        // Get current weather
        const weatherResponse = await fetch(`${BASE_URL}/weather?q=${city}&units=${currentUnit}&appid=${API_KEY}`);
        
        if (!weatherResponse.ok) {
            throw new Error('City not found');
        }
        
        const weatherData = await weatherResponse.json();
        
        // Get forecast data using coordinates from weather data
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&units=${currentUnit}&appid=${API_KEY}`
        );
        
        if (!forecastResponse.ok) {
            throw new Error('Forecast data not available');
        }
        
        const forecastData = await forecastResponse.json();
        
        // Render data
        renderCurrentWeather(weatherData);
        renderForecast(forecastData);
        
        // Save city
        saveLocation(city);
        
    } catch (error) {
        currentWeatherEl.innerHTML = `
            <div class="error">
                <p>${error.message || 'Error fetching weather data'}</p>
                <p>Please check the city name and try again</p>
            </div>
        `;
        forecastCardsEl.innerHTML = '';
        console.error('Error:', error);
    } finally {
        hideLoader();
    }
}

function renderCurrentWeather(data) {
    // Store current city for refreshing
    currentWeatherEl.dataset.city = data.name;
    
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';
    const windUnit = currentUnit === 'metric' ? 'm/s' : 'mph';
    
    currentWeatherEl.innerHTML = `
        <h2>${data.name}, ${data.sys.country}</h2>
        <div class="date">${new Date().toLocaleDateString()}</div>
        <img class="weather-icon" src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="${data.weather[0].description}">
        <div class="temperature">${temp}${unitSymbol}</div>
        <div class="description">${data.weather[0].description}</div>
        <div class="weather-details">
            <div class="detail">
                <i class="fas fa-thermometer-half"></i>
                <span>Feels like: ${feelsLike}${unitSymbol}</span>
            </div>
            <div class="detail">
                <i class="fas fa-tint"></i>
                <span>Humidity: ${data.main.humidity}%</span>
            </div>
            <div class="detail">
                <i class="fas fa-wind"></i>
                <span>Wind: ${data.wind.speed} ${windUnit}</span>
            </div>
        </div>
        <button id="save-button" class="${savedLocations.includes(data.name) ? 'saved' : ''}">
            <i class="fas fa-star"></i> ${savedLocations.includes(data.name) ? 'Saved' : 'Save Location'}
        </button>
    `;
    
    // Add event listener to save button
    document.getElementById('save-button').addEventListener('click', () => {
        toggleSaveLocation(data.name);
    });
}

function renderForecast(data) {
    // Process forecast data (API returns 3-hour intervals)
    const dailyForecasts = processForecastData(data.list);
    
    const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';
    
    forecastCardsEl.innerHTML = dailyForecasts.map(day => `
        <div class="forecast-card">
            <div class="forecast-date">${day.date}</div>
            <img src="https://openweathermap.org/img/wn/${day.icon}.png" alt="${day.description}">
            <div class="forecast-temp">${day.temp}${unitSymbol}</div>
            <div class="forecast-description">${day.description}</div>
        </div>
    `).join('');
}

function processForecastData(forecastList) {
    const dailyData = {};
    
    // Group by day
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        // Skip today
        if (date.getDate() === new Date().getDate()) {
            return;
        }
        
        if (!dailyData[day]) {
            dailyData[day] = {
                temps: [],
                icons: [],
                descriptions: []
            };
        }
        
        dailyData[day].temps.push(item.main.temp);
        dailyData[day].icons.push(item.weather[0].icon);
        dailyData[day].descriptions.push(item.weather[0].description);
    });
    
    // Convert to array and limit to 5 days
    return Object.keys(dailyData).slice(0, 5).map(day => {
        const dayData = dailyData[day];
        
        // Get most common icon and description
        const iconCounts = {};
        dayData.icons.forEach(icon => {
            iconCounts[icon] = (iconCounts[icon] || 0) + 1;
        });
        
        const descCounts = {};
        dayData.descriptions.forEach(desc => {
            descCounts[desc] = (descCounts[desc] || 0) + 1;
        });
        
        const mostCommonIcon = Object.keys(iconCounts).reduce((a, b) => 
            iconCounts[a] > iconCounts[b] ? a : b, Object.keys(iconCounts)[0]);
            
        const mostCommonDesc = Object.keys(descCounts).reduce((a, b) => 
            descCounts[a] > descCounts[b] ? a : b, Object.keys(descCounts)[0]);
        
        return {
            date: day,
            temp: Math.round(dayData.temps.reduce((sum, t) => sum + t, 0) / dayData.temps.length),
            icon: mostCommonIcon,
            description: mostCommonDesc
        };
    });
}

function saveLocation(city) {
    if (!savedLocations.includes(city)) {
        savedLocations.push(city);
        localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
        renderSavedLocations();
    }
}

function toggleSaveLocation(city) {
    const index = savedLocations.indexOf(city);
    
    if (index === -1) {
        // Add to saved locations
        savedLocations.push(city);
        document.getElementById('save-button').innerHTML = '<i class="fas fa-star"></i> Saved';
        document.getElementById('save-button').classList.add('saved');
    } else {
        // Remove from saved locations
        savedLocations.splice(index, 1);
        document.getElementById('save-button').innerHTML = '<i class="fas fa-star"></i> Save Location';
        document.getElementById('save-button').classList.remove('saved');
    }
    
    localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
    renderSavedLocations();
}

function removeLocation(city) {
    const index = savedLocations.indexOf(city);
    if (index !== -1) {
        savedLocations.splice(index, 1);
        localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
        renderSavedLocations();
    }
}

function updateUnitButtons() {
    if (currentUnit === 'metric') {
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
    } else {
        celsiusBtn.classList.remove('active');
        fahrenheitBtn.classList.add('active');
    }
}

function showLoader() {
    loader.classList.remove('hidden');
}

function hideLoader() {
    loader.classList.add('hidden');
}
