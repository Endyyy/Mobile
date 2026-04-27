import React, { useState, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [useGeolocation, setUseGeolocation] = useState(false);
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
  };

  const handleGeolocation = () => {
    setUseGeolocation(true);
    setSearchText('');
  };

  const getDisplayText = () => {
    if (useGeolocation) {
      return 'Geolocation';
    }
    return searchText || '';
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

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.contentScrollView}
      >
        {tabs.map((tab, index) => {
          const displayText = getDisplayText();
          return (
            <View key={index} style={styles.tabContent}>
              <Text style={styles.tabContentText}>{tab.name}</Text>
              {displayText ? (
                <Text style={styles.displayText}>{displayText}</Text>
              ) : null}
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

