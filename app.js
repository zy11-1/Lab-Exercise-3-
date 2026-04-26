const weatherLookup = {
    0: { desc: "Clear", emoji: "☀️" },
    1: { desc: "Mainly clear", emoji: "🌤️" },
    2: { desc: "Partly cloudy", emoji: "⛅" },
    3: { desc: "Overcast", emoji: "☁️" },
    45: { desc: "Fog", emoji: "🌫️" },
    51: { desc: "Drizzle", emoji: "🌦️" },
    61: { desc: "Rain", emoji: "🌧️" },
    71: { desc: "Snow", emoji: "🌨️" },
    95: { desc: "Thunderstorm", emoji: "⛈️" }
};


function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}


function showLoading() {
    $("#cityName, #temp, #desc, #humidity, #windSpeed, #localTime").addClass("skeleton");
    $("#errorBanner").hide();
}


function showError(msg) {
    $("#errorBanner").text(msg).show();
}


async function fetchWeatherData(city) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时控制

    try {
        showLoading();


        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}`;
        const geoRes = await fetch(geoUrl, { signal: controller.signal });
        if (!geoRes.ok) throw new Error(`HTTP Error: ${geoRes.status}`);
        
        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) throw new Error("City not found");
        
        const { latitude, longitude, name, timezone } = geoData.results[0];


        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
        const weatherRes = await fetch(weatherUrl, { signal: controller.signal });
        if (!weatherRes.ok) throw new Error(`HTTP Error: ${weatherRes.status}`);
        
        const weatherData = await weatherRes.json();


        updateWeatherUI(name, weatherData);

        fetchLocalTime(timezone);

        clearTimeout(timeoutId);

    } catch (error) {
        if (error.name === 'AbortError') {
            showError("Request timed out after 10 seconds. Please try again.");
        } else {
            showError(error.message);
        }
    }
}

function fetchLocalTime(timezoneStr) {
    const timeUrl = `https://worldtimeapi.org/api/timezone/${timezoneStr}`;

    $.getJSON(timeUrl)
        .done(function (data) {
            const time = data.datetime.substring(11, 16);
            $("#localTime").text(time).removeClass("skeleton");
        })
        .fail(function () {
            const fallbackTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            $("#localTime").text(fallbackTime).removeClass("skeleton");
        })
        .always(function () {
            console.log("Time API request completed at: " + new Date().toISOString());
        });
}


function updateWeatherUI(cityName, data) {
    const current = data.current_weather;
    const codeInfo = weatherLookup[current.weathercode] || { desc: "Unknown", emoji: "🌈" };

    $("#cityName").text(cityName).removeClass("skeleton");
    $("#temp").text(`${current.temperature} °C`).removeClass("skeleton");
    $("#desc").text(`${codeInfo.emoji} ${codeInfo.desc}`).removeClass("skeleton");
    $("#humidity").text(`${data.hourly.relativehumidity_2m[0]}%`).removeClass("skeleton");
    $("#windSpeed").text(`${current.windspeed} km/h`).removeClass("skeleton");

    const forecastContainer = $("#forecast");
    forecastContainer.empty();

    for (let i = 0; i < 7; i++) {
        const date = new Date(data.daily.time[i]);
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
        const max = data.daily.temperature_2m_max[i];
        const min = data.daily.temperature_2m_min[i];
        const dayCode = weatherLookup[data.daily.weathercode[i]] || { emoji: "🌈" };

        forecastContainer.append(`
            <div class="forecast-card">
                <div><strong>${dayStr}</strong></div>
                <div style="font-size: 24px; margin: 5px 0;">${dayCode.emoji}</div>
                <div style="font-size: 14px;">${max}° / ${min}°</div>
            </div>
        `);
    }
}

const handleSearch = debounce(function () {
    const city = $("#cityInput").val().trim();
    if (city.length >= 2) {
        fetchWeatherData(city);
    }
}, 500);

$("#cityInput").on("input", handleSearch);
$("#searchBtn").on("click", function() {
    const city = $("#cityInput").val().trim();
    if (city.length >= 2) {
        fetchWeatherData(city);
    } else {
        showError("Please enter at least 2 characters.");
    }
});


$(document).ready(function() {

    for(let i=0; i<7; i++) {
        $("#forecast").append(`<div class="forecast-card skeleton" style="height: 80px; width: 60px;"></div>`);
    }
    
    fetchWeatherData("Johor");
});