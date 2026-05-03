// App.js
// Main navigation file. Controls which screens are shown.
// Changes from original: replaced ProductsScreen placeholder with real screens,
// and added AddProduct + EditProduct to the AppStack navigator.

import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Auth screens (already built by group)
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';

// ── YOUR SCREENS (Student 1 — Products) ──────────────────
import ProductListScreen from './src/screens/products/ProductListScreen';
import AddProductScreen from './src/screens/products/AddProductScreen';
import EditProductScreen from './src/screens/products/EditProductScreen';
// ─────────────────────────────────────────────────────────

// ── YOUR SCREENS (Student 2— Inventory)──────────
import InventoryListScreen from './src/screens/inventory/InventoryListScreen';
import AddInventoryScreen  from './src/screens/inventory/AddInventoryScreen';
import EditStockScreen     from './src/screens/inventory/EditStockScreen';
// ── SUPPLIER MANAGEMENT SCREENS (Student 3) ──────────
import SupplierListScreen from './src/screens/suppliers/SupplierListScreen';
import AddSupplierScreen from './src/screens/suppliers/AddSupplierScreen';
import EditSupplierScreen from './src/screens/suppliers/EditSupplierScreen';
import ViewSupplierScreen from './src/screens/suppliers/ViewSupplierScreen';

// ── YOUR SCREENS (Student 3 — Shifts) ────────────────────
import ShiftListScreen from './src/screens/shifts/ShiftListScreen';
import AddShiftScreen from './src/screens/shifts/AddShiftScreen';
import EditShiftScreen from './src/screens/shifts/EditShiftScreen';
// Placeholder for other students' modules (they will replace these)
const PlaceholderScreen = ({ title }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ff6b00', marginBottom: 20 }}>{title}</Text>
    <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', paddingHorizontal: 40 }}>
      This module is under development.
    </Text>
    <Text style={{ fontSize: 14, color: '#999', marginTop: 20 }}>Student implementation coming soon!</Text>
  </View>
);

function ComplaintsScreen() { return <PlaceholderScreen title="⚠️ Complaint Management" />; }
function GRNScreen() { return <PlaceholderScreen title="📄 GRN Management" />; }

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
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {/* Home */}
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Sunrise Super' }} />

      {/* ── YOUR SCREENS ─────────────────────────────────── */}
      <Stack.Screen
        name="Products"
        component={ProductListScreen}
        options={{ title: 'Product Management' }}
      />
      <Stack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ title: 'Add New Product' }}
      />
      <Stack.Screen
        name="EditProduct"
        component={EditProductScreen}
        options={{ title: 'Edit Product' }}
      />
      {/* ─────────────────────────────────────────────────── */}

      {/* Other students' screens (placeholders for now) */}
      <Stack.Screen
        name="Inventory"
        component={InventoryListScreen}
        options={{
          title: 'Inventory Management',
          headerStyle: { backgroundColor: '#F97316' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="AddInventory"
        component={AddInventoryScreen}
        options={{
          title: 'Add Inventory Record',
          headerStyle: { backgroundColor: '#F97316' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="EditStock"
        component={EditStockScreen}
        options={{
          title: 'Edit Stock',
          headerStyle: { backgroundColor: '#F97316' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen 
        name="Suppliers" 
        component={SupplierListScreen} 
        options={{ 
          title: 'Supplier Management',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }} 
      />
      <Stack.Screen 
        name="AddSupplier" 
        component={AddSupplierScreen} 
        options={{ 
          title: 'Add New Supplier',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }} 
      />
      <Stack.Screen 
        name="ViewSupplier" 
        component={ViewSupplierScreen} 
        options={{ 
          title: 'Supplier Details',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }} 
      />
      <Stack.Screen 
        name="EditSupplier" 
        component={EditSupplierScreen} 
        options={{ 
          title: 'Edit Supplier',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }} 
      />
      <Stack.Screen
        name="Shifts"
        component={ShiftListScreen}
        options={{
          title: '⏰ Shift Management',
          headerStyle: { backgroundColor: '#6A1B9A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="AddShift"
        component={AddShiftScreen}
        options={{
          title: 'Create New Shift',
          headerStyle: { backgroundColor: '#6A1B9A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Stack.Screen
        name="EditShift"
        component={EditShiftScreen}
        options={{
          title: 'Edit Shift',
          headerStyle: { backgroundColor: '#6A1B9A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
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