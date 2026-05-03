import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Image,
} from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../context/AuthContext';

const SERVER_URL = BASE_URL.replace('/api', '');

const CATEGORIES = [
  'All', 'Rice', 'Oil', 'Dairy', 'Bakery', 'Beverage',
  'Flour', 'Sugar', 'Snacks', 'Grocery', 'Cleaning',
  'Personal Care', 'Frozen', 'Fruits & Veg', 'Condiments', 'Baby'
];

export default function ProductListScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchText, setSearchText] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const url = selectedCategory !== 'All'
        ? `${BASE_URL}/products?category=${selectedCategory}`
        : `${BASE_URL}/products`;
      const response = await axios.get(url);
      setProducts(response.data);
    } catch (err) {
      setError('Failed to load products. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [selectedCategory])
  );

  const handleDelete = (id, name) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BASE_URL}/products/${id}`);
              setProducts(prev => prev.filter(p => p._id !== id));
              Alert.alert('Deleted', `"${name}" has been deleted.`);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchText.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchText.toLowerCase())
  );

  const getImageUri = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    return `${SERVER_URL}/${image}`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.image ? (
        <Image
          source={{ uri: getImageUri(item.image) }}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.noImage}>
          <Text style={styles.noImageText}>No Image</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
        </View>
        <Text style={styles.detail}>Barcode: {item.barcode}</Text>
        <Text style={styles.detail}>Unit: {item.unit}</Text>
        <Text style={styles.price}>Rs. {item.sellingPrice} / {item.unit}</Text>
        <Text style={styles.costPrice}>Cost: Rs. {item.costPrice}</Text>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => navigation.navigate('EditProduct', { product: item })}
          >
            <Text style={styles.actionBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item._id, item.name)}
          >
            <Text style={styles.actionBtnText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ff6b00" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProducts}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search by name or barcode..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#aaa"
      />

      <View style={styles.categoryRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catBtn, selectedCategory === cat && styles.catBtnActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.catBtnText, selectedCategory === cat && styles.catBtnTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.countText}>
        {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
      </Text>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No products found.</Text>
            <Text style={styles.emptySubText}>Tap + to add your first product.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  categoryRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, marginBottom: 6,
  },
  catBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#e0e0e0',
    marginRight: 6, marginBottom: 6,
  },
  catBtnActive: { backgroundColor: '#ff6b00' },
  catBtnText: { fontSize: 12, color: '#555', fontWeight: '600' },
  catBtnTextActive: { color: '#fff' },
  countText: { fontSize: 12, color: '#888', paddingHorizontal: 14, marginBottom: 4 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10,
    borderRadius: 12, overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
    flexDirection: 'row',
  },
  productImage: { width: 100, height: 120 },
  noImage: {
    width: 100, height: 120, backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center',
  },
  noImageText: { fontSize: 11, color: '#aaa' },
  cardContent: { flex: 1, padding: 12 },
  productName: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  categoryBadge: {
    backgroundColor: '#fff3e0', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, alignSelf: 'flex-start', marginBottom: 6,
  },
  categoryBadgeText: { fontSize: 11, color: '#ff6b00', fontWeight: '600' },
  detail: { fontSize: 12, color: '#666', marginBottom: 2 },
  price: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32', marginTop: 4 },
  costPrice: { fontSize: 12, color: '#888', marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  editBtn: { backgroundColor: '#1976d2' },
  deleteBtn: { backgroundColor: '#d32f2f' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#ff6b00', justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36 },
  loadingText: { marginTop: 10, color: '#666' },
  errorText: { color: '#d32f2f', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#ff6b00', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { fontSize: 16, color: '#999', fontWeight: '600' },
  emptySubText: { fontSize: 13, color: '#bbb', marginTop: 4 },
});