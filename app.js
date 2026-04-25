async function getWeatherData(cityName) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        showError(""); 
        console.log("Searching for the city:", cityName);
        
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${cityName}`, { signal: controller.signal });
        const geoData = await geoRes.json();

        if (!geoData.results) {
            showError("Can't find this city");
            return;
        }

        const { latitude, longitude, name } = geoData.results[0];


        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`, { signal: controller.signal });
        const weatherData = await weatherRes.json();

        console.log("Obtained the weather data:", weatherData);


        updateUI(name, weatherData);
        clearTimeout(timeoutId);


        fetchLocalTime(latitude, longitude);

    } catch (err) {
        console.error("Go wrong:", err);
        showError(err.name === 'AbortError' ? "request timeout" : "Network connection failed.");
    }
}


function updateUI(cityName, data) {
    try {
        const current = data.current_weather;
        const code = weatherLookup[current.weathercode] || weatherLookup.default;


        $("#cityName").text(cityName).removeClass("skeleton");
        $("#temp").text(current.temperature).removeClass("skeleton");
        $("#desc").text(`${code.emoji} ${code.desc}`).removeClass("skeleton");
        

        if (data.hourly && data.hourly.relativehumidity_2m) {
            $("#humidity").text(data.hourly.relativehumidity_2m[0]).removeClass("skeleton");
        } else {
            $("#humidity").text("--").removeClass("skeleton");
        }

        $(".forecast-card").removeClass("skeleton").html("Loaded");
        console.log("UI update successfully");
    } catch (e) {
        console.error("UI Update failed. Please check if the ID in the HTML is correct.", e);
    }
}