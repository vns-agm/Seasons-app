import React, { useState, useEffect, useRef } from "react";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './SeasonDisplay.css';
import { Container, Row, Col } from 'react-bootstrap';


const containerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 0,
  lng: 0,
};

function SeasonDisplay() {
  const getSeason = (lat, month) => {
    if (month > 2 && month < 9) {
      return lat > 0 ? 'summer' : 'winter';
    } else {
      return lat > 0 ? 'winter' : 'summer';
    }
  };

  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [places, setPlaces] = useState([]);
  const [greeting, setGreeting] = useState("");
  const [keyword, setKeyword] = useState();
  const [searchInitiated, setSearchInitiated] = useState(false);
  const mapRef = useRef(null);

  const handleKeywordChange = (e) => {
    setKeyword(e.target.value);
  };

  console.log(places, "020202");

  const fetchPlaces = async (lat, lon, keyword) => {
    try {
      const searchParams = new URLSearchParams({
        query: keyword,
        ll: `${lat},${lon}`,
        open_now: "true",
        sort: "DISTANCE",
      });

      const results = await fetch(
        `https://api.foursquare.com/v3/places/search?${searchParams}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: process.env.REACT_APP_PLACES_API_KEY,
          },
        }
      );

      if (!results.ok) {
        throw new Error("Places data not found.");
      }

      const data = await results.json();

      const placesWithDistance = data.results.map(place => {
        const distance = calculateDistance(lat, lon, place.geocodes.main.latitude, place.geocodes.main.longitude);
        return { ...place, distance };
      });

      setPlaces(placesWithDistance);
    } catch (error) {
      setError("Error fetching places: " + error.message);
    }
  };
  const handleSearch = () => {
    if (keyword.trim() === "") {
      setPlaces([]);
      setSearchInitiated(false);
    } else {
      fetchPlaces(location.latitude, location.longitude, keyword);
      setSearchInitiated(true);
    }
  };


  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      setGreeting("Good morning!");
    } else if (currentHour < 18) {
      setGreeting("Good afternoon!");
    } else {
      setGreeting("Good evening!");
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
              fetchWeather(position.coords.latitude, position.coords.longitude);
              fetchPlaces(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
              setError("Error getting geolocation: " + error.message);
            }
          );
        } else {
          setError("Geolocation is not supported by this browser.");
        }
      } catch (error) {
        setError("Error fetching data: " + error.message);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (location.latitude && location.longitude) {
      if (!mapRef.current) {
        const mapInstance = L.map('map').setView([location.latitude, location.longitude], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
        L.marker([location.latitude, location.longitude]).addTo(mapInstance);
        mapRef.current = mapInstance;
      } else {
        mapRef.current.setView([location.latitude, location.longitude], 13);
        L.marker([location.latitude, location.longitude]).addTo(mapRef.current);
      }
    }
  }, [location.latitude, location.longitude]);

  const fetchWeather = async (lat, lon) => {
    try {
      const apiKey = process.env.REACT_APP_WEATHER_API_KEY;
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`
      );
      if (!response.ok) {
        throw new Error("Weather data not found.");
      }
      const data = await response.json();
      setWeather(data);
    } catch (error) {
      setError("Error fetching weather: " + error.message);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const earthRadius = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;
    return distance.toFixed(1);
  };

  const kelvinToCelsius = (tempKelvin) => {
    return (tempKelvin - 273.15).toFixed(1);
  };

  const mpsToKph = (windSpeedMps) => {
    return (windSpeedMps * 3.6).toFixed(1);
  };

  return (
    <>
      <div className="season-display-container">
        <div className="map-container">
          <div id="map" className="leaflet-map"></div>
        </div>
        <div className={`weather-details-container ${getSeason(location.latitude, new Date().getMonth() + 1)}`}>
          {error ? (
            <p className="error">{error}</p>
          ) : (
            <div className="content">
              <div style={{marginTop:"20px"}} className="weather-details">
                <h2 className="weather-title">{greeting} <br />
                  Here's the detail of Weather around you.
                  Have a great day!</h2>
                {weather && (
                  <div>
                    <p className="weather-description">
                      <b>Weather</b>: {weather.weather[0].description}
                    </p>
                    <p className="weather-temperature">
                      <b>Temperature</b>: {kelvinToCelsius(weather.main.temp)} °C
                    </p>
                    <p className="weather-temperature">
                      <b>Humidity</b>: {weather.main.humidity}
                    </p>
                    <p className="weather-temperature">
                      <b>Wind Speed</b>: {mpsToKph(weather.wind.speed)} km/h
                    </p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: "20px" }} className="weather-details">
                <h2 className="weather-title">
                  What are you seeking? Let <a href="https://agam-portfolio.web.app/" target="_blank" rel="noopener noreferrer">Agam Srivastava</a> assist you in discovering the finest locales around you tailored to your plans.
                </h2>
                <div className="search-container">
                  <input
                    type="text"
                    value={keyword}
                    onChange={handleKeywordChange}
                    placeholder="What's in your mind ? example - Temple, Cafe, Mall, Metro, Stadium, etc.... ;)"
                    className="keyword-input"
                  />
                  <button onClick={handleSearch} className="search-button">
                    Search
                  </button>
                  <button onClick={() => {
                    setPlaces([])
                    setKeyword('')
                    setSearchInitiated(false)
                  }} className="search-button">
                    Clear Search
                  </button>
                </div>
                {places.length > 0 ? (
                  <div>
                    <h2 className="places-title"> Showing {keyword} around you</h2>
                    <div className="places-container">
                      <ul className="places-list">
                        {places.map((place) => (
                          <li key={place.fsq_id} className="place-item">
                            <div>
                              <p><b>{place.name}</b> ({place.distance}Km)</p>
                              <b>Address : {place.location.address}</b>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : searchInitiated && places.length === 0 ? `No search result for ${keyword}, Try something else` : null}
              </div>
            </div>
          )}
        </div>
      </div>
      <footer className="footer text-center">
        Designed and developed by <a href="https://agam-portfolio.web.app/" target="_blank" rel="noopener noreferrer">Agam Srivastava</a>
      </footer>
    </>
  );
}

export default SeasonDisplay;
