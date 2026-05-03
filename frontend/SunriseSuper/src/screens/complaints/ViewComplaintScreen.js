import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, Pressable } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../../api/config';
import { useAuth } from '../../context/AuthContext';

const ViewComplaintScreen = ({ route, navigation }) => {
  const { complaint } = route.params;
  const { user } = useAuth();
  const [local, setLocal] = useState(complaint);

  const isOwner = user && String(user._id) === String(complaint.raisedBy._id);
  const isAdminOrSupervisor = user && (user.role === 'Admin' || user.role === 'Supervisor');

  const handleDelete = async () => {
    Alert.alert('Confirm', 'Delete this complaint?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await axios.delete(`${BASE_URL}/complaints/${complaint._id}`);
          Alert.alert('Deleted');
          navigation.goBack();
        } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Delete failed'); }
      }}
    ]);
  };

  const changeStatus = async (status) => {
    try {
      const res = await axios.put(`${BASE_URL}/complaints/${complaint._id}/status`, { status });
      setLocal(res.data);
      Alert.alert('Status updated');
    } catch (err) { Alert.alert('Error', err.response?.data?.message || 'Status update failed'); }
  };

  const [previewOpen, setPreviewOpen] = React.useState(false);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{local.title}</Text>
      </View>
      <View style={styles.chipRow}>
        <View style={styles.categoryChip}><Text style={styles.categoryChipText}>{local.category}</Text></View>
        <View style={[styles.categoryChip, local.status === 'Resolved' ? styles.statusResolved : styles.statusOpen]}>
          <Text style={[styles.categoryChipText, { color: '#fff' }]}>{local.status}</Text>
        </View>
      </View>
      <Text style={styles.meta}>Raised by: {local.isAnonymous ? 'Anonymous' : local.raisedBy?.fullName}</Text>
      <Text style={styles.desc}>{local.description}</Text>
      {local.evidenceImage && (() => {
        const raw = local.evidenceImage || '';
        const cleaned = raw.replace(/^\.\//, '').replace(/\\/g, '/');
        const imageUri = cleaned.startsWith('http') ? cleaned : `${BASE_URL.replace('/api','')}/${cleaned}`;
        return (
          <TouchableOpacity onPress={() => setPreviewOpen(true)}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" onError={(e) => console.log('View image load error', imageUri, e.nativeEvent)} />
          </TouchableOpacity>
        );
      })()}

      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        {isOwner && (
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('EditComplaint', { complaint: local })}>
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
        )}
        {(isAdminOrSupervisor || isOwner) && (
          <TouchableOpacity style={[styles.button, { backgroundColor: '#4caf50' }]} onPress={() => changeStatus('Resolved')}>
            <Text style={[styles.buttonText, { color: '#fff' }]}>Mark Resolved</Text>
          </TouchableOpacity>
        )}
        {isAdminOrSupervisor && (
          <TouchableOpacity style={[styles.button, { backgroundColor: '#ff9800' }]} onPress={() => changeStatus('In Progress')}>
            <Text style={[styles.buttonText, { color: '#fff' }]}>Mark In Progress</Text>
          </TouchableOpacity>
        )}
      </View>

      {(isAdminOrSupervisor || isOwner) && (
        <TouchableOpacity style={[styles.button, { backgroundColor: '#d32f2f', marginTop: 12 }]} onPress={handleDelete}>
          <Text style={[styles.buttonText, { color: '#fff' }]}>Delete</Text>
        </TouchableOpacity>
      )}

      <Modal visible={previewOpen} transparent={true} onRequestClose={() => setPreviewOpen(false)}>
        <Pressable style={{ flex:1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setPreviewOpen(false)}>
          {(() => {
            const raw = local.evidenceImage || '';
            const cleaned = raw.replace(/^\.\//, '').replace(/\\/g, '/');
            const imageUri = cleaned.startsWith('http') ? cleaned : `${BASE_URL.replace('/api','')}/${cleaned}`;
            return <Image source={{ uri: imageUri }} style={{ width: '96%', height: '86%', borderRadius: 8 }} resizeMode="contain" />;
          })()}
        </Pressable>
      </Modal>

      <View style={{ marginTop: 18 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>History</Text>
        {local.history && local.history.length ? local.history.slice().reverse().map((h, i) => (
          <View key={i} style={{ paddingVertical: 6, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontSize: 13 }}>{h.from} → {h.to}</Text>
            <Text style={{ color: '#666', fontSize: 12 }}>{h.role} • {new Date(h.at).toLocaleString()}</Text>
            {h.note && <Text style={{ color: '#444', fontSize: 12 }}>{h.note}</Text>}
          </View>
        )) : <Text style={{ color: '#666' }}>No history yet</Text>}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  chipRow: { flexDirection: 'row', marginTop: 8, marginBottom: 2 },
  categoryChip: { backgroundColor: '#f4f4f4', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8 },
  categoryChipText: { color: '#444', fontWeight: '700', fontSize: 12 },
  statusResolved: { backgroundColor: '#4caf50' },
  statusOpen: { backgroundColor: '#ff9800' },
  meta: { color: '#666', marginTop: 6 },
  desc: { marginTop: 12, color: '#333' },
  image: { width: '100%', height: 260, marginTop: 12, borderRadius: 8 },
  button: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 8, marginTop: 6 },
  buttonText: { color: '#d32f2f', fontWeight: '700' }
});

export default ViewComplaintScreen;
