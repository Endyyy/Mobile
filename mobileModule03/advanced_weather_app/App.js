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
  StatusBar,
  ImageBackground,
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
  const [searchError, setSearchError] = useState(null);
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
    // Do not clear errors or previous data here:
    // messages must stay until a successful search / connection.
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
      setSearchError(null);
      setWeatherError(null);
    } catch (error) {
      setWeather(null);
      setHourlyWeather([]);
      setDailyWeather([]);
      setWeatherError('Connection issue while fetching weather. Please try again.');
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
      // Keep existing error message visible until a valid search succeeds.
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

        if (!data.results || data.results.length === 0) {
          setSuggestions([]);
          setSearchError(`No city found for "${query}".`);
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
        setSearchError(null);
      } catch (error) {
        if (!cancelled) {
          setSuggestions([]);
          setSearchError(
            'Connection issue while searching this city. Please check your network.'
          );
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

  const getWeatherIconProps = (code) => {
    if (code === null || code === undefined) {
      return { name: 'help-circle-outline', color: '#ffffff' };
    }
    if (code === 0) return { name: 'sunny-outline', color: '#FFEB3B' };
    if ([1, 2, 3].includes(code)) return { name: 'partly-sunny-outline', color: '#FFEB3B' };
    if ([45, 48].includes(code)) return { name: 'cloud-outline', color: '#B0BEC5' };
    if ([51, 53, 55, 56, 57].includes(code)) return { name: 'rainy-outline', color: '#4FC3F7' };
    if ([61, 63, 65].includes(code)) return { name: 'rainy-outline', color: '#29B6F6' };
    if ([66, 67].includes(code)) return { name: 'snow-outline', color: '#ECEFF1' };
    if ([71, 73, 75, 77].includes(code)) return { name: 'snow-outline', color: '#FFFFFF' };
    if ([80, 81, 82].includes(code)) return { name: 'thunderstorm-outline', color: '#FFA726' };
    if ([85, 86].includes(code)) return { name: 'snow-outline', color: '#FFFFFF' };
    if ([95, 96, 99].includes(code)) return { name: 'thunderstorm-outline', color: '#FF7043' };
    return { name: 'cloud-outline', color: '#CFD8DC' };
  };

  const renderCurrentTab = () => {
    if (searchError) {
      return (
        <Text style={[styles.displayText, styles.centerErrorText]}>
          {searchError}
        </Text>
      );
    }

    if (!weather && !(useGeolocation && location)) {
      return <Text style={styles.displayText}>Search a city or enable geolocation.</Text>;
    }

    const locationLabel = getLocationLabel();
    const description = weather ? getWeatherDescription(weather.weatherCode) : '';
    const iconProps = weather ? getWeatherIconProps(weather.weatherCode) : null;

    if (!weather) {
      return (
        <Text style={styles.displayText}>
          Latitude: {location.latitude.toFixed(4)}, Longitude: {location.longitude.toFixed(4)}
        </Text>
      );
    }

    const place = weather?.place || null;

    return (
      <View style={styles.currentContainer}>
        {place ? (
          <>
            <Text style={styles.currentLocationCity}>{place.name}</Text>
            <Text style={styles.currentLocationRegion}>
              {[place.admin1, place.country].filter(Boolean).join(', ')}
            </Text>
          </>
        ) : locationLabel ? (
          <Text style={styles.currentLocationCity}>{locationLabel}</Text>
        ) : null}

        <View style={styles.currentMainColumn}>
          <View style={styles.currentTempBlock}>
            <Text style={styles.currentTempValue}>
              {Math.round(weather.temperature)}°
            </Text>
            <Text style={styles.currentTempUnit}>C</Text>
          </View>

          <Text style={styles.currentDescriptionText}>{description}</Text>

          {iconProps && (
            <Ionicons
              name={iconProps.name}
              size={isTablet ? 80 : 64}
              color={iconProps.color}
              style={styles.currentIcon}
            />
          )}
        </View>

        <View style={styles.currentMetaRow}>
          <Ionicons
            name="leaf-outline"
            size={isTablet ? 20 : 18}
            color="#ECEFF1"
            style={styles.currentMetaIcon}
          />
          <Text style={styles.currentMetaValue}>
            {Math.round(weather.windSpeed)} km/h
          </Text>
        </View>
      </View>
    );
  };

  const renderTodayTab = () => {
    if (searchError) {
      return (
        <Text style={[styles.displayText, styles.centerErrorText]}>
          {searchError}
        </Text>
      );
    }

    if (!weather || hourlyWeather.length === 0) {
      return <Text style={styles.displayText}>No hourly data yet. Search a city first.</Text>;
    }

    const locationLabel = getLocationLabel();
    const currentDate = weather ? new Date(weather.time) : null;
    const todayHours = currentDate
      ? hourlyWeather.filter((item) => {
          const d = new Date(item.time);
          return (
            d.getFullYear() === currentDate.getFullYear() &&
            d.getMonth() === currentDate.getMonth() &&
            d.getDate() === currentDate.getDate()
          );
        })
      : hourlyWeather.slice(0, 24);
    const validTemps = todayHours
      .map((item) => item.temperature)
      .filter((t) => typeof t === 'number' && !Number.isNaN(t));
    const chartHeight = isTablet ? 140 : 110;
    const yAxisWidth = 30;
    const chartColWidth = Math.floor((width - 24 - yAxisWidth) / 24);
    const dataMin = validTemps.length ? Math.min(...validTemps) : 0;
    const dataMax = validTemps.length ? Math.max(...validTemps) : 0;
    const axisMin = Math.min(0, dataMin);
    const axisMax = Math.max(axisMin + 1, dataMax);
    const tempRange = Math.max(1, axisMax - axisMin);

    return (
      <View style={styles.listContainer}>
        {locationLabel ? (
          <Text style={styles.todayLocationText}>{locationLabel}</Text>
        ) : null}

        {todayHours.length > 0 && (
          <View style={styles.todayChartContainer}>
            <View style={[styles.todayChartYAxis, { width: yAxisWidth, height: chartHeight }]}>
              {[1, 0.75, 0.5, 0.25, 0].map((ratio) => {
                const labelVal = Math.round(axisMin + ratio * tempRange);
                const topPos = chartHeight - ratio * chartHeight;
                return (
                  <Text
                    key={ratio}
                    style={[
                      styles.todayChartAxisLabel,
                      { position: 'absolute', top: topPos - 7, right: 4 },
                    ]}
                    numberOfLines={1}
                  >
                    {labelVal}°
                  </Text>
                );
              })}
            </View>
            <View style={styles.todayChartContent}>
              <View style={styles.todayChartRow}>
                {Array.from({ length: 24 }).map((_, hour) => {
                  const entry = todayHours.find(
                    (h) => new Date(h.time).getHours() === hour
                  );
                  const temp = entry?.temperature;
                  const hasTemp = typeof temp === 'number' && !Number.isNaN(temp);
                  const normalized = hasTemp ? (temp - axisMin) / tempRange : null;
                  const yOffset = normalized !== null ? chartHeight - normalized * chartHeight : null;
                  return (
                    <View key={hour} style={[styles.todayChartColumn, { width: chartColWidth }]}>
                      <View style={[styles.todayChartPointWrapper, { height: chartHeight, width: chartColWidth }]}>
                        {yOffset !== null && (
                          <View style={[styles.todayChartPoint, { marginTop: yOffset }]} />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              <View style={styles.todayChartBaseline} />
              <View style={[styles.todayChartTimeAxis, { width: chartColWidth * 24 }]}>
                {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => (
                  <Text
                    key={hour}
                    style={[
                      styles.todayChartTimeLabel,
                      { position: 'absolute', left: hour * chartColWidth - 6 },
                    ]}
                  >
                    {hour}h
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        <ScrollView style={styles.innerScroll} showsVerticalScrollIndicator={true}>
          {todayHours.map((item, index) => {
            // Show only today (first 24 hours)
            const timeLabel = new Date(item.time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const desc = getWeatherDescription(item.weatherCode);
            const iconProps = getWeatherIconProps(item.weatherCode);
            return (
              <View key={item.time} style={styles.listRow}>
                <Text style={styles.listTime}>{timeLabel}</Text>
                <View style={styles.listValueRow}>
                  {iconProps && (
                    <Ionicons
                      name={iconProps.name}
                      size={isTablet ? 22 : 20}
                      color={iconProps.color}
                      style={styles.listValueIcon}
                    />
                  )}
                  <Text style={styles.listValue}>
                    {Math.round(item.temperature)}°C, {desc || 'N/A'}
                  </Text>
                </View>
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
    if (searchError) {
      return (
        <Text style={[styles.displayText, styles.centerErrorText]}>
          {searchError}
        </Text>
      );
    }

    if (!weather || dailyWeather.length === 0) {
      return <Text style={styles.displayText}>No daily data yet. Search a city first.</Text>;
    }

    const locationLabel = getLocationLabel();
    const days = dailyWeather.slice(0, 7);
    const chartHeight = isTablet ? 130 : 100;
    const weekColWidth = Math.floor((width - 24) / days.length);

    const allMax = days.map((d) => d.tempMax).filter((t) => typeof t === 'number');
    const allMin = days.map((d) => d.tempMin).filter((t) => typeof t === 'number');
    const axisMax = allMax.length ? Math.max(...allMax) : 0;
    const axisMin = Math.min(0, allMin.length ? Math.min(...allMin) : 0);
    const tempRange = Math.max(1, axisMax - axisMin);

    const getY = (val) => chartHeight - ((val - axisMin) / tempRange) * chartHeight;

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <View style={styles.listContainer}>
        {locationLabel ? (
          <Text style={styles.todayLocationText}>{locationLabel}</Text>
        ) : null}

        {/* Chart */}
        <View style={styles.weeklyChartContainer}>
          {/* Y axis */}
          <View style={[styles.todayChartYAxis, { width: 30, height: chartHeight }]}>
            {[1, 0.5, 0].map((ratio) => {
              const val = Math.round(axisMin + ratio * tempRange);
              const topPos = chartHeight - ratio * chartHeight;
              return (
                <Text
                  key={ratio}
                  style={[styles.todayChartAxisLabel, { position: 'absolute', top: topPos - 7, right: 4 }]}
                >
                  {val}°
                </Text>
              );
            })}
          </View>

          {/* Chart area */}
          <View style={{ flex: 1 }}>
            <View style={[styles.weeklyChartArea, { height: chartHeight }]}>
              {days.map((item, index) => {
                const xCenter = index * weekColWidth + weekColWidth / 2;
                const yMax = typeof item.tempMax === 'number' ? getY(item.tempMax) : null;
                const yMin = typeof item.tempMin === 'number' ? getY(item.tempMin) : null;
                return (
                  <View key={item.date} style={StyleSheet.absoluteFillObject}>
                    {yMax !== null && (
                      <View style={[styles.weeklyDot, styles.weeklyDotMax, { left: xCenter - 5, top: yMax - 5 }]} />
                    )}
                    {yMin !== null && (
                      <View style={[styles.weeklyDot, styles.weeklyDotMin, { left: xCenter - 5, top: yMin - 5 }]} />
                    )}
                    {yMax !== null && yMin !== null && (
                      <View style={[styles.weeklyBar, {
                        left: xCenter - 1.5,
                        top: yMax,
                        height: yMin - yMax,
                      }]} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Baseline */}
            <View style={styles.todayChartBaseline} />

            {/* Day labels below baseline */}
            <View style={[styles.todayChartTimeAxis, { width: weekColWidth * days.length }]}>
              {days.map((item, index) => {
                const d = new Date(item.date);
                const label = dayLabels[d.getDay()];
                return (
                  <Text
                    key={item.date}
                    style={[styles.todayChartTimeLabel, {
                      position: 'absolute',
                      left: index * weekColWidth + weekColWidth / 2 - 12,
                    }]}
                  >
                    {label}
                  </Text>
                );
              })}
            </View>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.weeklyLegendRow}>
          <View style={styles.weeklyLegendItem}>
            <View style={[styles.weeklyLegendDot, { backgroundColor: '#FF7043' }]} />
            <Text style={styles.weeklyLegendText}>Max</Text>
          </View>
          <View style={styles.weeklyLegendItem}>
            <View style={[styles.weeklyLegendDot, { backgroundColor: '#4FC3F7' }]} />
            <Text style={styles.weeklyLegendText}>Min</Text>
          </View>
        </View>

        {/* Horizontal scrollable day cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weeklyCardsScroll}
          contentContainerStyle={styles.weeklyCardsContent}
          onTouchStart={() => scrollViewRef.current?.setNativeProps({ scrollEnabled: false })}
          onTouchEnd={() => scrollViewRef.current?.setNativeProps({ scrollEnabled: true })}
          onTouchCancel={() => scrollViewRef.current?.setNativeProps({ scrollEnabled: true })}
          onMomentumScrollEnd={() => scrollViewRef.current?.setNativeProps({ scrollEnabled: true })}
        >
          {days.map((item) => {
            const d = new Date(item.date);
            const dayName = dayLabels[d.getDay()];
            const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
            const desc = getWeatherDescription(item.weatherCode);
            const iconProps = getWeatherIconProps(item.weatherCode);
            return (
              <View key={item.date} style={styles.weeklyCard}>
                <Text style={styles.weeklyCardDay}>{dayName}</Text>
                <Text style={styles.weeklyCardDate}>{dateStr}</Text>
                {iconProps && (
                  <Ionicons
                    name={iconProps.name}
                    size={isTablet ? 40 : 34}
                    color={iconProps.color}
                    style={styles.weeklyCardIcon}
                  />
                )}
                <Text style={styles.weeklyCardDesc} numberOfLines={2}>{desc || 'N/A'}</Text>
                <View style={styles.weeklyCardTemps}>
                  <Text style={styles.weeklyTempMax}>{Math.round(item.tempMax)}°</Text>
                  <Text style={styles.weeklyCardTempSep}>/</Text>
                  <Text style={styles.weeklyTempMin}>{Math.round(item.tempMin)}°</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <ExpoStatusBar style="light" backgroundColor="#2196F3" />
      <ImageBackground
        source={require('./assets/weather-background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
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
                    color={activeTab === index ? '#4FC3F7' : '#666'} 
                  />
                  <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
                    {tab.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;
const isTablet = width >= 600;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  container: {
    flex: 1,
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
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  tabContentText: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: '600',
    color: '#4FC3F7',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  displayText: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '400',
    color: '#666',
    marginTop: 10,
  },
  currentContainer: {
    marginTop: height * 0.08,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  currentLocationCity: {
    fontSize: isTablet ? 22 : 20,
    fontWeight: '600',
    color: '#4FC3F7',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  currentLocationRegion: {
    fontSize: isTablet ? 16 : 14,
    color: '#ECEFF1',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  currentMainColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  currentTempBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 12,
  },
  currentTempValue: {
    fontSize: isTablet ? 76 : 60,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: isTablet ? 68 : 56,
  },
  currentTempUnit: {
    fontSize: isTablet ? 30 : 24,
    fontWeight: '500',
    color: '#ECEFF1',
    marginTop: isTablet ? 10 : 8,
    marginLeft: 4,
  },
  currentIconBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentIcon: {
    marginBottom: 4,
  },
  currentDescriptionText: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '500',
    color: '#ECEFF1',
    textTransform: 'capitalize',
    textAlign: 'center',
    marginTop: 4,
  },
  currentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  currentMetaItem: {
    minWidth: 130,
    alignItems: 'flex-start',
  },
  currentMetaIcon: {
    marginBottom: 2,
  },
  currentMetaLabel: {
    fontSize: isTablet ? 13 : 11,
    color: '#CFD8DC',
    marginBottom: 2,
  },
  currentMetaValue: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  centerErrorText: {
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 16,
  },
  listContainer: {
    marginTop: 12,
    width: '100%',
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  todayLocationText: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#4FC3F7',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  todayChartContainer: {
    marginTop: 6,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  todayChartScroll: {
    paddingHorizontal: 6,
  },
  todayChartYAxis: {
    marginRight: 2,
    position: 'relative',
  },
  todayChartAxisLabel: {
    fontSize: isTablet ? 14 : 12,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  todayChartYAxisLine: {
    display: 'none',
  },
  todayChartContent: {
    flex: 1,
  },
  todayChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  todayChartColumn: {
    alignItems: 'center',
  },
  todayChartPointWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  todayChartPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFB300',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  todayChartBaseline: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    marginHorizontal: 6,
  },
  todayChartTempLabel: {
    marginTop: 6,
    fontSize: isTablet ? 15 : 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  todayChartTimeAxis: {
    position: 'relative',
    height: 18,
    marginTop: 4,
  },
  todayChartTimeLabel: {
    fontSize: isTablet ? 12 : 11,
    fontWeight: '500',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  listHeader: {
    marginBottom: 8,
  },
  weeklyChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    marginBottom: 4,
  },
  weeklyChartArea: {
    width: '100%',
    position: 'relative',
  },
  weeklyDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  weeklyDotMax: {
    backgroundColor: '#FF7043',
  },
  weeklyDotMin: {
    backgroundColor: '#4FC3F7',
  },
  weeklyBar: {
    position: 'absolute',
    width: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  weeklyLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 8,
  },
  weeklyLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weeklyLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  weeklyLegendText: {
    fontSize: isTablet ? 13 : 11,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  weeklyCardsScroll: {
    flex: 1,
    marginTop: 4,
  },
  weeklyCardsContent: {
    paddingHorizontal: 4,
    paddingBottom: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  weeklyCard: {
    width: isTablet ? 155 : 130,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 30, 60, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyCardDay: {
    fontSize: isTablet ? 17 : 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  weeklyCardDate: {
    fontSize: isTablet ? 13 : 12,
    color: '#B0BEC5',
    marginBottom: 10,
    marginTop: 2,
  },
  weeklyCardIcon: {
    marginBottom: 8,
  },
  weeklyCardDesc: {
    fontSize: isTablet ? 13 : 12,
    color: '#ECEFF1',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 17,
  },
  weeklyCardTemps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weeklyCardTempSep: {
    fontSize: isTablet ? 14 : 13,
    color: '#CFD8DC',
  },
  weeklyTempBlock: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  weeklyTempMax: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '700',
    color: '#FF7043',
  },
  weeklyTempMin: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#4FC3F7',
  },
  innerScroll: {
    paddingTop: 4,
    backgroundColor: 'transparent',
    flexGrow: 1,
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
  listValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  listValueIcon: {
    marginRight: 6,
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
    paddingBottom: Platform.OS === 'ios' ? 10 : 10,
    marginBottom: 0,
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

