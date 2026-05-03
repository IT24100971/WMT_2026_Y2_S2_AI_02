import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity, Image, ScrollView, Modal, Dimensions, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const SERVER_URL = BASE_URL.replace('/api', '');

const getImageUri = (img) => {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  return `${SERVER_URL}/${img}`;
};

export default function GRNListScreen({ navigation }) {
  const { user } = useAuth();
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageViewerImages, setImageViewerImages] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  useFocusEffect(
    useCallback(() => {
      fetchGRNs();
      fetchSuppliers();
      fetchProducts();
    }, [])
  );

  const fetchGRNs = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/grn`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 20000
      });
      setGrns(res.data.data || []);
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to fetch GRNs');
    } finally { setLoading(false); }
  };

  const fetchSuppliers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/suppliers`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 20000
      });
      const suppliers = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setAllSuppliers(suppliers);
    } catch (err) {
      console.log('Failed to fetch suppliers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/products`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 20000
      });
      const products = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setAllProducts(products);
    } catch (err) {
      console.log('Failed to fetch products:', err);
    }
  };

  const markRead = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.put(`${BASE_URL}/grn/${id}/mark-read`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 20000
      });
      if (res.data.success) {
        Alert.alert('Updated', 'GRN marked as read');
        fetchGRNs();
      }
    } catch (err) {
      console.log(err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to mark as read');
    }
  };

  const deleteGRN = async (id) => {
    Alert.alert('Delete GRN', 'Are you sure you want to delete this GRN?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            const res = await axios.delete(`${BASE_URL}/grn/${id}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              timeout: 20000
            });
            if (res.data.success) {
              Alert.alert('Deleted', 'GRN deleted successfully');
              fetchGRNs();
            }
          } catch (err) {
            console.log(err);
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete GRN');
          }
        }
      }
    ]);
  };

  const editGRN = (item) => {
    navigation.navigate('CreateGRN', { grn: item });
  };

  const getFilteredGRNs = () => {
    return grns.filter(item => {
      const searchMatch = !searchText ||
        item.grnNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        item.productId?.name?.toLowerCase().includes(searchText.toLowerCase());

      const isRead = item.isRead;
      const statusMatch = statusFilter === 'All' ||
        (statusFilter === 'Unread' && !isRead) ||
        (statusFilter === 'Read' && isRead);

      const conditionMatch = conditionFilter === 'All' || item.condition === conditionFilter;

      const itemDate = new Date(item.receivedDate);
      const dateMatch = (!dateFrom || itemDate >= dateFrom) &&
        (!dateTo || itemDate <= dateTo);

      const supplierMatch = !selectedSupplier || item.supplierId?._id === selectedSupplier._id;
      const productMatch = !selectedProduct || item.productId?._id === selectedProduct._id;

      return searchMatch && statusMatch && conditionMatch && dateMatch && supplierMatch && productMatch;
    });
  };

  const clearFilters = () => {
    setSearchText('');
    setStatusFilter('All');
    setConditionFilter('All');
    setDateFrom(null);
    setDateTo(null);
    setSelectedSupplier(null);
    setSelectedProduct(null);
  };

  const handleStartDateChange = (event, selectedDate) => {
    if (selectedDate) setDateFrom(selectedDate);
  };

  const handleEndDateChange = (event, selectedDate) => {
    if (selectedDate) setDateTo(selectedDate);
  };

  const hasActiveFilters = searchText || statusFilter !== 'All' || conditionFilter !== 'All' ||
    dateFrom || dateTo || selectedSupplier || selectedProduct;

  const openImageViewer = (images) => {
    if (images && images.length > 0) {
      setImageViewerImages(images.map(img => getImageUri(img)));
      setImageViewerIndex(0);
      setImageViewerVisible(true);
    }
  };

  const renderImageViewer = () => (
    <Modal visible={imageViewerVisible} transparent animationType="fade">
      <View style={styles.imageViewerBackdrop}>
        <TouchableOpacity style={styles.imageViewerClose} onPress={() => setImageViewerVisible(false)}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setImageViewerIndex(index);
          }} scrollEventThrottle={16}>
          {imageViewerImages.map((img, idx) => (
            <View key={idx} style={{ width, justifyContent: 'center', alignItems: 'center' }}>
              <Image source={{ uri: img }} style={styles.imageViewerImage} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>{imageViewerIndex + 1} / {imageViewerImages.length}</Text>
        </View>
      </View>
    </Modal>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.grnNumber}>{item.grnNumber}</Text>
          <Text style={styles.detailSmall}>{new Date(item.receivedDate).toLocaleDateString()}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.isRead ? styles.statusRead : styles.statusUnread,
          item.receivedQty !== item.invoicedQty ? styles.statusMismatch : null
        ]}>
          <Text style={styles.statusText}>
            {item.isRead ? '✓ Read' : 'Unread'}{item.receivedQty !== item.invoicedQty ? ' • Qty Diff' : ''}
          </Text>
        </View>
      </View>

      {item.images && item.images.length > 0 && (
        <TouchableOpacity style={styles.imagesContainer} onPress={() => openImageViewer(item.images)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.imagesScroll}>
            {item.images.map((img, idx) => (
              <View key={idx} style={styles.imageWrapper}>
                <Image source={{ uri: getImageUri(img) }} style={styles.grnImage} />
                {item.images.length > 1 && idx === 0 && (
                  <Text style={styles.imageCount}>+{item.images.length - 1}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </TouchableOpacity>
      )}

      <View style={styles.detailsSection}>
        <Text style={styles.detail}>📦 <Text style={styles.detailBold}>{item.productId?.name}</Text></Text>
        <Text style={styles.detail}>🏢 <Text style={styles.detailBold}>{item.supplierId?.supplierName}</Text></Text>
        <View style={styles.quantityRow}>
          <Text style={styles.detail}>📥 Received: {item.receivedQty}</Text>
          <Text style={styles.detail}> / 📋 Invoiced: {item.invoicedQty}</Text>
        </View>
        {item.receivedQty !== item.invoicedQty && (
          <Text style={styles.discrepancyText}>
            Quantity discrepancy: {(Number(item.receivedQty) - Number(item.invoicedQty)) > 0 ? '+' : '-'}{Math.abs(Number(item.receivedQty) - Number(item.invoicedQty))} {item.unit || item.productId?.unit || 'unit(s)'}
          </Text>
        )}
        <Text style={styles.detail}>🔍 Condition: <Text style={styles.detailBold}>{item.condition}</Text></Text>
        <Text style={styles.detail}>👤 By: {item.receivedBy?.fullName}</Text>
        {item.isRead && (
          <Text style={styles.readByText}>
            ✓ Confirmed by {item.readBy?.fullName || item.readBy?.email || 'Unknown'} on {item.readAt ? new Date(item.readAt).toLocaleString() : '—'}
          </Text>
        )}
      </View>

      {!item.isRead && (user?.role === 'Admin' || user?.role === 'Supervisor') && (
        <TouchableOpacity style={styles.markReadBtn} onPress={() => markRead(item._id)}>
          <Text style={styles.markReadBtnText}>Mark as Read</Text>
        </TouchableOpacity>
      )}

      {user?._id && item.receivedBy?._id === user._id && !item.isRead && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => editGRN(item)}>
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteGRN(item._id)}>
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search by GRN# or product..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor="#aaa"
      />

      <View style={styles.filterRow}>
        {['All', 'Unread', 'Read'].map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterBtn, statusFilter === status && styles.filterBtnActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[styles.filterBtnText, statusFilter === status && styles.filterBtnTextActive]}>{status}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterRow}>
        {['All', 'Good', 'Damaged', 'Rejected'].map(cond => (
          <TouchableOpacity
            key={cond}
            style={[styles.filterBtn, conditionFilter === cond && styles.filterBtnActive]}
            onPress={() => setConditionFilter(cond)}
          >
            <Text style={[styles.filterBtnText, conditionFilter === cond && styles.filterBtnTextActive]}>{cond}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.advancedFilterRow}>
        <TouchableOpacity
          style={[styles.advFilterBtn, dateFrom || dateTo ? styles.advFilterBtnActive : null]}
          onPress={() => setShowDateRangeModal(true)}
        >
          <Text style={styles.advFilterBtnText}>📅 Date Range</Text>
        </TouchableOpacity>
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.countText}>
        {getFilteredGRNs().length} GRN{getFilteredGRNs().length !== 1 ? 's' : ''} found
      </Text>

      <Modal visible={showDateRangeModal} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <View style={styles.centeredModalContent}>
            <View style={styles.centeredModalHeader}>
              <Text style={styles.centeredModalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setShowDateRangeModal(false)}>
                <Text style={styles.centeredModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.dateLabel}>From</Text>
                <DateTimePicker value={dateFrom || new Date()} mode="date" display="default" onChange={handleStartDateChange} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.dateLabel}>To</Text>
                <DateTimePicker value={dateTo || new Date()} mode="date" display="default" onChange={handleEndDateChange} />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancelBtn]} onPress={() => setShowDateRangeModal(false)}>
                <Text style={styles.modalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.topFilterRow}>
        <TouchableOpacity
          style={[styles.advFilterBtn, selectedSupplier ? styles.advFilterBtnActive : null, styles.topFilterBtn]}
          onPress={() => setShowSupplierModal(true)}
        >
          <Text style={styles.advFilterBtnText} numberOfLines={1}>
            {selectedSupplier ? `🏢 ${selectedSupplier.supplierName}` : '🏢 Supplier'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.advFilterBtn, selectedProduct ? styles.advFilterBtnActive : null, styles.topFilterBtn]}
          onPress={() => setShowProductModal(true)}
        >
          <Text style={styles.advFilterBtnText} numberOfLines={1}>
            {selectedProduct ? `📦 ${selectedProduct.name}` : '📦 Product'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          data={getFilteredGRNs()}
          keyExtractor={i => i._id}
          renderItem={renderItem}
          refreshing={loading}
          onRefresh={fetchGRNs}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: '#999' }}>No GRNs found</Text>}
        />
      </View>

      {(user?.role === 'Storekeeper' || user?.role === 'Admin' || user?.role === 'Supervisor') && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateGRN')}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showSupplierModal} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <View style={styles.centeredModalContent}>
            <View style={styles.centeredModalHeader}>
              <Text style={styles.centeredModalTitle}>Select Supplier</Text>
              <TouchableOpacity onPress={() => setShowSupplierModal(false)}>
                <Text style={styles.centeredModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={allSuppliers}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.centeredModalItem, selectedSupplier?._id === item._id && styles.centeredModalItemSelected]}
                  onPress={() => { setSelectedSupplier(selectedSupplier?._id === item._id ? null : item); setShowSupplierModal(false); }}
                >
                  <Text style={[styles.centeredModalItemText, selectedSupplier?._id === item._id && styles.centeredModalItemTextSelected]}>
                    {item.supplierName}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No suppliers found</Text>}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showProductModal} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <View style={styles.centeredModalContent}>
            <View style={styles.centeredModalHeader}>
              <Text style={styles.centeredModalTitle}>Select Product</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Text style={styles.centeredModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={allProducts}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.centeredModalItem, selectedProduct?._id === item._id && styles.centeredModalItemSelected]}
                  onPress={() => { setSelectedProduct(selectedProduct?._id === item._id ? null : item); setShowProductModal(false); }}
                >
                  <Text style={[styles.centeredModalItemText, selectedProduct?._id === item._id && styles.centeredModalItemTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No products found</Text>}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {renderImageViewer()}
    </View>
  );
}

