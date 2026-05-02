import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy'; // Correct legacy import

const AddComplaintScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Updated function to handle permissions and the new MediaType syntax[cite: 5]
  const pickImage = async () => {
    try {
      // 1. Explicitly request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permission Needed', 'Please allow gallery access to upload proof.');
      }

      // 2. Launch the picker with updated syntax
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images, // Use .MediaType instead of .MediaTypeOptions[cite: 5]
        allowsEditing: true,
        quality: 0.3,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Picker Error: ", error);
      Alert.alert('Error', 'Could not open image gallery.');
    }
  };

  const handleSubmit = async () => {
    if (!title || !description) return Alert.alert('Error', 'Fields required');
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      let base64Image = null;

      if (image) {
        // Use legacy FileSystem to avoid warnings[cite: 5]
        const base64 = await FileSystem.readAsStringAsync(image, { encoding: 'base64' });
        base64Image = `data:image/jpeg;base64,${base64}`;
      }

      await axios.post(`${BASE_URL}/complaints`, 
        { title, description, proofImage: base64Image }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success', 'Complaint submitted successfully');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput 
        style={styles.input} 
        value={title} 
        onChangeText={setTitle} 
        placeholder="Enter title"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput 
        style={[styles.input, {height: 80}]} 
        value={description} 
        onChangeText={setDescription} 
        multiline 
        placeholder="Enter details"
      />

      {/* --- ADD PROOF BUTTON --- */}
      <TouchableOpacity 
        style={styles.imageBtn} 
        onPress={pickImage} // Ensure this matches the function name exactly
        disabled={loading}
      >
        <Text style={{color: '#534AB7', fontWeight: '600'}}>
          {image ? '✅ Photo Selected (Tap to Change)' : '+ Add Proof Image'}
        </Text>
      </TouchableOpacity>

      {image && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={styles.preview} />
          <TouchableOpacity onPress={() => setImage(null)}>
            <Text style={{color: 'red', textAlign: 'center'}}>Remove Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.btn, loading && {backgroundColor: '#ccc'}]} 
        onPress={handleSubmit} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Submit Complaint</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15 },
  imageBtn: { 
    borderStyle: 'dashed', 
    borderWidth: 1, 
    borderColor: '#534AB7', 
    padding: 20, 
    alignItems: 'center', 
    marginBottom: 15,
    borderRadius: 8 
  },
  previewContainer: { marginBottom: 20 },
  preview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 5 },
  btn: { backgroundColor: '#534AB7', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default AddComplaintScreen;