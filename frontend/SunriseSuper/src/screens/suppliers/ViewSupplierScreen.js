// ViewSupplierScreen.js
// Shows full details of a single supplier.
// Reached by tapping "View" on a supplier card in SupplierListScreen.

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, Alert
} from 'react-native';
import { BASE_URL, useAuth } from '../../context/AuthContext';

const SERVER_URL = BASE_URL.replace('/api', '');

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View style={styles.infoTextBlock}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

export default function ViewSupplierScreen({ route, navigation }) {
  const { user } = useAuth();
  const { supplier } = route.params;

  const hasValidContract =
    supplier.contractDocument &&
    typeof supplier.contractDocument === 'string' &&
    supplier.contractDocument !== '[object Object]';

  const openDocument = () => {
    if (!hasValidContract) return;
    
    if (supplier.contractDocument.startsWith('http://') || supplier.contractDocument.startsWith('https://')) {
      Linking.openURL(supplier.contractDocument).catch(() => {
        Alert.alert('Error', 'Failed to open the contract document.');
      });
      return;
    }

    const cleanPath = supplier.contractDocument.replace(/\\/g, '/');
    const url = `${SERVER_URL}/${cleanPath}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open the contract document.');
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {supplier.supplierName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.supplierName}>{supplier.supplierName}</Text>
        <View style={[
          styles.statusBadge,
          supplier.status === 'Active' ? styles.statusActive : styles.statusInactive
        ]}>
          <Text style={styles.statusText}>
            {supplier.status === 'Active' ? '✅ Active' : '🔴 Inactive'}
          </Text>
        </View>
      </View>

      {/* Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <InfoRow icon="✉️" label="Email" value={supplier.email} />
        <InfoRow icon="📞" label="Contact Number" value={supplier.contactNumber} />
        <InfoRow icon="📍" label="Address" value={supplier.address} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supply Details</Text>
        <InfoRow
          icon="📦"
          label="Products Supplied"
          value={
            supplier.productsSupplied?.length > 0
              ? supplier.productsSupplied.join(', ')
              : 'Not specified'
          }
        />
      </View>

      {/* Contract Document */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contract Document</Text>
        {hasValidContract ? (
          <TouchableOpacity style={styles.contractBtn} onPress={openDocument}>
            <Text style={styles.contractBtnIcon}>📄</Text>
            <Text style={styles.contractBtnText}>View / Download Contract</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.noDocContainer}>
            <Text style={styles.noDocText}>📎 No contract document uploaded</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => {
            if (user?.role !== 'Admin') {
              Alert.alert('Access Denied', 'Please sign in as admin to do the change');
            } else {
              navigation.navigate('EditSupplier', { supplier });
            }
          }}
        >
          <Text style={styles.actionBtnText}>✏️  Edit Supplier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.backBtn]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.actionBtnText}>← Back to List</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 16, flexGrow: 1 },

  headerCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16, elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  supplierName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  statusActive: { backgroundColor: '#e8f5e9' },
  statusInactive: { backgroundColor: '#ffebee' },
  statusText: { fontSize: 13, fontWeight: '700', color: '#555' },

  section: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#4CAF50',
    marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  infoIcon: { fontSize: 20, marginRight: 12, marginTop: 2 },
  infoTextBlock: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },

  contractBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f8e9', padding: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#c5e1a5',
  },
  contractBtnIcon: { fontSize: 22, marginRight: 10 },
  contractBtnText: { color: '#33691e', fontSize: 15, fontWeight: '700' },
  noDocContainer: {
    padding: 14, backgroundColor: '#f5f5f5', borderRadius: 10,
    alignItems: 'center',
  },
  noDocText: { color: '#aaa', fontSize: 14 },

  actions: { gap: 10, marginTop: 4 },
  actionBtn: {
    padding: 15, borderRadius: 12, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
  },
  editBtn: { backgroundColor: '#1976d2' },
  backBtn: { backgroundColor: '#757575' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
