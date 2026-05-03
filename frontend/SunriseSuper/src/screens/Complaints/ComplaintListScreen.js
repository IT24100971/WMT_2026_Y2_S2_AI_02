import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

const ComplaintListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchComplaints);
    return unsubscribe;
  }, [navigation]);

  const fetchComplaints = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/complaints`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setComplaints(res.data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const deleteItem = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`${BASE_URL}/complaints/${id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setComplaints(complaints.filter(c => c._id !== id));
    } catch (err) { 
      Alert.alert('Error', 'Could not delete'); 
    }
  };

  const getBadgeColor = (status) => {
    if(status === 'Open') return 'red';
    if(status === 'In Progress') return 'orange';
    if(status === 'Resolved') return 'green';
    return 'gray';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredData = filter === 'All' ? complaints : complaints.filter(c => c.status === filter);

  if (loading) return <ActivityIndicator size="large" color="#534AB7" style={{flex: 1, marginTop: 50}} />;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {['All', 'Open', 'In Progress', 'Resolved'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, filter === tab && styles.activeTab]} 
            onPress={() => setFilter(tab)}
          >
            <Text style={filter === tab ? {color:'white'} : {color:'#666'}}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => {
              if (user?.role === 'Admin') {
                navigation.navigate('EditComplaint', { complaint: item });
              } else {
                const raised = formatDateTime(item.createdAt);
                const resolved = item.resolvedAt ? `\nResolved: ${formatDateTime(item.resolvedAt)}` : '';
                Alert.alert(
                  'Complaint Detail', 
                  `Status: ${item.status}\nRaised: ${raised}${resolved}\n\n${item.description}`
                );
              }
            }}
          >
            <View style={styles.headerRow}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={[styles.badge, { backgroundColor: getBadgeColor(item.status) }]}>
                <Text style={{color:'white', fontSize: 10, fontWeight: 'bold'}}>{item.status}</Text>
              </View>
            </View>
            
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>Created: {formatDateTime(item.createdAt)}</Text>
              {item.status === 'Resolved' && item.resolvedAt && (
                <Text style={styles.dateText}>Resolved: {formatDateTime(item.resolvedAt)}</Text>
              )}
            </View>

            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
            
            {/* Action Buttons Row */}
            <View style={styles.actionRow}>
              {user?.role === 'Admin' && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => {
                  Alert.alert('Confirm', 'Delete this complaint?', [
                    { text: 'Cancel' }, { text: 'Delete', onPress: () => deleteItem(item._id) }
                  ]);
                }}>
                  <Text style={{color: 'red', fontSize: 14, fontWeight: 'bold'}}>Delete</Text>
                </TouchableOpacity>
              )}

              {user?.role !== 'Admin' && item.status === 'Open' && (
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => navigation.navigate('EditComplaint', { complaint: item })}
                >
                  <Text style={{color: '#534AB7', fontSize: 14, fontWeight: 'bold'}}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddComplaint')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  tabs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  tab: { padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 20 },
  activeTab: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  dateContainer: { marginBottom: 8 },
  dateText: { fontSize: 11, color: '#888', fontStyle: 'italic' },
  desc: { color: '#444', marginBottom: 10, fontSize: 14 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5 },
  actionBtn: { padding: 5, marginLeft: 15 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#534AB7', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  fabText: { color: '#fff', fontSize: 24, fontWeight: 'bold' }
});

export default ComplaintListScreen;