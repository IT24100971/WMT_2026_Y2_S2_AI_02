import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const AddComplaintScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [category, setCategory] = useState('Equipment');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permission Needed', 'Please allow gallery access to upload proof.');
      }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.3 });
      if (!result.canceled) setImage(result.assets[0].uri);
    } catch (error) {
      console.log('Picker Error:', error);
      Alert.alert('Error', error.message || 'Could not open image gallery.');
    }
  };

  const handleSubmit = async () => {
    if (!title || !description) return Alert.alert('Error', 'Fields required');
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('isAnonymous', isAnonymous ? 'true' : 'false');
      if (image) {
        const uriParts = image.split('/');
        const name = uriParts[uriParts.length - 1];
        const fileType = name.split('.').pop();
        formData.append('evidenceImage', { uri: image, name: name, type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}` });
      }
      const response = await axios.post(`${BASE_URL}/complaints`, formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } });
      Alert.alert('Success', 'Complaint submitted successfully');
      navigation.replace('ViewComplaint', { complaint: response.data });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Enter title" />

      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, { height: 100 }]} value={description} onChangeText={setDescription} multiline placeholder="Enter details" />

      <Text style={[styles.label, { marginTop: 6 }]}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        {['Equipment', 'Cleanliness', 'Supplier', 'Staff', 'Other'].map((c) => (
          <TouchableOpacity key={c} onPress={() => setCategory(c)} style={{ padding: 8, marginRight: 8, borderRadius: 8, borderWidth: 1, borderColor: category === c ? '#d32f2f' : '#ddd' }}>
            <Text style={{ color: category === c ? '#d32f2f' : '#444', fontWeight: category === c ? '700' : '600' }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.anonymousRow} onPress={() => setIsAnonymous(v => !v)}>
        <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
          {isAnonymous ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={styles.anonymousText}>Submit as anonymous</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.imageBtn} onPress={pickImage} disabled={loading}>
        <Text style={{ color: '#d32f2f', fontWeight: '600' }}>{image ? '✅ Photo Selected (Tap to Change)' : '+ Add Proof Image'}</Text>
      </TouchableOpacity>

      {image && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={styles.preview} />
          <TouchableOpacity onPress={() => setImage(null)}>
            <Text style={{ color: '#d32f2f', textAlign: 'center' }}>Remove Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={[styles.btn, loading && { backgroundColor: '#ccc' }]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Complaint</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15 },
  imageBtn: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#d32f2f', padding: 20, alignItems: 'center', marginBottom: 15, borderRadius: 8 },
  previewContainer: { marginBottom: 20 },
  preview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 5 },
  anonymousRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#d32f2f', borderColor: '#d32f2f' },
  checkboxMark: { color: '#fff', fontWeight: '700' },
  anonymousText: { color: '#333', fontWeight: '600' },
  btn: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default AddComplaintScreen;
