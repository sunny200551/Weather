class WeatherApp {
    constructor() {
        this.apiKey = 'fec1fd2f1a07427db4c115905251307'; // Your WeatherAPI key
        this.baseUrl = 'https://api.weatherapi.com/v1';
        this.currentWeather = null;
        this.currentUnit = 'C';
        this.particles = [];
        this.currentTheme = 'auto'; // auto, light, dark
        
        this.initializeElements();
        this.bindEvents();
        this.initializeTheme();
        this.initializeSearch();
        this.init();
    }

    initializeElements() {
        this.elements = {
            cityName: document.getElementById('cityName'),
            country: document.getElementById('country'),
            temperature: document.getElementById('temperature'),
            feelsLike: document.getElementById('feelsLike'),
            description: document.getElementById('description'),
            weatherIcon: document.getElementById('weatherIcon'),
            windSpeed: document.getElementById('windSpeed'),
            humidity: document.getElementById('humidity'),
            visibility: document.getElementById('visibility'),
            pressure: document.getElementById('pressure'),
            sunrise: document.getElementById('sunrise'),
            sunset: document.getElementById('sunset'),
            uvIndex: document.getElementById('uvIndex'),
            uvFill: document.getElementById('uvFill'),
            uvLevel: document.getElementById('uvLevel'),
            airQuality: document.getElementById('airQuality'),
            airIndicator: document.getElementById('airIndicator'),
            refreshBtn: document.getElementById('refreshBtn'),
            retryBtn: document.getElementById('retryBtn'),
            celsiusBtn: document.getElementById('celsiusBtn'),
            fahrenheitBtn: document.getElementById('fahrenheitBtn'),
            themeToggle: document.getElementById('themeToggle'),
            themeIcon: document.getElementById('themeIcon'),
            searchBtn: document.getElementById('searchBtn'),
            searchModal: document.getElementById('searchModal'),
            closeSearchBtn: document.getElementById('closeSearchBtn'),
            locationInput: document.getElementById('locationInput'),
            searchSubmitBtn: document.getElementById('searchSubmitBtn'),
            searchSuggestions: document.getElementById('searchSuggestions'),
            useCurrentLocationBtn: document.getElementById('useCurrentLocationBtn'),
            loadingSpinner: document.getElementById('loadingSpinner'),
            errorMessage: document.getElementById('errorMessage'),
            weatherCard: document.getElementById('weatherCard'),
            particlesContainer: document.getElementById('particles')
        };
    }

    bindEvents() {
        this.elements.refreshBtn.addEventListener('click', () => this.refreshWeather());
        this.elements.retryBtn.addEventListener('click', () => this.init());
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        this.elements.celsiusBtn.addEventListener('click', () => this.switchUnit('C'));
        this.elements.fahrenheitBtn.addEventListener('click', () => this.switchUnit('F'));
        
        // Search modal events
        this.elements.searchBtn.addEventListener('click', () => this.openSearchModal());
        this.elements.closeSearchBtn.addEventListener('click', () => this.closeSearchModal());
        this.elements.searchSubmitBtn.addEventListener('click', () => this.searchLocation());
        this.elements.locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchLocation();
            }
        });
        this.elements.locationInput.addEventListener('input', () => this.handleSearchInput());
        this.elements.useCurrentLocationBtn.addEventListener('click', () => this.useCurrentLocation());
        
        // Close modal when clicking outside
        this.elements.searchModal.addEventListener('click', (e) => {
            if (e.target === this.elements.searchModal) {
                this.closeSearchModal();
            }
        });
    }
    
    initializeSearch() {
        // Add event listeners for quick location buttons
        const quickLocationBtns = document.querySelectorAll('.quick-location-btn');
        quickLocationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const location = btn.getAttribute('data-location');
                this.searchLocationByName(location);
                this.closeSearchModal();
            });
        });
    }

    initializeTheme() {
        // Get saved theme from localStorage or default to auto
        const savedTheme = localStorage.getItem('weatherAppTheme') || 'auto';
        this.currentTheme = savedTheme;
        this.applyTheme();
    }

    toggleTheme() {
        // Cycle through themes: auto -> light -> dark -> auto
        switch (this.currentTheme) {
            case 'auto':
                this.currentTheme = 'light';
                break;
            case 'light':
                this.currentTheme = 'dark';
                break;
            case 'dark':
                this.currentTheme = 'auto';
                break;
        }
        
        this.applyTheme();
        localStorage.setItem('weatherAppTheme', this.currentTheme);
    }

    applyTheme() {
        const body = document.body;
        const themeIcon = this.elements.themeIcon;
        
        // Remove existing theme classes
        body.removeAttribute('data-theme');
        
        switch (this.currentTheme) {
            case 'light':
                body.setAttribute('data-theme', 'light');
                themeIcon.className = 'fas fa-moon theme-icon';
                break;
            case 'dark':
                body.setAttribute('data-theme', 'dark');
                themeIcon.className = 'fas fa-sun theme-icon';
                break;
            case 'auto':
            default:
                // Auto theme based on weather conditions
                themeIcon.className = 'fas fa-adjust theme-icon';
                this.applyWeatherBasedTheme();
                break;
        }
    }

    applyWeatherBasedTheme() {
        if (!this.currentWeather) return;
        
        const { current } = this.currentWeather;
        const temperature = current.temp_c;
        const condition = current.condition.text.toLowerCase();
        const currentHour = new Date().getHours();
        const isNight = currentHour < 6 || currentHour > 18;
        
        // Apply theme based on conditions and time
        if (isNight) {
            document.body.setAttribute('data-theme', 'dark');
        } else if (temperature > 25 && (condition.includes('sunny') || condition.includes('clear'))) {
            document.body.setAttribute('data-theme', 'light');
        } else if (temperature < 10 || condition.includes('snow') || condition.includes('storm')) {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
    }

    async init() {
        this.showLoading();
        try {
            await this.getCurrentLocation();
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError();
        }
    }

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                console.log('Geolocation not supported, using default location');
                this.getWeatherData(40.7128, -74.0060); // Default to NYC
                resolve();
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    await this.getWeatherData(latitude, longitude);
                    resolve();
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    // Fallback to NYC
                    this.getWeatherData(40.7128, -74.0060);
                    resolve();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                }
            );
        });
    }

    async getWeatherData(lat, lon) {
        try {
            const response = await fetch(
                `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${lat},${lon}&days=1&aqi=yes&alerts=yes`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            await this.processWeatherData(data);
        } catch (error) {
            console.error('Error fetching weather:', error);
            this.showError();
        }
    }

    async processWeatherData(data) {
        this.currentWeather = data;
        this.updateUI(data);
        this.updateTheme(data);
        this.updateParticles(data.current.condition.text.toLowerCase());
        
        // Apply theme if in auto mode
        if (this.currentTheme === 'auto') {
            this.applyWeatherBasedTheme();
        }
        
        this.hideLoading();
    }

    updateUI(data) {
        const { location, current, forecast } = data;
        
        // Location info
        this.elements.cityName.textContent = location.name;
        this.elements.country.textContent = `${location.region}, ${location.country}`;
        
        // Temperature
        this.updateTemperatureDisplay();
        
        // Weather condition
        this.elements.description.textContent = current.condition.text;
        this.elements.weatherIcon.src = current.condition.icon.startsWith('http') 
            ? current.condition.icon 
            : `https:${current.condition.icon}`;
        this.elements.weatherIcon.alt = current.condition.text;
        
        // Weather details
        this.elements.windSpeed.textContent = `${current.wind_kph} km/h`;
        this.elements.humidity.textContent = `${current.humidity}%`;
        this.elements.visibility.textContent = `${current.vis_km} km`;
        this.elements.pressure.textContent = `${current.pressure_mb} hPa`;
        
        // Sun times
        this.elements.sunrise.textContent = forecast.forecastday[0].astro.sunrise;
        this.elements.sunset.textContent = forecast.forecastday[0].astro.sunset;
        
        // UV Index
        this.updateUVIndex(current.uv);
        
        // Air Quality (using AQI data if available)
        this.updateAirQuality(data.current.air_quality || null);
    }

    updateTemperatureDisplay() {
        if (!this.currentWeather) return;
        
        const { current } = this.currentWeather;
        const temp = this.currentUnit === 'C' ? current.temp_c : current.temp_f;
        const feelsLike = this.currentUnit === 'C' ? current.feelslike_c : current.feelslike_f;
        
        this.elements.temperature.textContent = `${Math.round(temp)}°`;
        this.elements.feelsLike.textContent = `${Math.round(feelsLike)}°`;
    }

    updateUVIndex(uv) {
        this.elements.uvIndex.textContent = uv;
        
        // Update UV bar
        const percentage = Math.min(uv * 10, 100);
        this.elements.uvFill.style.width = `${percentage}%`;
        
        // Update UV level text
        let level = 'Low';
        if (uv > 10) level = 'Extreme';
        else if (uv > 7) level = 'Very High';
        else if (uv > 5) level = 'High';
        else if (uv > 2) level = 'Moderate';
        
        this.elements.uvLevel.textContent = level;
    }

    updateAirQuality(airQuality) {
        if (airQuality && airQuality.co) {
            // Use real air quality data
            const co = airQuality.co;
            let quality = 'Good';
            let color = '#4ade80';
            
            if (co > 15) {
                quality = 'Hazardous';
                color = '#dc2626';
            } else if (co > 12) {
                quality = 'Very Unhealthy';
                color = '#7c2d12';
            } else if (co > 9) {
                quality = 'Unhealthy';
                color = '#ea580c';
            } else if (co > 6) {
                quality = 'Moderate';
                color = '#facc15';
            } else if (co > 4) {
                quality = 'Fair';
                color = '#84cc16';
            }
            
            this.elements.airQuality.textContent = quality;
            this.elements.airIndicator.style.backgroundColor = color;
        } else {
            // Fallback to mock data
            const qualities = ['Good', 'Fair', 'Moderate'];
            const colors = ['#4ade80', '#facc15', '#f97316'];
            
            const randomIndex = Math.floor(Math.random() * qualities.length);
            this.elements.airQuality.textContent = qualities[randomIndex];
            this.elements.airIndicator.style.backgroundColor = colors[randomIndex];
        }
    }

    switchUnit(unit) {
        this.currentUnit = unit;
        
        // Update button states
        this.elements.celsiusBtn.classList.toggle('active', unit === 'C');
        this.elements.fahrenheitBtn.classList.toggle('active', unit === 'F');
        
        // Update temperature display
        this.updateTemperatureDisplay();
    }

    updateTheme(data) {
        const { current } = data;
        const temperature = current.temp_c;
        const condition = current.condition.text.toLowerCase();
        
        // Remove existing weather theme classes
        document.body.classList.remove('theme-sunny', 'theme-hot', 'theme-cold', 'theme-rainy', 'theme-snowy', 'theme-stormy', 'theme-cloudy');
        
        // Apply weather-based background theme
        if (temperature > 30) {
            document.body.classList.add('theme-hot');
        } else if (temperature < 5) {
            document.body.classList.add('theme-cold');
        } else if (condition.includes('rain') || condition.includes('drizzle')) {
            document.body.classList.add('theme-rainy');
        } else if (condition.includes('snow') || condition.includes('blizzard')) {
            document.body.classList.add('theme-snowy');
        } else if (condition.includes('storm') || condition.includes('thunder')) {
            document.body.classList.add('theme-stormy');
        } else if (condition.includes('cloud') || condition.includes('overcast')) {
            document.body.classList.add('theme-cloudy');
        } else if (condition.includes('clear') || condition.includes('sunny')) {
            document.body.classList.add('theme-sunny');
        } else {
            document.body.classList.add('theme-cloudy');
        }
    }

    updateParticles(condition) {
        this.clearParticles();
        
        if (condition.includes('rain') || condition.includes('drizzle')) {
            this.createRainParticles();
        } else if (condition.includes('snow')) {
            this.createSnowParticles();
        } else if (condition.includes('storm') || condition.includes('thunder')) {
            this.createStormEffects();
        }
    }

    createRainParticles() {
        const createRain = () => {
            for (let i = 0; i < 3; i++) {
                const drop = document.createElement('div');
                drop.className = 'particle rain-drop';
                drop.style.left = Math.random() * 100 + '%';
                drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
                drop.style.animationDelay = Math.random() * 1 + 's';
                this.elements.particlesContainer.appendChild(drop);
                
                setTimeout(() => {
                    if (drop.parentNode) {
                        drop.parentNode.removeChild(drop);
                    }
                }, 2000);
            }
        };
        
        this.particleInterval = setInterval(createRain, 100);
        createRain();
    }

    createSnowParticles() {
        const createSnow = () => {
            for (let i = 0; i < 2; i++) {
                const flake = document.createElement('div');
                flake.className = 'particle snow-flake';
                flake.style.left = Math.random() * 100 + '%';
                flake.style.animationDuration = (Math.random() * 2 + 2) + 's';
                flake.style.animationDelay = Math.random() * 2 + 's';
                this.elements.particlesContainer.appendChild(flake);
                
                setTimeout(() => {
                    if (flake.parentNode) {
                        flake.parentNode.removeChild(flake);
                    }
                }, 5000);
            }
        };
        
        this.particleInterval = setInterval(createSnow, 200);
        createSnow();
    }

    createStormEffects() {
        this.createRainParticles();
        
        // Add lightning effect
        const lightning = () => {
            const originalBg = document.body.style.background;
            document.body.style.background = 'rgba(255, 255, 255, 0.9)';
            setTimeout(() => {
                document.body.style.background = originalBg;
            }, 100);
        };
        
        this.lightningInterval = setInterval(() => {
            if (Math.random() > 0.8) {
                lightning();
            }
        }, 3000);
    }

    clearParticles() {
        this.elements.particlesContainer.innerHTML = '';
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
        }
        if (this.lightningInterval) {
            clearInterval(this.lightningInterval);
        }
    }

    showLoading() {
        this.elements.loadingSpinner.classList.add('show');
        this.elements.errorMessage.classList.remove('show');
        this.elements.weatherCard.style.display = 'none';
    }

    hideLoading() {
        this.elements.loadingSpinner.classList.remove('show');
        this.elements.weatherCard.style.display = 'block';
    }

    showError() {
        this.elements.loadingSpinner.classList.remove('show');
        this.elements.errorMessage.classList.add('show');
        this.elements.weatherCard.style.display = 'none';
    }

    refreshWeather() {
        this.elements.refreshBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            this.elements.refreshBtn.style.transform = '';
        }, 600);
        
        this.init();
    }
    
    openSearchModal() {
        this.elements.searchModal.classList.add('show');
        this.elements.locationInput.focus();
    }
    
    closeSearchModal() {
        this.elements.searchModal.classList.remove('show');
        this.elements.locationInput.value = '';
        this.elements.searchSuggestions.innerHTML = '';
    }
    
    async handleSearchInput() {
        const query = this.elements.locationInput.value.trim();
        
        if (query.length < 3) {
            this.elements.searchSuggestions.innerHTML = '';
            return;
        }
        
        try {
            const response = await fetch(
                `${this.baseUrl}/search.json?key=${this.apiKey}&q=${encodeURIComponent(query)}`
            );
            
            if (response.ok) {
                const suggestions = await response.json();
                this.displaySuggestions(suggestions);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    }
    
    displaySuggestions(suggestions) {
        this.elements.searchSuggestions.innerHTML = '';
        
        if (suggestions.length === 0) {
            this.elements.searchSuggestions.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 20px;">No locations found</p>';
            return;
        }
        
        suggestions.slice(0, 5).forEach(suggestion => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'suggestion-item';
            suggestionElement.innerHTML = `
                <div class="suggestion-name">${suggestion.name}</div>
                <div class="suggestion-details">${suggestion.region}, ${suggestion.country}</div>
            `;
            
            suggestionElement.addEventListener('click', () => {
                this.searchLocationByName(`${suggestion.name}, ${suggestion.country}`);
                this.closeSearchModal();
            });
            
            this.elements.searchSuggestions.appendChild(suggestionElement);
        });
    }
    
    async searchLocation() {
        const query = this.elements.locationInput.value.trim();
        
        if (!query) {
            alert('Please enter a location name');
            return;
        }
        
        await this.searchLocationByName(query);
        this.closeSearchModal();
    }
    
    async searchLocationByName(locationName) {
        this.showLoading();
        
        try {
            const response = await fetch(
                `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(locationName)}&days=1&aqi=yes&alerts=yes`
            );
            
            if (!response.ok) {
                throw new Error(`Location not found: ${locationName}`);
            }
            
            const data = await response.json();
            await this.processWeatherData(data);
        } catch (error) {
            console.error('Error fetching weather for location:', error);
            alert(`Could not find weather data for "${locationName}". Please try a different location.`);
            this.hideLoading();
        }
    }
    
    async useCurrentLocation() {
        this.closeSearchModal();
        this.showLoading();
        
        try {
            await this.getCurrentLocation();
        } catch (error) {
            console.error('Error getting current location:', error);
            this.showError();
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});