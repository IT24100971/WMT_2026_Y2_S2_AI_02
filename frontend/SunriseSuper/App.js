import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';

// Temporary placeholder screens for each module
// Each student will replace these with their full implementation
const PlaceholderScreen = ({ title }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ff6b00', marginBottom: 20 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', paddingHorizontal: 40 }}>
        This module is under development.
      </Text>
      <Text style={{ fontSize: 14, color: '#999', marginTop: 20 }}>
        Student implementation coming soon!
      </Text>
    </View>
  );
};

// Import View and Text for placeholder
import { View, Text } from 'react-native';

// Student 1 - Product Management
function ProductsScreen() {
  return <PlaceholderScreen title="📦 Product Management" />;
}

// Student 2 - Inventory Management
function InventoryScreen() {
  return <PlaceholderScreen title="📊 Inventory Management" />;
}

// Student 3 - Supplier Management
function SuppliersScreen() {
  return <PlaceholderScreen title="🏢 Supplier Management" />;
}

// Student 4 - Shift Management
function ShiftsScreen() {
  return <PlaceholderScreen title="⏰ Shift Management" />;
}

// Student 5 - Complaint Management
function ComplaintsScreen() {
  return <PlaceholderScreen title="⚠️ Complaint Management" />;
}

// Student 6 - GRN Management
function GRNScreen() {
  return <PlaceholderScreen title="📄 GRN Management" />;
}

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerStyle: { backgroundColor: '#ff6b00' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Sunrise Super' }} />
      <Stack.Screen name="Products" component={ProductsScreen} options={{ title: 'Product Management' }} />
      <Stack.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventory Management' }} />
      <Stack.Screen name="Suppliers" component={SuppliersScreen} options={{ title: 'Supplier Management' }} />
      <Stack.Screen name="Shifts" component={ShiftsScreen} options={{ title: 'Shift Management' }} />
      <Stack.Screen name="Complaints" component={ComplaintsScreen} options={{ title: 'Complaint Management' }} />
      <Stack.Screen name="GRN" component={GRNScreen} options={{ title: 'GRN Management' }} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { user } = useAuth();
  return user ? <AppStack /> : <AuthStack />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}