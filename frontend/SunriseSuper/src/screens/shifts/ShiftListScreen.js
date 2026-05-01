// ShiftListScreen.js
// Main screen for Shift Management. Shows all shifts with filtering.

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHIFT_TYPES = ['All', 'Morning', 'Evening', 'Night'];
const STATUS_FILTERS = ['All', 'Scheduled', 'Completed', 'Absent'];

export default function ShiftListScreen({ navigation }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedShiftType, setSelectedShiftType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [userRole, setUserRole] = useState('');
  const canManageShifts = userRole === 'Admin' || userRole === 'Supervisor';

  const fetchShifts = async () => {
    try {
      setLoading(true);
      setError('');
      const token = await AsyncStorage.getItem('token');
      const user = JSON.parse(await AsyncStorage.getItem('user'));
      setUserRole(user.role);
      
      const response = await axios.get(`${BASE_URL}/shifts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShifts(response.data);
    } catch (err) {
      setError('Failed to load shifts. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchShifts();
    }, [])
  );

  const handleDelete = (id, employeeName) => {
    Alert.alert(
      'Delete Shift',
      `Are you sure you want to delete shift for "${employeeName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              console.log('🗑️ Deleting shift:', id);
              
              const response = await axios.delete(`${BASE_URL}/shifts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              console.log('✅ Delete response:', response.data);
              
              // Update state immediately
              setShifts(prev => prev.filter(s => s._id !== id));
              Alert.alert('✅ Deleted', 'Shift has been deleted successfully.');
            } catch (err) {
              console.log('❌ Delete error:', err.response?.status, err.response?.data);
              const message = err.response?.data?.message || 'Failed to delete shift. Is the server running?';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const filteredShifts = shifts.filter(shift => {
    const matchesType = selectedShiftType === 'All' || shift.shiftType === selectedShiftType;
    const matchesStatus = selectedStatus === 'All' || shift.status === selectedStatus;
    const matchesSearch = searchText === '' || 
      shift.userId?.fullName?.toLowerCase().includes(searchText.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.employeeName}>{item.userId?.fullName || 'Unknown'}</Text>
          <View style={[styles.statusBadge, 
            item.status === 'Completed' && styles.statusCompleted,
            item.status === 'Absent' && styles.statusAbsent]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <Text style={styles.roleText}>Role: {item.userId?.role || 'N/A'}</Text>
        <Text style={styles.dateText}>📅 Date: {new Date(item.date).toLocaleDateString()}</Text>
        <Text style={styles.timeText}>⏰ {item.shiftType} | {item.startTime} - {item.endTime}</Text>
        {item.notes ? <Text style={styles.notesText}>📝 {item.notes}</Text> : null}
        <Text style={styles.memberStatusText}>Attendance Response: {item.employeeStatus || 'Pending'}</Text>
        {item.employeeStatusReason ? <Text style={styles.notesText}>Reason: {item.employeeStatusReason}</Text> : null}
        
        <View style={styles.cardActions}>
          {/* View Button */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.viewBtn]}
            onPress={() => navigation.navigate('EditShift', { shift: item })}
          >
            <Text style={styles.actionBtnText}>👁️ View</Text>
          </TouchableOpacity>
          
          {/* Edit / Respond Button */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => navigation.navigate('EditShift', { shift: item })}
          >
            <Text style={styles.actionBtnText}>{canManageShifts ? '✏️ Edit' : '📝 Respond'}</Text>
          </TouchableOpacity>
          
          {/* Delete Button (Admin only) */}
          {userRole === 'Admin' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => handleDelete(item._id, item.userId?.fullName)}
            >
              <Text style={styles.actionBtnText}>🗑️ Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6A1B9A" />
        <Text style={styles.loadingText}>Loading shifts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search by employee name..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#aaa"
      />

      {/* Shift Type Filter */}
      <View style={styles.filterRow}>
        {SHIFT_TYPES.map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.filterBtn, selectedShiftType === type && styles.filterBtnActive]}
            onPress={() => setSelectedShiftType(type)}
          >
            <Text style={[styles.filterBtnText, selectedShiftType === type && styles.filterBtnTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status Filter */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterBtn, selectedStatus === status && styles.filterBtnActive]}
            onPress={() => setSelectedStatus(status)}
          >
            <Text style={[styles.filterBtnText, selectedStatus === status && styles.filterBtnTextActive]}>
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.countText}>
        {filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''} found
      </Text>

      <FlatList
        data={filteredShifts}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No shifts found.</Text>
          </View>
        }
      />

      {/* Floating Add Button (Admin and Supervisor) */}
      {canManageShifts && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddShift')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  searchInput: {
    backgroundColor: '#fff', margin: 12, borderRadius: 10,
    padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0',
  },
  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, marginBottom: 6,
  },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#e0e0e0',
    marginRight: 6, marginBottom: 6,
  },
  filterBtnActive: { backgroundColor: '#6A1B9A' },
  filterBtnText: { fontSize: 12, color: '#555', fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  countText: { fontSize: 12, color: '#888', paddingHorizontal: 14, marginBottom: 4 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10,
    borderRadius: 12, overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardContent: { padding: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  employeeName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  roleText: { fontSize: 12, color: '#666', marginBottom: 4 },
  dateText: { fontSize: 13, color: '#444', marginBottom: 2 },
  timeText: { fontSize: 13, color: '#444', marginBottom: 2 },
  memberStatusText: { fontSize: 12, color: '#0b6e4f', marginTop: 4, fontWeight: '600' },
  notesText: { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#6A1B9A' },
  statusCompleted: { backgroundColor: '#4caf50' },
  statusAbsent: { backgroundColor: '#f44336' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: { flex: 1, minWidth: '45%', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  viewBtn: { backgroundColor: '#6A1B9A' },
  editBtn: { backgroundColor: '#6A1B9A' },
  deleteBtn: { backgroundColor: '#d32f2f' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#6A1B9A', justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36 },
  loadingText: { marginTop: 10, color: '#666' },
  errorText: { color: '#d32f2f', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#999', fontWeight: '600', textAlign: 'center', marginTop: 40 },
});