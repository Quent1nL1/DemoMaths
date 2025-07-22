// App.tsx (à la racine de DemoMaths/)
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import ChapterScreen from './src/screens/ChapterScreen';
import LearningScreen from './src/screens/LearningScreen';
import MyDemosScreen from './src/screens/MyDemosScreen';
import StatsScreen from './src/screens/StatsScreen';

const Stack = createNativeStackNavigator();
function CoursStack() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Cours' }}
      />
      <Stack.Screen
        name="Chapter"
        component={ChapterScreen}
        options={({ route }) => ({
          title: (route.params as any).chapter.title
        })}
      />
      <Stack.Screen
        name="Learning"
        component={LearningScreen}
        options={{ title: 'Apprentissage' }}
      />
    </Stack.Navigator>
  );
}

const Tab = createBottomTabNavigator();
export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Cours"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#007aff',
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Cours') return <MaterialCommunityIcons name="book-open-page-variant" size={size} color={color} />;
            if (route.name === 'Mes démos') return <MaterialCommunityIcons name="book" size={size} color={color} />;
            if (route.name === 'Stats') return <MaterialCommunityIcons name="chart-bar" size={size} color={color} />;
            return null;
          }
        })}
      >
        <Tab.Screen name="Cours"     component={CoursStack}   />
        <Tab.Screen name="Mes démos" component={MyDemosScreen} />
        <Tab.Screen name="Stats"     component={StatsScreen}   />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
