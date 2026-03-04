import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import RunTrackerScreen from './src/screens/RunTrackerScreen';
import RoutinesScreen from './src/screens/RoutinesScreen';
import RunHistoryScreen from './src/screens/RunHistoryScreen';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.card,
            },
            headerTintColor: colors.foreground,
            contentStyle: {
              backgroundColor: colors.background,
            }
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RunTracker"
            component={RunTrackerScreen as any}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Routines"
            component={RoutinesScreen as any}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RunHistory"
            component={RunHistoryScreen as any}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
