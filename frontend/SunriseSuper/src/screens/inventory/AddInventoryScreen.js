import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, FlatList, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';  // add this line
import * as DocumentPicker from 'expo-document-picker';
import { BASE_URL } from '../../context/AuthContext';

export default function AddInventoryScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductList, setShowProductList] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [currentStock, setCurrentStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stockReport, setStockReport] = useState(null);  // ← new
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${BASE_URL}/products`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setProducts(data);
      } catch {
        Alert.alert('Error', 'Failed to load products');
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // ── PDF Picker ──
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setStockReport(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document');
    }
  };
  const onDateChange = (event, selectedDate) => {
  setShowDatePicker(Platform.OS === 'ios');
  if (selectedDate) setExpiryDate(selectedDate);
};

const formatDate = (date) => {
  if (!date) return null;
  return date.toISOString().split('T')[0];
};

  const validate = () => {
    if (!selectedProduct) return 'Please select a product';
    if (!currentStock) return 'Current stock is required';
    if (isNaN(currentStock) || Number(currentStock) < 0) return 'Stock must be a non-negative number';
    if (!reorderLevel) return 'Reorder level is required';
    if (isNaN(reorderLevel) || Number(reorderLevel) < 0) return 'Reorder level must be non-negative';
    if (!maxStock) return 'Max stock is required';
    if (isNaN(maxStock) || Number(maxStock) < 0) return 'Max stock must be non-negative';
    if (Number(currentStock) > Number(maxStock)) return 'Current stock cannot exceed max stock';
    return null;
  };

  const handleCreate = async () => {
    const error = validate();
    if (error) return Alert.alert('Validation Error', error);

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');

      // Use FormData so we can attach the PDF file
      const formData = new FormData();
      formData.append('productId', selectedProduct._id);
      formData.append('currentStock', String(Number(currentStock)));
      formData.append('reorderLevel', String(Number(reorderLevel)));
      formData.append('maxStock', String(Number(maxStock)));
      if (warehouseLocation) formData.append('warehouseLocation', warehouseLocation);
      if (expiryDate) formData.append('expiryDate', formatDate(expiryDate));
      if (stockReport) {
        formData.append('stockReport', {
          uri: stockReport.uri,
          name: stockReport.name,
          type: stockReport.mimeType || 'application/pdf',
        });
      }

      const res = await fetch(`${BASE_URL}/inventory`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        // No Content-Type header — fetch sets it automatically with boundary for FormData
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Creation failed');

      Alert.alert('Success', 'Inventory record created!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Inventory Details</Text>

      {/* ── Product Selector ── */}
      <Text style={styles.label}>Product <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowProductList(!showProductList)}
      >
        <Text style={selectedProduct ? styles.selectorText : styles.selectorPlaceholder}>
          {selectedProduct ? selectedProduct.name : 'Select a product...'}
        </Text>
        <Text style={styles.selectorArrow}>{showProductList ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showProductList && (
        <View style={styles.dropdown}>
          <TextInput
            style={styles.dropdownSearch}
            placeholder="Search products..."
            value={productSearch}
            onChangeText={setProductSearch}
            placeholderTextColor="#999"
          />
           <FlatList
  data={filteredProducts}
  keyExtractor={p => p._id}
  style={styles.productFlatList}
  nestedScrollEnabled={true}
  keyboardShouldPersistTaps="handled"
  renderItem={({ item: p }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => {
        setSelectedProduct(p);
        setShowProductList(false);
        setProductSearch('');
      }}
    >
      <Text style={styles.dropdownItemName}>{p.name}</Text>
      <Text style={styles.dropdownItemSub}>{p.barcode} • {p.category}</Text>
    </TouchableOpacity>
  )}
  ListEmptyComponent={
    <Text style={styles.noResults}>No products found</Text>
  }
/>
        </View>
      )}

      {/* ── Stock Fields ── */}
      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Current Stock <Text style={styles.required}>*</Text></Text>
          <TextInput style={styles.input} value={currentStock} onChangeText={setCurrentStock}
            keyboardType="numeric" placeholder="0" placeholderTextColor="#bbb" />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Reorder Level <Text style={styles.required}>*</Text></Text>
          <TextInput style={styles.input} value={reorderLevel} onChangeText={setReorderLevel}
            keyboardType="numeric" placeholder="0" placeholderTextColor="#bbb" />
        </View>
      </View>

      <Text style={styles.label}>Max Stock <Text style={styles.required}>*</Text></Text>
      <TextInput style={styles.input} value={maxStock} onChangeText={setMaxStock}
        keyboardType="numeric" placeholder="Enter max stock quantity" placeholderTextColor="#bbb" />

      <Text style={styles.label}>Warehouse Location</Text>
      <TextInput style={styles.input} value={warehouseLocation} onChangeText={setWarehouseLocation}
        placeholder="e.g. Aisle 3, Shelf B" placeholderTextColor="#bbb" />

      <Text style={styles.label}>Expiry Date (Optional)</Text>
      <TouchableOpacity
  style={styles.dateSelector}
  onPress={() => setShowDatePicker(true)}
>
  <Text style={styles.dateIcon}>📅</Text>
  <Text style={expiryDate ? styles.dateText : styles.datePlaceholder}>
    {expiryDate ? formatDate(expiryDate) : 'Select expiry date...'}
  </Text>
  {expiryDate && (
    <TouchableOpacity onPress={() => setExpiryDate(null)}>
      <Text style={styles.dateClear}>✕</Text>
    </TouchableOpacity>
  )}
</TouchableOpacity>

{showDatePicker && (
  <DateTimePicker
    value={expiryDate || new Date()}
    mode="date"
    display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
    minimumDate={new Date()}
    onChange={onDateChange}
  />
)}

      {/* ── Stock Report Upload ── */}
      <Text style={styles.label}>Stock Report (Optional)</Text>
      {stockReport ? (
        <View style={styles.fileSelected}>
          <Text style={styles.fileIcon}>📄</Text>
          <Text style={styles.fileName} numberOfLines={1}>{stockReport.name}</Text>
          <TouchableOpacity onPress={() => setStockReport(null)}>
            <Text style={styles.fileRemove}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
          <Text style={styles.uploadBtnText}>📎  Attach PDF / DOC</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.createBtn, loading && { opacity: 0.7 }]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.createBtnText}>Create Inventory Record</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 14 },
  required: { color: '#d32f2f' },
  input: {
    backgroundColor: '#f7f7f7', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: '#1a1a1a',
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  selector: {
    backgroundColor: '#f7f7f7', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 14, borderWidth: 1, borderColor: '#e0e0e0',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  selectorText: { fontSize: 15, color: '#1a1a1a' },
  selectorPlaceholder: { fontSize: 15, color: '#bbb' },
  selectorArrow: { color: '#1976d2', fontWeight: '700' },
  dropdown: {
  backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
  borderColor: '#e0e0e0', marginTop: 4, elevation: 4,
  maxHeight: 250,
},
  dropdownSearch: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', fontSize: 14, color: '#333' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownItemName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  dropdownItemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  noResults: { padding: 14, color: '#aaa', textAlign: 'center' },
  // File upload styles
  uploadBtn: {
    backgroundColor: '#f7f7f7', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderStyle: 'dashed'
  },
  uploadBtnText: { fontSize: 14, color: '#555', fontWeight: '500' },
  fileSelected: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f7ff',
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#b3d4f5', gap: 10
  },
  fileIcon: { fontSize: 22 },
  fileName: { flex: 1, fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  fileRemove: { fontSize: 16, color: '#c62828', fontWeight: '700', paddingHorizontal: 4 },
  createBtn: { backgroundColor: '#1976d2', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

   productFlatList: { flexGrow: 0 },
dateSelector: {
  backgroundColor: '#f7f7f7', borderRadius: 10, paddingHorizontal: 14,
  paddingVertical: 14, borderWidth: 1, borderColor: '#e0e0e0',
  flexDirection: 'row', alignItems: 'center', gap: 10
},
dateIcon: { fontSize: 18 },
dateText: { flex: 1, fontSize: 15, color: '#1a1a1a' },
datePlaceholder: { flex: 1, fontSize: 15, color: '#bbb' },
dateClear: { fontSize: 16, color: '#c62828', fontWeight: '700', paddingHorizontal: 4 },
});