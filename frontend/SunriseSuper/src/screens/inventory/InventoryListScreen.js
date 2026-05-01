import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../context/AuthContext';
import * as Linking from 'expo-linking';

const STATUS_COLORS = {
  'In Stock':     { bg: '#e6f4ea', text: '#2e7d32' },
  'Low Stock':    { bg: '#fff8e1', text: '#f57f17' },
  'Out of Stock': { bg: '#fce4ec', text: '#c62828' },
};

export default function InventoryListScreen({ navigation }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const statuses = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

  const fetchInventory = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setInventory(data);
    } catch {
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    const unsubscribe = navigation.addListener('focus', fetchInventory);
    return unsubscribe;
  }, [navigation]);

  const handleDelete = (id) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this inventory record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            await fetch(`${BASE_URL}/inventory/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            fetchInventory();
          } catch {
            Alert.alert('Error', 'Failed to delete');
          }
        }
      }
    ]);
  };

  const filtered = inventory.filter(item => {
    const name = item.productId?.name?.toLowerCase() || '';
    const barcode = item.productId?.barcode?.toLowerCase() || '';
    const matchSearch = name.includes(search.toLowerCase()) || barcode.includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || item.stockStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const renderItem = ({ item }) => {
    const status = item.stockStatus || 'In Stock';
    const colors = STATUS_COLORS[status] || STATUS_COLORS['In Stock'];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.productName}>{item.productId?.name || 'Unknown Product'}</Text>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>{status}</Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.infoText}>📦  Barcode: {item.productId?.barcode || 'N/A'}</Text>
          <Text style={styles.infoText}>📁  Category: {item.productId?.category || 'N/A'}</Text>
          <Text style={styles.infoText}>📍  Location: {item.warehouseLocation || 'N/A'}</Text>
        </View>
        <View style={styles.stockRow}>
          <View style={styles.stockBox}>
            <Text style={styles.stockLabel}>Current</Text>
            <Text style={[styles.stockValue, { color: colors.text }]}>{item.currentStock}</Text>
          </View>
          <View style={styles.stockBox}>
            <Text style={styles.stockLabel}>Reorder At</Text>
            <Text style={styles.stockValue}>{item.reorderLevel}</Text>
          </View>
          <View style={styles.stockBox}>
            <Text style={styles.stockLabel}>Max Stock</Text>
            <Text style={styles.stockValue}>{item.maxStock}</Text>
          </View>
        </View>
        {item.expiryDate && (
          <Text style={styles.expiry}>
            🗓  Expires: {new Date(item.expiryDate).toLocaleDateString()}
          </Text>
        )}

        {/* ── Stock Report Button ── */}
        {item.stockReport && (
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => {
              const url = `${BASE_URL.replace('/api', '')}/${item.stockReport.replace(/\\/g, '/')}`;
              Linking.openURL(url);
            }}
          >
            <Text style={styles.reportBtnText}>📄  View Stock Report</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditStock', { inventory: item })}
          >
            <Text style={styles.editBtnText}>✏️  Edit Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item._id)}
          >
            <Text style={styles.deleteBtnText}>🗑  Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="🔍  Search by name or barcode..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#999"
      />
      <View style={styles.filterRow}>
        {statuses.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.filterChipText, filterStatus === s && styles.filterChipTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.countText}>{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</Text>
      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchInventory(); }}
            tintColor="#1976d2"
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No inventory records found.</Text>}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddInventory')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#e0e0e0' },
  filterChipActive: { backgroundColor: '#1976d2' },
  filterChipText: { fontSize: 13, color: '#555' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  countText: { fontSize: 13, color: '#777', marginBottom: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardInfo: { marginBottom: 12 },
  infoText: { fontSize: 13, color: '#666', marginBottom: 3 },
  stockRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#f9f9f9', borderRadius: 10, padding: 10, marginBottom: 10
  },
  stockBox: { alignItems: 'center' },
  stockLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  stockValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  expiry: { fontSize: 12, color: '#888', marginBottom: 8 },
  reportBtn: {
    backgroundColor: '#E3F2FD', borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#90CAF9'
  },
  reportBtnText: { color: '#1976d2', fontWeight: '600', fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, backgroundColor: '#1976d2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  deleteBtn: { flex: 1, backgroundColor: '#C62828', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#1976d2', justifyContent: 'center',
    alignItems: 'center', elevation: 6, shadowColor: '#1976d2', shadowOpacity: 0.4, shadowRadius: 8
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 15 },
});