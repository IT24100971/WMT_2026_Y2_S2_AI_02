// ProductListScreen.js
// Main screen for Product Management. Shows all products fetched from the API.
// Features: search bar, category filter buttons, edit/delete per item, + FAB to add.
// useFocusEffect re-fetches data every time this screen comes into view so the
// list always reflects the latest state after adding or editing a product.

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Image,
} from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../context/AuthContext';

// SERVER_URL is the base without /api — needed to build full image URLs.
// e.g. BASE_URL = "http://192.168.1.5:5000/api"
// So SERVER_URL = "http://192.168.1.5:5000"
// And an image at uploads/123-product.jpg becomes http://192.168.1.5:5000/uploads/123-product.jpg
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

  // fetchProducts calls the backend. If a category is selected (not 'All'),
  // it adds ?category=Rice to the URL so the backend filters it server-side.
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

  // Runs every time this screen becomes active (e.g. returning from Add/Edit)
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [selectedCategory])
  );

  // Shows confirmation dialog before deleting
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
              // Remove from local state instantly — no need to re-fetch
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

  // Client-side search filter on top of category-filtered results
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchText.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Product Image */}
      {item.image ? (
        <Image
          source={{ uri: `${SERVER_URL}/${item.image}` }}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.noImage}>
          <Text style={styles.noImageText}>No Image</Text>
        </View>
      )}

      {/* Product Info */}
      <View style={styles.cardContent}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
        </View>
        <Text style={styles.detail}>Barcode: {item.barcode}</Text>
        <Text style={styles.detail}>Unit: {item.unit}</Text>
        <Text style={styles.price}>Rs. {item.sellingPrice} / {item.unit}</Text>
        <Text style={styles.costPrice}>Cost: Rs. {item.costPrice}</Text>

        {/* Action Buttons */}
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

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search by name or barcode..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#aaa"
      />

      {/* Category Filter Buttons */}
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

      {/* Product Count */}
      <Text style={styles.countText}>
        {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
      </Text>

      {/* Product List */}
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

      {/* Floating Add Button */}
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