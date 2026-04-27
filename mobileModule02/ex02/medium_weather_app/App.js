import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Dimensions, 
  ScrollView,
  Platform,
  StatusBar
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [useGeolocation, setUseGeolocation] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [weather, setWeather] = useState(null);
  const [hourlyWeather, setHourlyWeather] = useState([]);
  const [dailyWeather, setDailyWeather] = useState([]);
  const [weatherError, setWeatherError] = useState(null);
  const scrollViewRef = useRef(null);

  const tabs = [
    { name: 'Currently', icon: 'time-outline' },
    { name: 'Today', icon: 'calendar-outline' },
    { name: 'Weekly', icon: 'calendar-clear-outline' }
  ];

  const handleTabPress = (index) => {
    setActiveTab(index);
    scrollViewRef.current?.scrollTo({ x: index * Dimensions.get('window').width, animated: true });
  };

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const screenWidth = Dimensions.get('window').width;
    const currentIndex = Math.round(scrollPosition / screenWidth);
    setActiveTab(currentIndex);
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    setUseGeolocation(false);
    setLocation(null);
    setLocationError(null);
    setWeather(null);
    setHourlyWeather([]);
    setDailyWeather([]);
    setWeatherError(null);
  };

  const requestLocationAsync = async () => {
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUseGeolocation(false);
        setLocation(null);
        setLocationError('Location permission denied. You can still search by city name.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setUseGeolocation(true);
      setSearchText('');
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      setSuggestions([]);
      await fetchWeatherByCoords(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );
    } catch (error) {
      setUseGeolocation(false);
      setLocation(null);
      setLocationError('Unable to get location. You can still search by city name.');
      setWeather(null);
      setWeatherError('Unable to get weather from your location.');
    }
  };

  useEffect(() => {
    requestLocationAsync();
  }, []);

  const handleGeolocation = () => {
    requestLocationAsync();
  };

  const fetchWeatherByCoords = async (latitude, longitude, placeInfo) => {
    try {
      setWeatherError(null);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&wind_speed_unit=kmh`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.current) {
        throw new Error('No current weather data');
      }

      const place = placeInfo || null;

      setWeather({
        temperature: data.current.temperature_2m,
        windSpeed: data.current.wind_speed_10m,
        weatherCode: data.current.weather_code,
        time: data.current.time,
        place,
      });

      if (data.hourly && Array.isArray(data.hourly.time)) {
        const hourly = data.hourly.time.map((time, index) => ({
          time,
          temperature: data.hourly.temperature_2m?.[index],
          weatherCode: data.hourly.weather_code?.[index],
          windSpeed: data.hourly.wind_speed_10m?.[index],
        }));
        setHourlyWeather(hourly);
      } else {
        setHourlyWeather([]);
      }

      if (data.daily && Array.isArray(data.daily.time)) {
        const daily = data.daily.time.map((date, index) => ({
          date,
          tempMax: data.daily.temperature_2m_max?.[index],
          tempMin: data.daily.temperature_2m_min?.[index],
          weatherCode: data.daily.weather_code?.[index],
        }));
        setDailyWeather(daily);
      } else {
        setDailyWeather([]);
      }
    } catch (error) {
      setWeather(null);
      setHourlyWeather([]);
      setDailyWeather([]);
      setWeatherError('Unable to fetch weather for this location.');
    }
  };

  const handleCitySelect = (suggestion) => {
    setUseGeolocation(false);
    setLocation(null);
    setSearchText(suggestion.name);
    setSuggestions([]);
    fetchWeatherByCoords(suggestion.latitude, suggestion.longitude, suggestion);
  };

  useEffect(() => {
    const query = searchText.trim();

    if (!query || query.length < 2 || useGeolocation) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setIsLoadingSuggestions(true);

    const timeoutId = setTimeout(async () => {
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=6&language=en&format=json`;
        const response = await fetch(url);
        const data = await response.json();

        if (cancelled) return;

        if (!data.results) {
          setSuggestions([]);
          return;
        }

        setSuggestions(
          data.results.map((item) => ({
            id: `${item.id}-${item.latitude}-${item.longitude}`,
            name: item.name,
            country: item.country,
            admin1: item.admin1,
            latitude: item.latitude,
            longitude: item.longitude,
          }))
        );
      } catch (error) {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [searchText, useGeolocation]);

  const handleSearchSubmit = () => {
    if (suggestions.length > 0) {
      handleCitySelect(suggestions[0]);
    }
  };

  const getLocationLabel = () => {
    if (weather?.place) {
      return `${weather.place.name}${
        weather.place.admin1 ? ', ' + weather.place.admin1 : ''
      }, ${weather.place.country}`;
    }
    if (location) {
      return `Lat: ${location.latitude.toFixed(2)}, Lon: ${location.longitude.toFixed(2)}`;
    }
    return '';
  };

  const getWeatherDescription = (code) => {
    if (code === null || code === undefined) return '';
    // Simplified mapping for Open-Meteo weather codes
    if (code === 0) return 'Clear sky';
    if ([1, 2, 3].includes(code)) return 'Partly cloudy';
    if ([45, 48].includes(code)) return 'Foggy';
    if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
    if ([61, 63, 65].includes(code)) return 'Rain';
    if ([66, 67].includes(code)) return 'Freezing rain';
    if ([71, 73, 75, 77].includes(code)) return 'Snow';
    if ([80, 81, 82].includes(code)) return 'Rain showers';
    if ([85, 86].includes(code)) return 'Snow showers';
    if ([95].includes(code)) return 'Thunderstorm';
    if ([96, 99].includes(code)) return 'Thunderstorm with hail';
    return 'Unknown';
  };

  const renderCurrentTab = () => {
    if (!weather && !(useGeolocation && location)) {
      return <Text style={styles.displayText}>Search a city or enable geolocation.</Text>;
    }

    const locationLabel = getLocationLabel();
    const description = weather ? getWeatherDescription(weather.weatherCode) : '';

    return (
      <View>
        {locationLabel ? (
          <Text style={styles.displayText}>Location: {locationLabel}</Text>
        ) : null}
        {weather ? (
          <>
            <Text style={styles.displayText}>
              Temperature: {Math.round(weather.temperature)}°C
            </Text>
            <Text style={styles.displayText}>Weather: {description}</Text>
            <Text style={styles.displayText}>
              Wind: {Math.round(weather.windSpeed)} km/h
            </Text>
          </>
        ) : (
          <Text style={styles.displayText}>
            Latitude: {location.latitude.toFixed(4)}, Longitude:{' '}
            {location.longitude.toFixed(4)}
          </Text>
        )}
      </View>
    );
  };

  const renderTodayTab = () => {
    if (!weather || hourlyWeather.length === 0) {
      return <Text style={styles.displayText}>No hourly data yet. Search a city first.</Text>;
    }

    const locationLabel = getLocationLabel();

    return (
      <View style={styles.listContainer}>
        {locationLabel ? (
          <Text style={[styles.displayText, styles.listHeader]}>
            Location: {locationLabel}
          </Text>
        ) : null}
        <ScrollView style={styles.innerScroll} showsVerticalScrollIndicator={true}>
          {hourlyWeather.map((item, index) => {
            // Show only today (first 24 hours)
            if (index >= 24) return null;
            const timeLabel = new Date(item.time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const desc = getWeatherDescription(item.weatherCode);
            return (
              <View key={item.time} style={styles.listRow}>
                <Text style={styles.listTime}>{timeLabel}</Text>
                <Text style={styles.listValue}>
                  {Math.round(item.temperature)}°C, {desc || 'N/A'}
                </Text>
                <Text style={styles.listValue}>
                  Wind: {Math.round(item.windSpeed)} km/h
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderWeeklyTab = () => {
    if (!weather || dailyWeather.length === 0) {
      return <Text style={styles.displayText}>No daily data yet. Search a city first.</Text>;
    }

    const locationLabel = getLocationLabel();

    return (
      <View style={styles.listContainer}>
        {locationLabel ? (
          <Text style={[styles.displayText, styles.listHeader]}>
            Location: {locationLabel}
          </Text>
        ) : null}
        <ScrollView style={styles.innerScroll} showsVerticalScrollIndicator={true}>
          {dailyWeather.map((item) => {
            const dateLabel = new Date(item.date).toLocaleDateString();
            const desc = getWeatherDescription(item.weatherCode);
            return (
              <View key={item.date} style={styles.listRow}>
                <Text style={styles.listTime}>{dateLabel}</Text>
                <Text style={styles.listValue}>
                  Min: {Math.round(item.tempMin)}°C, Max: {Math.round(item.tempMax)}°C
                </Text>
                <Text style={styles.listValue}>{desc || 'N/A'}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor="#2196F3" />
      
      <View style={styles.appBar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleSearchSubmit}
          />
        </View>

        <TouchableOpacity 
          style={styles.geolocationButton}
          onPress={handleGeolocation}
          activeOpacity={0.7}
        >
          <Ionicons name="location" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {(isLoadingSuggestions || suggestions.length > 0) && (
        <View style={styles.suggestionsOverlay} pointerEvents="box-none">
          <View style={styles.suggestionsContainer}>
            {isLoadingSuggestions ? (
              <Text style={styles.suggestionsLoadingText}>Searching cities...</Text>
            ) : (
              <ScrollView
                style={styles.suggestionsScroll}
                keyboardShouldPersistTaps="handled"
              >
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.suggestionItem}
                    onPress={() => handleCitySelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    <Text style={styles.suggestionDetails}>
                      {[item.admin1, item.country].filter(Boolean).join(', ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.contentScrollView}
      >
        {tabs.map((tab, index) => {
          return (
            <View key={index} style={styles.tabContent}>
              <Text style={styles.tabContentText}>{tab.name}</Text>
              {tab.name === 'Currently' && renderCurrentTab()}
              {tab.name === 'Today' && renderTodayTab()}
              {tab.name === 'Weekly' && renderWeeklyTab()}
              {locationError && (
                <Text style={styles.locationErrorText}>{locationError}</Text>
              )}
              {weatherError && (
                <Text style={styles.locationErrorText}>{weatherError}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bottomBar}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.tab, activeTab === index && styles.activeTab]}
            onPress={() => handleTabPress(index)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={tab.icon} 
              size={24} 
              color={activeTab === index ? '#2196F3' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;
const isTablet = width >= 600;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  appBar: {
    backgroundColor: '#2196F3',
    paddingTop: statusBarHeight + 10,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: isTablet ? 50 : 45,
  },
  suggestionsOverlay: {
    position: 'absolute',
    top: statusBarHeight + (isTablet ? 80 : 70),
    left: 16,
    right: 16,
    zIndex: 20,
    elevation: 20,
  },
  suggestionsContainer: {
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
  },
  suggestionsScroll: {
    maxHeight: 220,
  },
  suggestionsLoadingText: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: isTablet ? 16 : 14,
    color: '#666',
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionName: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#333',
  },
  suggestionDetails: {
    marginTop: 2,
    fontSize: isTablet ? 14 : 12,
    color: '#777',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: isTablet ? 18 : 16,
    color: '#333',
  },
  geolocationButton: {
    width: isTablet ? 50 : 45,
    height: isTablet ? 50 : 45,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  contentScrollView: {
    flex: 1,
  },
  tabContent: {
    width: width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  tabContentText: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  displayText: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '400',
    color: '#666',
    marginTop: 10,
  },
  listContainer: {
    marginTop: 12,
    width: '100%',
    maxHeight: height * 0.55,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  listHeader: {
    marginBottom: 8,
  },
  innerScroll: {
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  listRow: {
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  listTime: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  listValue: {
    fontSize: isTablet ? 14 : 12,
    color: '#555',
  },
  locationErrorText: {
    fontSize: isTablet ? 14 : 12,
    color: '#d32f2f',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 28,
    marginBottom: Platform.OS === 'android' ? 8 : 0,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    backgroundColor: '#f0f7ff',
  },
  tabText: {
    fontSize: isTablet ? 14 : 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
});

