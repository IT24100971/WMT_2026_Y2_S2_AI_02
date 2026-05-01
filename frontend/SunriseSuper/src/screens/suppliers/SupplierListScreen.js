import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Linking,
} from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../context/AuthContext';

const SERVER_URL = BASE_URL.replace('/api', '');

export default function SupplierListScreen({ navigation }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${BASE_URL}/suppliers`);
      setSuppliers(response.data);
    } catch (err) {
      setError('Failed to load suppliers. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSuppliers();
    }, [])
  );

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await axios.delete(`${BASE_URL}/suppliers/${id}`);
      setSuppliers(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete supplier');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = (id, name) => {
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) },
      ]
    );
  };

  const openDocument = (docPath) => {
    if (!docPath || docPath === '[object Object]' || typeof docPath !== 'string') {
      Alert.alert('Unavailable', 'No valid contract document found for this supplier.');
      return;
    }
    const cleanPath = docPath.replace(/\\/g, '/');
    const url = `${SERVER_URL}/${cleanPath}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open document.');
    });
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.supplierName?.toLowerCase().includes(searchText.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchText.toLowerCase()) ||
    s.contactNumber?.toLowerCase().includes(searchText.toLowerCase())
  );

  const hasValidContract = (doc) => doc && typeof doc === 'string' && doc !== '[object Object]';

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ViewSupplier', { supplier: item })}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.supplierName?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.supplierName}>{item.supplierName}</Text>
          <Text style={styles.supplierEmail}>{item.email}</Text>
        </View>
        <View style={[styles.statusBadge, item.status === 'Active' ? styles.statusActive : styles.statusInactive]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.detail}>📞 {item.contactNumber}</Text>
        <Text style={styles.detail} numberOfLines={1}>📍 {item.address}</Text>
        <Text style={styles.detail} numberOfLines={1}>📦 {item.productsSupplied?.join(', ') || 'N/A'}</Text>

        {hasValidContract(item.contractDocument) && (
          <TouchableOpacity style={styles.docBtn} onPress={() => openDocument(item.contractDocument)}>
            <Text style={styles.docBtnText}>📄 View Contract</Text>
          </TouchableOpacity>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.viewBtn]}
            onPress={() => navigation.navigate('ViewSupplier', { supplier: item })}
          >
            <Text style={styles.actionBtnText}>👁 View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => navigation.navigate('EditSupplier', { supplier: item })}
          >
            <Text style={styles.actionBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => confirmDelete(item._id, item.supplierName)}
            disabled={deleting}
          >
            <Text style={styles.actionBtnText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading suppliers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchSuppliers}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search by name, email, or contact..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#aaa"
      />

      <Text style={styles.countText}>
        {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''} found
      </Text>

      <FlatList
        data={filteredSuppliers}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={true}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No suppliers found.</Text>
            <Text style={styles.emptySubText}>Tap + to add your first supplier.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddSupplier')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', overflow: 'hidden' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, minHeight: 200 },
  searchInput: {
    backgroundColor: '#fff', margin: 12, borderRadius: 10,
    padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0',
  },
  countText: { fontSize: 12, color: '#888', paddingHorizontal: 14, marginBottom: 4 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12,
    borderRadius: 12, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
  },
  avatarCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  cardHeaderText: { flex: 1 },
  supplierName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  supplierEmail: { fontSize: 12, color: '#888', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#e8f5e9' },
  statusInactive: { backgroundColor: '#ffebee' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#555' },
  cardContent: { padding: 12 },
  detail: { fontSize: 13, color: '#666', marginBottom: 4 },
  docBtn: {
    backgroundColor: '#f1f8e9', paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 6, alignSelf: 'flex-start', marginTop: 8, marginBottom: 12,
    borderWidth: 1, borderColor: '#c5e1a5'
  },
  docBtnText: { color: '#33691e', fontSize: 12, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  viewBtn: { backgroundColor: '#4CAF50' },
  editBtn: { backgroundColor: '#1976d2' },
  deleteBtn: { backgroundColor: '#d32f2f' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36 },
  loadingText: { marginTop: 10, color: '#666' },
  errorText: { color: '#d32f2f', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { fontSize: 16, color: '#999', fontWeight: '600' },
  emptySubText: { fontSize: 13, color: '#bbb', marginTop: 4 },
});
