import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BASE_URL } from '../../context/AuthContext';

const STATUS_COLORS = {
  'In Stock':     { bg: '#e6f4ea', text: '#2e7d32' },
  'Low Stock':    { bg: '#fff8e1', text: '#f57f17' },
  'Out of Stock': { bg: '#fce4ec', text: '#c62828' },
};

export default function EditStockScreen({ route, navigation }) {
  const { inventory } = route.params;

  const [currentStock, setCurrentStock] = useState(String(inventory.currentStock));
  const [reorderLevel, setReorderLevel] = useState(String(inventory.reorderLevel));
  const [maxStock, setMaxStock] = useState(String(inventory.maxStock));
  const [warehouseLocation, setWarehouseLocation] = useState(inventory.warehouseLocation || '');
  const [expiryDate, setExpiryDate] = useState(
    inventory.expiryDate ? inventory.expiryDate.substring(0, 10) : ''
  );
  const [stockReport, setStockReport] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const product = inventory.productId;
  const stockNum = Number(currentStock);
  const reorderNum = Number(reorderLevel);

  let previewStatus = 'In Stock';
  if (stockNum <= 0) previewStatus = 'Out of Stock';
  else if (stockNum < reorderNum) previewStatus = 'Low Stock';

  const colors = STATUS_COLORS[previewStatus];

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setExpiryDate(formattedDate);
    }
    setShowDatePicker(false);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setStockReport(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const validate = () => {
    if (!currentStock || isNaN(currentStock) || Number(currentStock) < 0)
      return 'Current stock must be a non-negative number';
    if (!reorderLevel || isNaN(reorderLevel) || Number(reorderLevel) < 0)
      return 'Reorder level must be a non-negative number';
    if (!maxStock || isNaN(maxStock) || Number(maxStock) < 0)
      return 'Max stock must be a non-negative number';
    if (Number(currentStock) > Number(maxStock))
      return 'Current stock cannot exceed max stock';
    return null;
  };

  const handleUpdate = async () => {
    const error = validate();
    if (error) return Alert.alert('Validation Error', error);

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      formData.append('currentStock', String(Number(currentStock)));
      formData.append('reorderLevel', String(Number(reorderLevel)));
      formData.append('maxStock', String(Number(maxStock)));
      if (warehouseLocation) formData.append('warehouseLocation', warehouseLocation);
      if (expiryDate) formData.append('expiryDate', expiryDate);
      if (stockReport) {
        formData.append('stockReport', {
          uri: stockReport.uri,
          name: stockReport.name,
          type: stockReport.mimeType || 'application/pdf',
        });
      }

      const updateRes = await fetch(`${BASE_URL}/inventory/${inventory._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await updateRes.json();
      if (!updateRes.ok) throw new Error(data.message || 'Update failed');

      Alert.alert('Success', 'Inventory updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.productCard}>
        <Text style={styles.productName}>{product?.name || 'Unknown Product'}</Text>
        <View style={styles.productMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product?.category || 'N/A'}</Text>
          </View>
        </View>
        <Text style={styles.productSub}>Barcode: {product?.barcode || 'N/A'}</Text>
      </View>

      <View style={[styles.statusPreview, { backgroundColor: colors.bg }]}>
        <Text style={styles.statusPreviewLabel}>Stock Status Preview</Text>
        <Text style={[styles.statusPreviewValue, { color: colors.text }]}>{previewStatus}</Text>
      </View>

      <Text style={styles.sectionTitle}>Edit Stock Details</Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Current Stock <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={currentStock}
            onChangeText={setCurrentStock}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#bbb"
          />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Reorder Level <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={reorderLevel}
            onChangeText={setReorderLevel}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#bbb"
          />
        </View>
      </View>

      <Text style={styles.label}>Max Stock <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        value={maxStock}
        onChangeText={setMaxStock}
        keyboardType="numeric"
        placeholder="Enter max stock"
        placeholderTextColor="#bbb"
      />

      <Text style={styles.label}>Warehouse Location</Text>
      <TextInput
        style={styles.input}
        value={warehouseLocation}
        onChangeText={setWarehouseLocation}
        placeholder="e.g. Aisle 3, Shelf B"
        placeholderTextColor="#bbb"
      />

      <Text style={styles.label}>Expiry Date</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={expiryDate ? { color: '#1a1a1a', fontSize: 15 } : styles.placeholder}>
          {expiryDate || 'Select expiry date'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={expiryDate ? new Date(expiryDate) : new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <Text style={styles.label}>Stock Report</Text>
      {inventory.stockReport && !stockReport ? (
        <View style={styles.fileSelected}>
          <Text style={styles.fileIcon}>📄</Text>
          <Text style={styles.fileName} numberOfLines={1}>
            {inventory.stockReport.split(/[\\/]/).pop()}
          </Text>
          <TouchableOpacity onPress={pickDocument}>
            <Text style={styles.fileAction}>Replace</Text>
          </TouchableOpacity>
        </View>
      ) : stockReport ? (
        <View style={styles.fileSelected}>
          <Text style={styles.fileIcon}>📄</Text>
          <Text style={styles.fileName} numberOfLines={1}>{stockReport.name}</Text>
          <TouchableOpacity onPress={() => setStockReport(null)}>
            <Text style={styles.fileAction}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
          <Text style={styles.uploadBtnText}>📎  Attach PDF / DOC</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.updateBtn, loading && { opacity: 0.7 }]}
        onPress={handleUpdate}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.updateBtnText}>Update Stock</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  productCard: {
    backgroundColor: '#f0f7ff', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#e3f2fd'
  },
  productName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  productMeta: { flexDirection: 'row', marginBottom: 4 },
  categoryBadge: { backgroundColor: '#E3F2FD', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#1976d2', fontSize: 12, fontWeight: '600' },
  productSub: { fontSize: 13, color: '#777' },
  statusPreview: {
    borderRadius: 12, padding: 14, marginBottom: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  statusPreviewLabel: { fontSize: 13, color: '#555', fontWeight: '500' },
  statusPreviewValue: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 14 },
  required: { color: '#d32f2f' },
  input: {
    backgroundColor: '#f7f7f7', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: '#1a1a1a',
    borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center'
  },
  placeholder: { color: '#bbb', fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
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
  fileAction: { fontSize: 14, color: '#1976d2', fontWeight: '700', paddingHorizontal: 4 },
  updateBtn: { backgroundColor: '#1976d2', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  updateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});