const styles = StyleSheet.create({
  searchInput: { backgroundColor: '#fff', margin: 12, borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0' },
  topFilterRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 6 },
  topFilterBtn: { flex: 1, alignItems: 'center' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 6 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e0e0e0', marginRight: 6, marginBottom: 6 },
  filterBtnActive: { backgroundColor: '#8B4513' },
  filterBtnText: { fontSize: 12, color: '#555', fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  advancedFilterRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8, gap: 8, flexWrap: 'wrap' },
  advFilterBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#e8e8e8', borderWidth: 1, borderColor: '#ddd' },
  advFilterBtnActive: { backgroundColor: '#8B4513', borderColor: '#654321' },
  advFilterBtnText: { fontSize: 12, color: '#555', fontWeight: '600' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#d32f2f' },
  clearBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  countText: { fontSize: 12, color: '#888', paddingHorizontal: 14, marginBottom: 4 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginBottom: 12, backgroundColor: '#fff', overflow: 'hidden', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  grnNumber: { fontSize: 16, fontWeight: '700', color: '#333' },
  detailSmall: { fontSize: 12, color: '#999', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusRead: { backgroundColor: '#E8D5C4' },
  statusUnread: { backgroundColor: '#F0E6DC' },
  statusMismatch: { backgroundColor: '#D8B08C' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#5D3317' },
  imagesContainer: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  imagesScroll: { flexDirection: 'row' },
  imageWrapper: { position: 'relative', marginRight: 8 },
  grnImage: { width: 100, height: 100, borderRadius: 8, backgroundColor: '#eee' },
  imageCount: { position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 12, fontWeight: '600' },
  detailsSection: { paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  detail: { fontSize: 14, color: '#555', lineHeight: 20 },
  detailBold: { fontWeight: '600', color: '#333' },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between' },
  discrepancyText: { fontSize: 12, color: '#8B4513', fontWeight: '600', marginTop: 4 },
  readByText: { fontSize: 12, color: '#5D3317', fontWeight: '500', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  markReadBtn: { backgroundColor: '#8B4513', marginHorizontal: 14, marginBottom: 12, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: '#654321' },
  markReadBtnText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginBottom: 12 },
  editBtn: { flex: 1, backgroundColor: '#A66A3F', paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: '#7A4A29' },
  deleteBtn: { flex: 1, backgroundColor: '#6D2F1A', paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: '#532114' },
  actionBtnText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#8B4513', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, borderWidth: 1, borderColor: '#654321' },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  imageViewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  imageViewerClose: { position: 'absolute', top: 40, right: 20, zIndex: 999, backgroundColor: 'rgba(0,0,0,0.6)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  closeText: { color: '#fff', fontSize: 28, fontWeight: '600' },
  imageViewerImage: { width: '90%', height: '80%' },
  imageCounter: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  imageCounterText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalList: { maxHeight: 300, paddingVertical: 8 },
  modalActions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalCancelBtn: { backgroundColor: '#f0f0f0' },
  modalBtnText: { fontSize: 14, fontWeight: '600', color: '#333' },
  dateLabel: { fontSize: 13, color: '#666', fontWeight: '600', marginBottom: 8 },
  centeredModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  centeredModalContent: { backgroundColor: '#fff', borderRadius: 16, width: '85%', maxHeight: '80%', paddingTop: 16 },
  centeredModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  centeredModalTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  centeredModalClose: { fontSize: 24, color: '#999' },
  centeredModalItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  centeredModalItemSelected: { backgroundColor: '#E8D4C5' },
  centeredModalItemText: { fontSize: 16, color: '#333' },
  centeredModalItemTextSelected: { fontWeight: 'bold', color: '#6F3B18' }
});