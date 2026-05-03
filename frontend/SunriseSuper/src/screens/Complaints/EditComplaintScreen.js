import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

const EditComplaintScreen = ({ route, navigation }) => {
  const { complaint } = route.params;

  const [title, setTitle] = useState(complaint.title);
  const [description, setDescription] = useState(complaint.description);
  const [image, setImage] = useState(complaint.proofImage); 
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission Needed', 'Please allow gallery access.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      quality: 0.3, 
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
    if (!title || !description) return Alert.alert('Error', 'Fields cannot be empty');
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      let finalImage = image;

      // Only convert to Base64 if the user selected a brand new image
      if (image && !image.startsWith('data:image')) {
        const base64 = await FileSystem.readAsStringAsync(image, { encoding: 'base64' });
        finalImage = `data:image/jpeg;base64,${base64}`;
      }

      await axios.put(`${BASE_URL}/complaints/${complaint._id}`, 
        { title, description, proofImage: finalImage }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success', 'Complaint updated successfully');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Edit Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Edit Description</Text>
      <TextInput style={[styles.input, {height: 80}]} value={description} onChangeText={setDescription} multiline />

      <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
        <Text style={{color: '#534AB7'}}>{image ? 'Change Proof Photo' : '+ Add Proof Photo'}</Text>
      </TouchableOpacity>

      {image && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={styles.preview} />
          <TouchableOpacity onPress={() => setImage(null)}>
            <Text style={{color: 'red', textAlign: 'center'}}>Remove Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.btn} onPress={handleUpdate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Complaint</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15 },
  imageBtn: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#534AB7', padding: 15, alignItems: 'center', marginBottom: 15, borderRadius: 8 },
  previewContainer: { marginBottom: 20 },
  preview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 5 },
  btn: { backgroundColor: '#534AB7', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default EditComplaintScreen;