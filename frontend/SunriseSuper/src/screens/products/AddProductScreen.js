// AddProductScreen.js
// Form screen for creating a new product.
// Uses expo-image-picker to pick an image from the phone's gallery.
// Sends data as FormData (not JSON) because we're uploading a file + text together.
// JSON cannot carry binary file data — FormData is the correct format for this.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image, ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from '../../context/AuthContext';

const CATEGORIES = [
  'Rice', 'Oil', 'Dairy', 'Bakery', 'Beverage',
  'Flour', 'Sugar', 'Snacks', 'Grocery', 'Cleaning',
  'Personal Care', 'Frozen', 'Fruits & Veg', 'Condiments', 'Baby'
];
const UNITS = ['kg', 'L', 'pcs'];

export default function AddProductScreen({ navigation }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null); // stores the picked image object
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Opens the phone's image gallery after requesting permission.
  // We intentionally do NOT pass a mediaTypes option — expo-image-picker
  // defaults to images when omitted, and this avoids the silent crash caused
  // by the deprecated MediaTypeOptions.Images or the wrong-case MediaType.Images.
  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo gallery.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7, // compress to 70% to reduce upload size and speed up transfer
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  // Validates all required fields and returns true if everything is fine
  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Product name is required';
    if (!category) e.category = 'Please select a category';
    if (!barcode.trim()) e.barcode = 'Barcode is required';
    if (!unit) e.unit = 'Please select a unit';
    if (!sellingPrice) {
      e.sellingPrice = 'Selling price is required';
    } else if (isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0) {
      e.sellingPrice = 'Selling price must be a valid positive number';
    }
    if (!costPrice) {
      e.costPrice = 'Cost price is required';
    } else if (isNaN(Number(costPrice)) || Number(costPrice) < 0) {
      e.costPrice = 'Cost price must be a valid positive number';
    }
    setErrors(e);
    return Object.keys(e).length === 0; // true = no errors
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      // FormData must be used when sending a file + text fields together.
      // Regular axios.post with a plain object only sends JSON, which cannot
      // carry binary image data. The backend's multer middleware expects
      // multipart/form-data which is exactly what FormData produces.
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('barcode', barcode);
      formData.append('unit', unit);
      formData.append('sellingPrice', sellingPrice);
      formData.append('costPrice', costPrice);
      formData.append('description', description);

      if (image) {
        // The image must be appended as an object with uri, type, and name.
        // This is how React Native tells axios what file to attach.
        formData.append('image', {
          uri: image.uri,
          type: 'image/jpeg',
          name: 'product_image.jpg',
        });
      }

      await axios.post(`${BASE_URL}/products`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success! ✅', 'Product created successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create product. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Product Details</Text>

      {/* Product Name */}
      <Text style={styles.label}>Product Name <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.name && styles.inputError]}
        placeholder="e.g. Premium Basmati Rice"
        value={name}
        onChangeText={text => { setName(text); setErrors(e => ({ ...e, name: '' })); }}
      />
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

      {/* Category */}
      <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
      <View style={styles.optionRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.optionBtn, category === c && styles.optionBtnActive]}
            onPress={() => { setCategory(c); setErrors(e => ({ ...e, category: '' })); }}
          >
            <Text style={[styles.optionBtnText, category === c && styles.optionBtnTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

      {/* Barcode */}
      <Text style={styles.label}>Barcode <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.barcode && styles.inputError]}
        placeholder="e.g. BC001"
        value={barcode}
        onChangeText={text => { setBarcode(text); setErrors(e => ({ ...e, barcode: '' })); }}
      />
      {errors.barcode && <Text style={styles.errorText}>{errors.barcode}</Text>}

      {/* Unit */}
      <Text style={styles.label}>Unit <Text style={styles.required}>*</Text></Text>
      <View style={styles.optionRow}>
        {UNITS.map(u => (
          <TouchableOpacity
            key={u}
            style={[styles.optionBtn, unit === u && styles.optionBtnActive]}
            onPress={() => { setUnit(u); setErrors(e => ({ ...e, unit: '' })); }}
          >
            <Text style={[styles.optionBtnText, unit === u && styles.optionBtnTextActive]}>{u}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}

      {/* Prices */}
      <View style={styles.priceRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Selling Price (Rs.) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.sellingPrice && styles.inputError]}
            placeholder="e.g. 150"
            value={sellingPrice}
            onChangeText={text => { setSellingPrice(text); setErrors(e => ({ ...e, sellingPrice: '' })); }}
            keyboardType="numeric"
          />
          {errors.sellingPrice && <Text style={styles.errorText}>{errors.sellingPrice}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Cost Price (Rs.) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.costPrice && styles.inputError]}
            placeholder="e.g. 120"
            value={costPrice}
            onChangeText={text => { setCostPrice(text); setErrors(e => ({ ...e, costPrice: '' })); }}
            keyboardType="numeric"
          />
          {errors.costPrice && <Text style={styles.errorText}>{errors.costPrice}</Text>}
        </View>
      </View>

      {/* Description */}
      <Text style={styles.label}>Description (Optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Enter product description..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      {/* Image Picker */}
      <Text style={styles.label}>Product Image</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.previewImage} />
        ) : (
          <View style={styles.imagePickerPlaceholder}>
            <Text style={styles.imagePickerIcon}>📷</Text>
            <Text style={styles.imagePickerText}>Tap to select image from gallery</Text>
          </View>
        )}
      </TouchableOpacity>
      {image && (
        <TouchableOpacity onPress={() => setImage(null)}>
          <Text style={styles.removeImageText}>✕ Remove image</Text>
        </TouchableOpacity>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>Create Product</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 14 },
  required: { color: '#d32f2f' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 11, fontSize: 14, backgroundColor: '#fafafa', color: '#333',
  },
  inputError: { borderColor: '#d32f2f' },
  textArea: { height: 80, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  optionBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f5f5f5',
  },
  optionBtnActive: { backgroundColor: '#ff6b00', borderColor: '#ff6b00' },
  optionBtnText: { color: '#555', fontSize: 13, fontWeight: '500' },
  optionBtnTextActive: { color: '#fff', fontWeight: '700' },
  priceRow: { flexDirection: 'row', marginTop: 2 },
  imagePicker: {
    borderWidth: 2, borderColor: '#ff6b00', borderStyle: 'dashed',
    borderRadius: 10, overflow: 'hidden', marginTop: 4,
  },
  imagePickerPlaceholder: { padding: 30, alignItems: 'center' },
  imagePickerIcon: { fontSize: 36, marginBottom: 8 },
  imagePickerText: { color: '#ff6b00', fontWeight: '600', fontSize: 14 },
  previewImage: { width: '100%', height: 200 },
  removeImageText: { color: '#d32f2f', fontSize: 13, marginTop: 6, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#ff6b00', padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#d32f2f', fontSize: 12, marginTop: 3 },
});
