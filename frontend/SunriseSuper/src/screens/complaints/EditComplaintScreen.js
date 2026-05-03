import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator, Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EditComplaintScreen = ({ route, navigation }) => {
  const { complaint } = route.params;
  const [title, setTitle] = useState(complaint.title);
  const [description, setDescription] = useState(complaint.description);
  const [status, setStatus] = useState(complaint.status);
  const [category, setCategory] = useState(complaint.category || 'Equipment');
  const [isAnonymous, setIsAnonymous] = useState(!!complaint.isAnonymous);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(() => {
    if (!complaint.evidenceImage) return null;
    const raw = complaint.evidenceImage;
    const cleaned = raw.replace(/^\.\//, '').replace(/\\/g, '/');
    return cleaned.startsWith('http') ? cleaned : `${BASE_URL.replace('/api','')}/${cleaned}`;
  });

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission needed');
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.4 });
      if (!result.canceled) setImage(result.assets[0].uri);
    } catch (err) { console.log(err); Alert.alert('Image pick failed'); }
  };

  const [previewOpen, setPreviewOpen] = React.useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      // If only status changed, call status endpoint; otherwise send multipart form to edit details
      const form = new FormData();
      form.append('title', title);
      form.append('description', description);
      form.append('category', category);
      form.append('status', status);
      form.append('isAnonymous', String(isAnonymous));
      if (image && image.startsWith('file')) {
        const uriParts = image.split('/');
        const name = uriParts[uriParts.length - 1];
        const fileType = name.split('.').pop();
        form.append('evidenceImage', { uri: image, name, type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}` });
      }
      // send multipart to edit details
      const response = await axios.put(`${BASE_URL}/complaints/${complaint._id}`, form, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } });
      Alert.alert('Updated', 'Complaint updated');
      navigation.replace('ViewComplaint', { complaint: response.data });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, { height: 120 }]} value={description} onChangeText={setDescription} multiline returnKeyType="done" blurOnSubmit onSubmitEditing={Keyboard.dismiss} />

      <Text style={styles.label}>Category</Text>
      <View style={styles.choiceWrap}>
        {['Equipment', 'Cleanliness', 'Supplier', 'Staff', 'Other'].map((c) => (
          <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.choiceBtn, category === c && styles.choiceBtnActive]}>
            <Text style={[styles.choiceText, category === c && styles.choiceTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.anonymousRow} onPress={() => setIsAnonymous(v => !v)}>
        <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
          {isAnonymous ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={styles.anonymousText}>Submit as anonymous</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
        <Text style={{ color: '#d32f2f' }}>{image ? 'Change Photo' : 'Add/Change Photo'}</Text>
      </TouchableOpacity>
      {image && (
        <TouchableOpacity onPress={() => setPreviewOpen(true)}>
          <Image source={{ uri: image }} style={{ width: '100%', height: 180, borderRadius: 8, marginTop: 8 }} resizeMode="cover" />
        </TouchableOpacity>
      )}

      <Modal visible={previewOpen} transparent={true} onRequestClose={() => setPreviewOpen(false)}>
        <Pressable style={{ flex:1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setPreviewOpen(false)}>
          {image && <Image source={{ uri: image }} style={{ width: '96%', height: '86%', borderRadius: 8 }} resizeMode="contain" />}
        </Pressable>
      </Modal>

      <Text style={styles.label}>Status</Text>
      <View style={styles.choiceWrap}>
        {['Open', 'In Progress', 'Resolved'].map(s => (
          <TouchableOpacity key={s} style={[styles.choiceBtn, status === s && styles.choiceBtnActive]} onPress={() => setStatus(s)}>
            <Text style={[styles.choiceText, status === s && styles.choiceTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.btn, loading && { backgroundColor: '#ccc' }]} onPress={handleUpdate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
      </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { fontWeight: '700', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginTop: 8 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  choiceBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 8, marginBottom: 8, backgroundColor: '#fff' },
  choiceBtnActive: { backgroundColor: '#d32f2f', borderColor: '#d32f2f' },
  choiceText: { color: '#444', fontWeight: '600' },
  choiceTextActive: { color: '#fff', fontWeight: '700' },
  anonymousRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#d32f2f', borderColor: '#d32f2f' },
  checkboxMark: { color: '#fff', fontWeight: '700' },
  anonymousText: { color: '#333', fontWeight: '600' },
  btn: { backgroundColor: '#d32f2f', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '700' },
  statusBtn: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', minWidth: 100, alignItems: 'center' }
});

export default EditComplaintScreen;
