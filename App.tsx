// App.tsx
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MCI from '@expo/vector-icons/MaterialCommunityIcons'; // pour loadFont() en fallback
import 'katex/dist/katex.min.css';
import './src/global-icons.css'; // <= aucune URL dedans

import HomeScreen      from './src/screens/HomeScreen';
import ChapterScreen   from './src/screens/ChapterScreen';
import LearningScreen  from './src/screens/LearningScreen';
import MyDemosScreen   from './src/screens/MyDemosScreen';
import StatsScreen     from './src/screens/StatsScreen';
import SettingsScreen  from './src/screens/SettingsScreen';
import CustomizeScreen from './src/screens/CustomizeScreen';

import { useSettings } from './src/store/useSettings';

const Stack = createNativeStackNavigator();
function CoursStack() {
  const theme = useSettings(s => s.themeColor);
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerTintColor: theme,
        headerBackTitleVisible: false
      }}
    >
      <Stack.Screen name="Home"     component={HomeScreen}     options={{ title: 'Cours' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Paramètres' }} />
      <Stack.Screen name="Stats"    component={StatsScreen}    options={{ title: 'Statistiques' }} />
      <Stack.Screen
        name="Chapter"
        component={ChapterScreen}
        options={({ route }) => ({
          title: (route.params as any).chapter.title
        })}
      />
      <Stack.Screen name="Learning" component={LearningScreen} options={{ title: 'Apprentissage' }} />
    </Stack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  const theme = useSettings(s => s.themeColor);

  // Charge explicitement la police en web, sans passer par la CSS (pas d'URL absolue en CSS)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // 1) Charge via l’API FontFace depuis /fonts/... (servi par public/)
    (async () => {
      try {
        const face = new FontFace(
          'MaterialCommunityIcons',
          "url(/fonts/MaterialCommunityIcons.ttf) format('truetype')",
          { style: 'normal', weight: '400', display: 'swap' }
        );
        await face.load();
        document.fonts.add(face);
      } catch (e) {
        // ignore, on a le fallback ci-dessous
      }
    })();

    // 2) Fallback: enregistre la fonte via expo (au cas où)
    try { (MCI as any)?.loadFont?.(); } catch (_) {}
  }, []);

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Cours"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme,
          tabBarIcon: ({ color, size }) => {
            switch (route.name) {
              case 'Cours':            return <MaterialCommunityIcons name="book-open-page-variant" size={size} color={color} />;
              case 'Mes démos':        return <MaterialCommunityIcons name="book" size={size} color={color} />;
              case 'Stats':            return <MaterialCommunityIcons name="chart-bar" size={size} color={color} />;
              case 'Personnalisation': return <MaterialCommunityIcons name="tune" size={size} color={color} />;
              case 'Paramètres':       return <MaterialCommunityIcons name="cog" size={size} color={color} />;
              default: return null;
            }
          }
        })}
      >
        <Tab.Screen name="Cours"            component={CoursStack}    />
        <Tab.Screen name="Mes démos"        component={MyDemosScreen} />
        <Tab.Screen name="Stats"            component={StatsScreen}   />
        <Tab.Screen name="Personnalisation" component={CustomizeScreen}/>
        <Tab.Screen name="Paramètres"       component={SettingsScreen}/>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
