import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, FlatList, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../../context/AuthContext';

const CONDITIONS = ['Good', 'Damaged', 'Rejected'];
const UNITS = ['kg', 'L', 'pcs'];
const MAX_IMAGES = 4;
const SERVER_URL = BASE_URL.replace('/api', '');

export default function CreateGRNScreen({ navigation, route }) {
  const editGRN = route?.params?.grn;
  const isEditMode = !!editGRN;
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [invoicedQty, setInvoicedQty] = useState('');
  const [receivedQty, setReceivedQty] = useState('');
  const [condition, setCondition] = useState('Good');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState([]);

  const [allSuppliers, setAllSuppliers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!editGRN || allSuppliers.length === 0 || allProducts.length === 0) return;

    const resolvedSupplierId = editGRN.supplierId?._id || editGRN.supplierId || '';
    const resolvedProductId = editGRN.productId?._id || editGRN.productId || '';

    setSupplierId(resolvedSupplierId);
    setProductId(resolvedProductId);
    setInvoicedQty(String(editGRN.invoicedQty ?? ''));
    setReceivedQty(String(editGRN.receivedQty ?? ''));
    setCondition(editGRN.condition || 'Good');
    setUnit(editGRN.unit || '');
    setNotes(editGRN.notes || '');

    const existingImages = Array.isArray(editGRN.images) && editGRN.images.length > 0
      ? editGRN.images
      : editGRN.image
        ? [editGRN.image]
        : [];
    setImages(existingImages);

    const supplier = allSuppliers.find(s => s._id === resolvedSupplierId);
    if (supplier && supplier.productsSupplied && supplier.productsSupplied.length > 0) {
      const filtered = allProducts.filter(p =>
        supplier.productsSupplied.some(name => name.toLowerCase().trim() === p.name.toLowerCase().trim())
      );
      setFilteredProducts(filtered.length > 0 ? filtered : allProducts);
    } else {
      setFilteredProducts(allProducts);
    }
  }, [editGRN, allSuppliers, allProducts]);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [suppRes, prodRes] = await Promise.all([
        axios.get(`${BASE_URL}/suppliers`, { headers, timeout: 20000 }),
        axios.get(`${BASE_URL}/products`, { headers, timeout: 20000 })
      ]);
      setAllSuppliers(suppRes.data || []);
      const products = prodRes.data.data || prodRes.data || [];
      setAllProducts(Array.isArray(products) ? products : []);
      // Initialize with all products
      setFilteredProducts(Array.isArray(products) ? products : []);
    } catch (err) {
      console.log('Error fetching data:', err);
      Alert.alert('Error', 'Failed to load suppliers and products');
    }
  };

  const pickImage = async (source) => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can upload a maximum of ${MAX_IMAGES} images`);
      return;
    }

    try {
      let result;
      if (source === 'camera') {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission Required', 'Please allow access to your camera.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3]
        });
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission Required', 'Please allow access to your photo gallery.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3]
        });
      }

      if (!result.canceled && result.assets[0]) {
        setImages([...images, result.assets[0]]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSupplierSelect = (id) => {
    setSupplierId(id);
    setProductId('');
    // Filter products by supplier
    const supplier = allSuppliers.find(s => s._id === id);
    if (supplier && supplier.productsSupplied && supplier.productsSupplied.length > 0) {
      const filtered = allProducts.filter(p =>
        supplier.productsSupplied.some(name => name.toLowerCase().trim() === p.name.toLowerCase().trim())
      );
      // If no products match, show all products instead
      setFilteredProducts(filtered.length > 0 ? filtered : allProducts);
    } else {
      setFilteredProducts(allProducts);
    }
    setShowSupplierModal(false);
    setErrors(e => ({ ...e, supplierId: '' }));
  };

  const handleProductSelect = (id) => {
    setProductId(id);
    setShowProductModal(false);
    setErrors(e => ({ ...e, productId: '' }));
  };

  const handleConditionSelect = (cond) => {
    setCondition(cond);
    setShowConditionModal(false);
  };

  const validate = () => {
    const e = {};
    if (!supplierId) e.supplierId = 'Supplier is required';
    if (!productId) e.productId = 'Product is required';
    if (!invoicedQty) {
      e.invoicedQty = 'Invoiced quantity is required';
    } else if (isNaN(Number(invoicedQty)) || Number(invoicedQty) < 0) {
      e.invoicedQty = 'Must be a positive number';
    }
    if (!receivedQty) {
      e.receivedQty = 'Received quantity is required';
    } else if (isNaN(Number(receivedQty)) || Number(receivedQty) < 0) {
      e.receivedQty = 'Must be a positive number';
    }
    if (!unit) e.unit = 'Unit is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      formData.append('supplierId', supplierId);
      formData.append('productId', productId);
      formData.append('invoicedQty', invoicedQty);
      formData.append('receivedQty', receivedQty);
      formData.append('condition', condition);
      formData.append('unit', unit);
      formData.append('notes', notes);

      const existingImages = images.filter(img => typeof img === 'string');
      formData.append('existingImages', JSON.stringify(existingImages));

      // Append images
      images.forEach((img, idx) => {
        if (typeof img === 'string') {
          return;
        }
        formData.append(`grnImages`, {
          uri: img.uri,
          type: 'image/jpeg',
          name: `grn_image_${idx}.jpg`
        });
      });

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = isEditMode
        ? await axios.put(`${BASE_URL}/grn/${editGRN._id}`, formData, { headers, timeout: 20000 })
        : await axios.post(`${BASE_URL}/grn`, formData, { headers, timeout: 20000 });

      if (res.data.success) {
        Alert.alert('Success! ✅', isEditMode ? 'GRN updated successfully.' : 'GRN created successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create GRN. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const selectedSupplier = allSuppliers.find(s => s._id === supplierId)?.supplierName || 'Select Supplier';
  const selectedProduct = allProducts.find(p => p._id === productId)?.name || 'Select Product';

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>{isEditMode ? 'Edit GRN' : 'Create GRN'}</Text>

      {/* Supplier Selection */}
      <Text style={styles.label}>Supplier <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity
        style={[styles.input, styles.selectButton, errors.supplierId && styles.inputError]}
        onPress={() => setShowSupplierModal(true)}
      >
        <Text style={{ color: supplierId ? '#333' : '#999' }}>
          {allSuppliers.find(s => s._id === supplierId)?.supplierName || 'Select Supplier'}
        </Text>
      </TouchableOpacity>
      {errors.supplierId && <Text style={styles.errorText}>{errors.supplierId}</Text>}

      {/* Product Selection */}
      <Text style={styles.label}>Product <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity
        style={[styles.input, styles.selectButton, errors.productId && styles.inputError, !supplierId && { opacity: 0.5 }]}
        onPress={() => supplierId && setShowProductModal(true)}
        disabled={!supplierId}
      >
        <Text style={{ color: productId ? '#333' : '#999' }}>
          {allProducts.find(p => p._id === productId)?.name || 'Select Product'}
        </Text>
      </TouchableOpacity>
      {errors.productId && <Text style={styles.errorText}>{errors.productId}</Text>}

      {/* Invoiced Quantity */}
      <Text style={styles.label}>Invoiced Quantity <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.invoicedQty && styles.inputError]}
        keyboardType="numeric"
        placeholder="e.g. 100"
        value={invoicedQty}
        onChangeText={text => { setInvoicedQty(text); setErrors(e => ({ ...e, invoicedQty: '' })); }}
      />
      {errors.invoicedQty && <Text style={styles.errorText}>{errors.invoicedQty}</Text>}

      {/* Received Quantity */}
      <Text style={styles.label}>Received Quantity <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.receivedQty && styles.inputError]}
        keyboardType="numeric"
        placeholder="e.g. 98"
        value={receivedQty}
        onChangeText={text => { setReceivedQty(text); setErrors(e => ({ ...e, receivedQty: '' })); }}
      />
      {errors.receivedQty && <Text style={styles.errorText}>{errors.receivedQty}</Text>}

      {/* Unit */}
      <Text style={styles.label}>Unit <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity
        style={[styles.input, styles.selectButton, errors.unit && styles.inputError]}
        onPress={() => setShowUnitModal(true)}
      >
        <Text style={{ color: unit ? '#333' : '#999' }}>{unit || 'Select Unit'}</Text>
      </TouchableOpacity>
      {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}

      {/* Condition */}
      <Text style={styles.label}>Condition <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity
        style={[styles.input, styles.selectButton]}
        onPress={() => setShowConditionModal(true)}
      >
        <Text style={{ color: '#333' }}>{condition}</Text>
      </TouchableOpacity>

      {/* Notes */}
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Add any additional notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline={true}
        numberOfLines={4}
      />

      {/* Images */}
      <Text style={styles.label}>Delivery Images <Text style={styles.required}>*</Text></Text>
      <Text style={styles.imageHint}>Upload up to {MAX_IMAGES} images (Camera or Gallery)</Text>

      {/* Image Previews */}
      {images.length > 0 && (
        <View style={styles.imagePreviewContainer}>
          {images.map((img, idx) => (
            <View key={idx} style={styles.imagePreviewWrapper}>
              <Image source={{ uri: typeof img === 'string' ? `${SERVER_URL}/${img}` : img.uri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.imageRemoveBtn}
                onPress={() => removeImage(idx)}
              >
                <Text style={styles.imageRemoveBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Image Upload Buttons */}
      {images.length < MAX_IMAGES && (
        <View style={styles.imageButtonRow}>
          <TouchableOpacity
            style={[styles.imageBtn, styles.imageBtnCamera]}
            onPress={() => pickImage('camera')}
          >
            <Text style={styles.imageBtnText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.imageBtn, styles.imageBtnGallery]}
            onPress={() => pickImage('gallery')}
          >
            <Text style={styles.imageBtnText}>Choose File</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>{isEditMode ? 'Update GRN' : 'Create GRN'}</Text>
        )}
      </TouchableOpacity>

      {/* Supplier Modal - Centered */}
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
                  style={[
                    styles.centeredModalItem,
                    supplierId === item._id && styles.centeredModalItemSelected
                  ]}
                  onPress={() => {
                    setSupplierId(item._id);
                    const supplier = allSuppliers.find(s => s._id === item._id);
                    if (supplier && supplier.productsSupplied && supplier.productsSupplied.length > 0) {
                      const filtered = allProducts.filter(p =>
                        supplier.productsSupplied.some(name => name.toLowerCase().trim() === p.name.toLowerCase().trim())
                      );
                      setFilteredProducts(filtered.length > 0 ? filtered : allProducts);
                    } else {
                      setFilteredProducts(allProducts);
                    }
                    setProductId('');
                    setShowSupplierModal(false);
                    setErrors(e => ({ ...e, supplierId: '' }));
                  }}
                >
                  <Text
                    style={[
                      styles.centeredModalItemText,
                      supplierId === item._id && styles.centeredModalItemTextSelected
                    ]}
                  >
                    {item.supplierName}
                  </Text>
                </TouchableOpacity>
              )}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              maxHeight={300}
            />
          </View>
        </View>
      </Modal>

      {/* Product Modal - Centered */}
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
              data={filteredProducts}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.centeredModalItem,
                    productId === item._id && styles.centeredModalItemSelected
                  ]}
                  onPress={() => {
                    setProductId(item._id);
                    setShowProductModal(false);
                    setErrors(e => ({ ...e, productId: '' }));
                  }}
                >
                  <Text
                    style={[
                      styles.centeredModalItemText,
                      productId === item._id && styles.centeredModalItemTextSelected
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              maxHeight={300}
            />
          </View>
        </View>
      </Modal>

      {/* Condition Modal - Centered */}
      <Modal visible={showConditionModal} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <View style={styles.centeredModalContent}>
            <View style={styles.centeredModalHeader}>
              <Text style={styles.centeredModalTitle}>Select Condition</Text>
              <TouchableOpacity onPress={() => setShowConditionModal(false)}>
                <Text style={styles.centeredModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={CONDITIONS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.centeredModalItem,
                    condition === item && styles.centeredModalItemSelected
                  ]}
                  onPress={() => {
                    setCondition(item);
                    setShowConditionModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.centeredModalItemText,
                      condition === item && styles.centeredModalItemTextSelected
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          </View>
        </View>
      </Modal>

      {/* Unit Modal - Centered */}
      <Modal visible={showUnitModal} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <View style={styles.centeredModalContent}>
            <View style={styles.centeredModalHeader}>
              <Text style={styles.centeredModalTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => setShowUnitModal(false)}>
                <Text style={styles.centeredModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={UNITS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.centeredModalItem,
                    unit === item && styles.centeredModalItemSelected
                  ]}
                  onPress={() => {
                    setUnit(item);
                    setShowUnitModal(false);
                    setErrors(e => ({ ...e, unit: '' }));
                  }}
                >
                  <Text
                    style={[
                      styles.centeredModalItemText,
                      unit === item && styles.centeredModalItemTextSelected
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 20
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333'
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333'
  },
  required: {
    color: '#ff0000'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  inputError: {
    borderColor: '#ff0000'
  },
  selectButton: {
    justifyContent: 'center'
  },
  notesInput: {
    textAlignVertical: 'top',
    paddingVertical: 12
  },
  errorText: {
    color: '#ff0000',
    fontSize: 12,
    marginTop: 4
  },
  imageHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 12,
    gap: 8
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: '48%'
  },
  imagePreview: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#eee'
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff0000',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageRemoveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  imageButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12
  },
  imageBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  imageBtnCamera: {
    backgroundColor: '#6F3B18',
    borderWidth: 1,
    borderColor: '#553019'
  },
  imageBtnGallery: {
    backgroundColor: '#85512C',
    borderWidth: 1,
    borderColor: '#6F3B18'
  },
  imageBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  submitBtn: {
    backgroundColor: '#6F3B18',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#553019'
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  centeredModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxHeight: '70%',
    paddingTop: 16
  },
  centeredModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  centeredModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  centeredModalClose: {
    fontSize: 24,
    color: '#999'
  },
  centeredModalItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  centeredModalItemSelected: {
    backgroundColor: '#E8D4C5'
  },
  centeredModalItemText: {
    fontSize: 16,
    color: '#333'
  },
  centeredModalItemTextSelected: {
    fontWeight: 'bold',
    color: '#6F3B18'
  }
});