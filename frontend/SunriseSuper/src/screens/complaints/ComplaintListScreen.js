import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert, Modal, Pressable } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';

const ComplaintListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('All');
  const [sortNewest, setSortNewest] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickedDate, setPickedDate] = useState(null);
  const [previewUri, setPreviewUri] = useState(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  const clearFilters = () => {
    setFilter('All');
    setPickedDate(null);
    setMineOnly(false);
    setCategoryFilter('All');
    fetchComplaints('All', null, false, 'All');
  };

  const fetchComplaints = async (statusFilter, dateFilter, mineFilter = mineOnly, categoryValue = categoryFilter) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const params = {};
      if (statusFilter && statusFilter !== 'All') params.status = statusFilter;
      if (categoryValue && categoryValue !== 'All') params.category = categoryValue;
      if (dateFilter) params.date = dateFilter;
      const res = await axios.get(`${BASE_URL}/complaints`, { headers: { Authorization: `Bearer ${token}` }, params });
      let list = res.data || [];
      if (mineFilter && user?._id) {
        list = list.filter(c => String(c.raisedBy?._id || c.raisedBy) === String(user._id));
      }
      // local sort by date
      list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      setComplaints(list);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not load complaints');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => fetchComplaints(filter, pickedDate, mineOnly, categoryFilter));
    return unsub;
  }, [navigation, mineOnly, user?._id, categoryFilter]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ViewComplaint', { complaint: item })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={[styles.status, item.status === 'Resolved' ? { backgroundColor: '#4caf50' } : { backgroundColor: '#ff9800' }]}>{item.status}</Text>
      </View>
      <Text numberOfLines={2} style={styles.desc}>{item.description}</Text>
      <Text style={{ color: '#999', marginTop: 6 }}>{new Date(item.createdAt).toLocaleString()}</Text>
      <Text style={{ color: '#555', marginTop: 4, fontWeight: '700' }}>Category: {item.category || 'N/A'}</Text>
      <Text style={{ color: '#666', marginTop: 4, fontWeight: '600' }}>{item.isAnonymous ? 'Raised by: Anonymous' : `Raised by: ${item.raisedBy?.fullName || 'Unknown'}`}</Text>
      {item.evidenceImage && (() => {
        const raw = item.evidenceImage || '';
        const cleaned = raw.replace(/^\.\//, '').replace(/\\/g, '/');
        const imageUri = cleaned.startsWith('http') ? cleaned : `${BASE_URL.replace('/api','')}/${cleaned}`;
        return (
          <TouchableOpacity onPress={() => setPreviewUri(imageUri)}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" onError={(e) => { console.log('Image load error', imageUri, e.nativeEvent); }} />
          </TouchableOpacity>
        );
      })()}
    </TouchableOpacity>
  );

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#d32f2f" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.filterPanel}>
        <View style={styles.filterTopRow}>
          <Text style={styles.filterLabel}>Filters</Text>
          <TouchableOpacity onPress={() => setFiltersCollapsed(v => !v)}>
            <Text style={styles.collapseBtn}>{filtersCollapsed ? 'Show' : 'Minimize'}</Text>
          </TouchableOpacity>
        </View>

        {!filtersCollapsed && (
          <>
        <Text style={styles.filterLabel}>Status</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
        {['All','Open','In Progress','Resolved'].map(f => (
          <TouchableOpacity key={f} style={{ marginRight: 8, marginBottom: 8 }} onPress={() => { setFilter(f); fetchComplaints(f, pickedDate, mineOnly, categoryFilter); }}>
            <Text style={{ padding: 8, borderRadius: 8, backgroundColor: filter === f ? '#d32f2f' : '#fff', color: filter === f ? '#fff' : '#444', borderWidth: 1, borderColor: '#ddd' }}>{f}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={{ marginRight: 8, marginBottom: 8 }} onPress={() => {
          const next = !mineOnly;
          setMineOnly(next);
          fetchComplaints(filter, pickedDate, next, categoryFilter);
        }}>
          <Text style={{ padding: 8, borderRadius: 8, backgroundColor: mineOnly ? '#d32f2f' : '#fff', color: mineOnly ? '#fff' : '#444', borderWidth: 1, borderColor: '#ddd' }}>Raised by me</Text>
        </TouchableOpacity>
        </View>

        <Text style={styles.filterLabel}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {['All', 'Equipment', 'Cleanliness', 'Supplier', 'Staff', 'Other'].map(c => (
            <TouchableOpacity key={c} style={{ marginRight: 8, marginBottom: 8 }} onPress={() => { setCategoryFilter(c); fetchComplaints(filter, pickedDate, mineOnly, c); }}>
              <Text style={{ padding: 8, borderRadius: 8, backgroundColor: categoryFilter === c ? '#d32f2f' : '#fff', color: categoryFilter === c ? '#fff' : '#444', borderWidth: 1, borderColor: '#ddd' }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.cornerRow}>
          <View style={styles.cornerLeftGroup}>
            <TouchableOpacity style={{ marginRight: 8 }} onPress={() => {
            const nextSortNewest = !sortNewest;
            setSortNewest(nextSortNewest);
            setComplaints(prev => [...prev].sort((a,b) => nextSortNewest ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt)));
            }}>
              <Text style={{ padding: 8, borderRadius: 8, backgroundColor: '#fff', color: '#444', borderWidth: 1, borderColor: '#ddd' }}>{sortNewest ? 'Newest' : 'Oldest'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginRight: 8 }} onPress={() => setShowPicker(true)}>
              <Text style={{ padding: 8, borderRadius: 8, backgroundColor: pickedDate ? '#d32f2f' : '#fff', color: pickedDate ? '#fff' : '#444', borderWidth: 1, borderColor: '#ddd' }}>{pickedDate ? new Date(pickedDate).toLocaleDateString() : 'Pick Date'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={{ padding: 8, borderRadius: 8, backgroundColor: '#fff', color: '#d32f2f', borderWidth: 1, borderColor: '#d32f2f', fontWeight: '700' }}>Clear</Text>
          </TouchableOpacity>
        </View>
          </>
        )}
      </View>

      {showPicker && (
        <DateTimePicker
          value={pickedDate ? new Date(pickedDate) : new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowPicker(false);
            if (d) {
              const iso = d.toISOString().slice(0,10);
              setPickedDate(iso);
              fetchComplaints(filter, iso, mineOnly, categoryFilter);
            }
          }}
        />
      )}

      <FlatList data={complaints} keyExtractor={c => c._id} renderItem={renderItem} contentContainerStyle={{ padding: 12 }} />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddComplaint')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={!!previewUri} transparent={true} onRequestClose={() => setPreviewUri(null)}>
        <Pressable style={{ flex:1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setPreviewUri(null)}>
          {previewUri && <Image source={{ uri: previewUri }} style={{ width: '96%', height: '80%', borderRadius: 8 }} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  filterPanel: { paddingHorizontal: 12, paddingTop: 12, borderBottomWidth: 1, borderColor: '#f0f0f0', marginBottom: 4 },
  filterTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterLabel: { fontWeight: '700', color: '#555', marginBottom: 6 },
  collapseBtn: { color: '#d32f2f', fontWeight: '700' },
  cornerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 },
  cornerLeftGroup: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flex: 1 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  title: { fontWeight: '700', fontSize: 16 },
  desc: { color: '#666', marginTop: 6 },
  status: { color: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', fontWeight: '700' },
  image: { width: '100%', height: 160, marginTop: 8, borderRadius: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#d32f2f', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 28 }
});

export default ComplaintListScreen;
