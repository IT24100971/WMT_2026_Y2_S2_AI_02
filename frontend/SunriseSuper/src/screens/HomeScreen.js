import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  const modules = [
    { name: '📦 Product Management', screen: 'Products', color: '#ff6b00', student: 'Student 1' },
    { name: '📊 Inventory Management', screen: 'Inventory', color: '#2196F3', student: 'Student 2' },
    { name: '🏢 Supplier Management', screen: 'Suppliers', color: '#4CAF50', student: 'Student 3' },
    { name: '⏰ Shift Management', screen: 'Shifts', color: '#9C27B0', student: 'Student 4' },
    { name: '⚠️ Complaint Management', screen: 'Complaints', color: '#f44336', student: 'Student 5' },
    { name: '📄 GRN Management', screen: 'GRNList', color: '#795548', student: 'Student 6' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {user?.fullName}!</Text>
        <Text style={styles.role}>Role: {user?.role}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.modules}>
        <Text style={styles.sectionTitle}>System Modules</Text>
        <Text style={styles.sectionSubtitle}>Tap any module to open</Text>

        {modules.map((module, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.card, { borderLeftColor: module.color, borderLeftWidth: 5 }]}
            onPress={() => navigation.navigate(module.screen)}
          >
            <Text style={styles.cardTitle}>{module.name}</Text>
            {/* student credit removed */}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#ff6b00',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 30
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  role: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    opacity: 0.9
  },
  logoutButton: {
    position: 'absolute',
    right: 20,
    top: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  modules: {
    padding: 15
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333'
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
  },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  cardDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 5
  }
});