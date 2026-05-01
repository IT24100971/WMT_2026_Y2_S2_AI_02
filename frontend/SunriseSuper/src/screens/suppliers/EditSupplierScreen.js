import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Linking, Modal
} from 'react-native';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { BASE_URL } from '../../context/AuthContext';

const SERVER_URL = BASE_URL.replace('/api', '');
const STATUS_OPTIONS = ['Active', 'Inactive'];

export default function EditSupplierScreen({ route, navigation }) {
  const { supplier } = route.params;

  const [supplierName, setSupplierName] = useState(supplier.supplierName || '');
  const [contactNumber, setContactNumber] = useState(supplier.contactNumber || '');
  const [email, setEmail] = useState(supplier.email || '');
  const [address, setAddress] = useState(supplier.address || '');
  const [productsSupplied, setProductsSupplied] = useState(
    supplier.productsSupplied ? supplier.productsSupplied.join(', ') : ''
  );
  const [status, setStatus] = useState(supplier.status || 'Active');
  
  // existing document path if any
  const [existingDoc, setExistingDoc] = useState(supplier.contractDocument || null);
  // newly selected document object
  const [document, setDocument] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setDocument(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const validate = () => {
    const e = {};
    if (!supplierName.trim()) e.supplierName = 'Supplier name is required';
    if (!contactNumber.trim()) e.contactNumber = 'Contact number is required';
    if (!email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Invalid email format';
    }
    if (!address.trim()) e.address = 'Address is required';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('supplierName', supplierName);
      formData.append('contactNumber', contactNumber);
      formData.append('email', email);
      formData.append('address', address);
      formData.append('status', status);

      if (productsSupplied.trim()) {
        const products = productsSupplied.split(',').map(p => p.trim()).filter(p => p);
        products.forEach(p => {
          formData.append('productsSupplied', p);
        });
      }

      if (document) {
        // On web, blob URIs must be fetched and converted to a Blob
        // before being appended to FormData. The {uri, type, name} pattern
        // only works on React Native native — on web it stringifies to [object Object].
        if (typeof document.uri === 'string' && document.uri.startsWith('blob:')) {
          const blobRes = await fetch(document.uri);
          const blob = await blobRes.blob();
          formData.append('contractDocument', blob, document.name || 'contract.pdf');
        } else {
          formData.append('contractDocument', {
            uri: document.uri,
            type: document.mimeType || 'application/pdf',
            name: document.name || 'contract.pdf',
          });
        }
      }

      await axios.put(`${BASE_URL}/suppliers/${supplier._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowSuccess(true);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update supplier. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const openExistingDocument = () => {
    if (!existingDoc) return;
    const url = `${SERVER_URL}/${existingDoc.replace(/\\/g, '/')}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Failed to open document.");
    });
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.sectionTitle}>Edit Supplier Details</Text>

      <Text style={styles.label}>Supplier Name <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.supplierName && styles.inputError]}
        placeholder="e.g. ABC Distributors"
        value={supplierName}
        onChangeText={text => { setSupplierName(text); setErrors(e => ({ ...e, supplierName: '' })); }}
      />
      {errors.supplierName && <Text style={styles.errorText}>{errors.supplierName}</Text>}

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="email@example.com"
            value={email}
            onChangeText={text => { setEmail(text); setErrors(e => ({ ...e, email: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Contact No. <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.contactNumber && styles.inputError]}
            placeholder="0771234567"
            value={contactNumber}
            onChangeText={text => { setContactNumber(text); setErrors(e => ({ ...e, contactNumber: '' })); }}
            keyboardType="phone-pad"
          />
          {errors.contactNumber && <Text style={styles.errorText}>{errors.contactNumber}</Text>}
        </View>
      </View>

      <Text style={styles.label}>Address <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, styles.textArea, errors.address && styles.inputError]}
        placeholder="Enter physical address..."
        value={address}
        onChangeText={text => { setAddress(text); setErrors(e => ({ ...e, address: '' })); }}
        multiline
        numberOfLines={3}
      />
      {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

      <Text style={styles.label}>Products Supplied</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Rice, Oil, Flour (comma separated)"
        value={productsSupplied}
        onChangeText={setProductsSupplied}
      />
      <Text style={styles.helperText}>Separate multiple products with commas.</Text>

      <Text style={styles.label}>Status</Text>
      <View style={styles.optionRow}>
        {STATUS_OPTIONS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.optionBtn, status === s && styles.optionBtnActive]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.optionBtnText, status === s && styles.optionBtnTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Contract Document</Text>
      {existingDoc && !document && (
        <View style={styles.existingDocContainer}>
          <Text style={styles.existingDocText}>Current Document:</Text>
          <TouchableOpacity style={styles.viewDocBtn} onPress={openExistingDocument}>
            <Text style={styles.viewDocBtnText}>📄 View Existing Contract</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.docPicker} onPress={pickDocument}>
        {document ? (
          <View style={styles.docInfo}>
            <Text style={styles.docIcon}>📄</Text>
            <Text style={styles.docName} numberOfLines={1}>{document.name}</Text>
          </View>
        ) : (
          <View style={styles.docPickerPlaceholder}>
            <Text style={styles.docPickerIcon}>📎</Text>
            <Text style={styles.docPickerText}>
              {existingDoc ? 'Tap to replace contract file' : 'Tap to select contract file'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {document && (
        <TouchableOpacity onPress={() => setDocument(null)}>
          <Text style={styles.removeDocText}>✕ Remove selected document</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>Update Supplier</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.modalText}>Supplier updated successfully.</Text>
            <TouchableOpacity 
              style={styles.modalBtn} 
              onPress={() => { setShowSuccess(false); navigation.goBack(); }}
            >
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16, flexGrow: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 14 },
  required: { color: '#d32f2f' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 11, fontSize: 14, backgroundColor: '#fafafa', color: '#333',
  },
  inputError: { borderColor: '#d32f2f' },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', marginTop: 2 },
  helperText: { fontSize: 11, color: '#888', marginTop: 4 },
  optionRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  optionBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f5f5f5',
  },
  optionBtnActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  optionBtnText: { color: '#555', fontSize: 13, fontWeight: '500' },
  optionBtnTextActive: { color: '#fff', fontWeight: '700' },
  existingDocContainer: { marginBottom: 10, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 },
  existingDocText: { fontSize: 13, color: '#555', marginBottom: 6 },
  viewDocBtn: {
    backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#c5e1a5'
  },
  viewDocBtnText: { color: '#33691e', fontSize: 13, fontWeight: '600' },
  docPicker: {
    borderWidth: 2, borderColor: '#4CAF50', borderStyle: 'dashed',
    borderRadius: 10, overflow: 'hidden', marginTop: 4, padding: 20,
    backgroundColor: '#f9fbe7'
  },
  docPickerPlaceholder: { alignItems: 'center' },
  docPickerIcon: { fontSize: 32, marginBottom: 8 },
  docPickerText: { color: '#4CAF50', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  docInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  docIcon: { fontSize: 24, marginRight: 8 },
  docName: { color: '#33691e', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  removeDocText: { color: '#d32f2f', fontSize: 13, marginTop: 8, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#4CAF50', padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#d32f2f', fontSize: 12, marginTop: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 16, width: '80%', maxWidth: 350, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  modalIcon: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  modalText: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  modalBtn: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 8 },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
