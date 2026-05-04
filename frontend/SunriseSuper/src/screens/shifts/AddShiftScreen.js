// AddShiftScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal,
  FlatList,
} from 'react-native';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../context/AuthContext';

const SHIFT_TYPES = ['Morning', 'Evening', 'Night'];
const STATUSES = ['Scheduled', 'Completed', 'Absent'];

export default function AddShiftScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [shiftType, setShiftType] = useState('');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showStartTimeModal, setShowStartTimeModal] = useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = useState(false);
  const [startTimeHours, setStartTimeHours] = useState('06');
  const [startTimeMinutes, setStartTimeMinutes] = useState('00');
  const [endTimeHours, setEndTimeHours] = useState('14');
  const [endTimeMinutes, setEndTimeMinutes] = useState('00');
  const [status, setStatus] = useState('Scheduled');
  const [notes, setNotes] = useState('');
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      console.log('🔑 Token exists:', token ? 'YES' : 'NO');
      
      if (!token) {
        Alert.alert('Error', 'Please login again', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
        return;
      }

      console.log('📡 Fetching users from:', `${BASE_URL}/auth/users`);
      
      const response = await axios.get(`${BASE_URL}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Users fetched:', response.data.length);
      setUsers(response.data);
    } catch (error) {
      console.log('❌ Error fetching users:', error.response?.status, error.response?.data);
      
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'Only Admin and Supervisor roles can create shifts');
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to load employees');
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const pickAttendanceReport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length) {
        setAttendanceReport(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick attendance document');
    }
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const formatTime = (date) => {
    return date.toTimeString().split(' ')[0].slice(0, 5);
  };

  // Format time with AM/PM for display
  const formatTimeDisplay = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    const displayHours = date.getHours() % 12 || 12;
    return `${String(displayHours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Set times based on shift type
  const setShiftTimes = (type) => {
    const newStartTime = new Date();
    const newEndTime = new Date();
    
    let startHours, startMins, endHours, endMins;
    
    switch(type) {
      case 'Morning':
        startHours = '06'; startMins = '00';
        endHours = '14'; endMins = '00';
        break;
      case 'Evening':
        startHours = '14'; startMins = '00';
        endHours = '22'; endMins = '00';
        break;
      case 'Night':
        startHours = '22'; startMins = '00';
        endHours = '06'; endMins = '00';
        break;
      default:
        return;
    }
    
    newStartTime.setHours(Number(startHours), Number(startMins), 0);
    newEndTime.setHours(Number(endHours), Number(endMins), 0);
    
    setStartTime(newStartTime);
    setEndTime(newEndTime);
    setStartTimeHours(startHours);
    setStartTimeMinutes(startMins);
    setEndTimeHours(endHours);
    setEndTimeMinutes(endMins);
  };

  const applyStartTime = () => {
    const hh = startTimeHours === '' ? '00' : String(startTimeHours).padStart(2, '0');
    const mm = startTimeMinutes === '' ? '00' : String(startTimeMinutes).padStart(2, '0');
    const newTime = new Date();
    newTime.setHours(Number(hh), Number(mm), 0);
    setStartTime(newTime);
    setStartTimeHours(hh);
    setStartTimeMinutes(mm);
    setShowStartTimeModal(false);
  };

  const applyEndTime = () => {
    const hh = endTimeHours === '' ? '00' : String(endTimeHours).padStart(2, '0');
    const mm = endTimeMinutes === '' ? '00' : String(endTimeMinutes).padStart(2, '0');
    const newTime = new Date();
    newTime.setHours(Number(hh), Number(mm), 0);
    setEndTime(newTime);
    setEndTimeHours(hh);
    setEndTimeMinutes(mm);
    setShowEndTimeModal(false);
  };

  // Validate time range
  const validateTimes = () => {
    if (startTime >= endTime && !(shiftType === 'Night')) {
      return 'Start time must be before end time';
    }
    return '';
  };

  const validate = () => {
    const e = {};
    if (!selectedUserId) e.userId = 'Please select an employee';
    if (!shiftType) e.shiftType = 'Please select shift type';
    
    const timeError = validateTimes();
    if (timeError) e.time = timeError;
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      // Check for overlapping shifts for this user on the same date
      try {
        const resp = await axios.get(`${BASE_URL}/shifts`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { userId: selectedUserId, date: formatDate(date) }
        });
        const existing = resp.data || [];

        const toMillis = (d) => d.getTime();
        // normalize new shift times to the selected date
        const newStart = new Date(date);
        newStart.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        const newEnd = new Date(date);
        newEnd.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
        if (newEnd <= newStart) {
          // assume end is next day for overnight/night shifts
          newEnd.setDate(newEnd.getDate() + 1);
        }

        const overlaps = existing.some(s => {
          const sStartParts = s.startTime ? s.startTime.split(':') : ['0','0'];
          const sEndParts = s.endTime ? s.endTime.split(':') : ['0','0'];
          const sStart = new Date(date);
          sStart.setHours(Number(sStartParts[0]), Number(sStartParts[1]), 0, 0);
          const sEnd = new Date(date);
          sEnd.setHours(Number(sEndParts[0]), Number(sEndParts[1]), 0, 0);
          if (sEnd <= sStart) sEnd.setDate(sEnd.getDate() + 1);

          return !(toMillis(newEnd) <= toMillis(sStart) || toMillis(newStart) >= toMillis(sEnd));
        });

        if (overlaps) {
          Alert.alert('Conflict', 'Selected employee has another shift that overlaps on this date.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('Overlap check failed:', err?.response?.data || err.message);
        // proceed — server may be down; but warn
      }

      // Prevent creating shifts in the past for same-day
      const now = new Date();
      const todayStr = formatDate(now);
      if (formatDate(date) === todayStr) {
        const startMillis = new Date(date);
        startMillis.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        if (startMillis < now) {
          Alert.alert('Invalid time', 'Start time cannot be in the past.');
          setLoading(false);
          return;
        }
      }
      
      const formData = new FormData();
      formData.append('userId', selectedUserId);
      formData.append('date', formatDate(date));
      formData.append('shiftType', shiftType);
      formData.append('startTime', formatTime(startTime));
      formData.append('endTime', formatTime(endTime));
      formData.append('status', status);
      formData.append('notes', notes);

      if (attendanceReport) {
        formData.append('attendanceReport', {
          uri: attendanceReport.uri,
          type: attendanceReport.mimeType || 'application/octet-stream',
          name: attendanceReport.name || 'attendance-document',
        });
      }

      const response = await axios.post(`${BASE_URL}/shifts`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      Alert.alert('Success! ✅', 'Shift created successfully.', [
        { text: 'OK', onPress: () => {
          navigation.replace('Shifts');
        }},
      ]);
    } catch (err) {
      console.log('Submit error:', err.response?.data);
      const message = err.response?.data?.message || 'Failed to create shift.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const renderTimeModal = (isStart) => {
    const hours = isStart ? startTimeHours : endTimeHours;
    const minutes = isStart ? startTimeMinutes : endTimeMinutes;
    const setHours = isStart ? setStartTimeHours : setEndTimeHours;
    const setMinutes = isStart ? setStartTimeMinutes : setEndTimeMinutes;
    const onApply = isStart ? applyStartTime : applyEndTime;
    const isVisible = isStart ? showStartTimeModal : showEndTimeModal;
    const setVisible = isStart ? setShowStartTimeModal : setShowEndTimeModal;

    return (
      <Modal visible={isVisible} animationType="fade" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '80%' }]}>
            <Text style={styles.modalTitle}>{isStart ? 'Set Start Time' : 'Set End Time'}</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 20 }}>
              <TextInput
                style={[styles.timeInput]}
                placeholder="HH"
                value={hours}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  if (num === '' || (Number(num) >= 0 && Number(num) <= 23)) {
                    setHours(num);
                  }
                }}
                maxLength={2}
                keyboardType="number-pad"
              />
              <Text style={{ fontSize: 24, marginHorizontal: 10 }}>:</Text>
              <TextInput
                style={[styles.timeInput]}
                placeholder="MM"
                value={minutes}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  if (num === '' || (Number(num) >= 0 && Number(num) <= 59)) {
                    setMinutes(num);
                  }
                }}
                maxLength={2}
                keyboardType="number-pad"
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
              <TouchableOpacity style={[styles.submitBtn, { flex: 0.4 }]} onPress={onApply}>
                <Text style={styles.submitBtnText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { flex: 0.4, backgroundColor: '#ccc' }]} onPress={() => setVisible(false)}>
                <Text style={[styles.submitBtnText, { color: '#333' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderUserModal = () => (
    <Modal
      visible={showUserModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowUserModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Employee</Text>
          
          {loadingUsers ? (
            <ActivityIndicator size="large" color="#6A1B9A" style={{ padding: 20 }} />
          ) : (
            <>
              <FlatList
                data={users}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => {
                      setSelectedUserId(item._id);
                      setSelectedUserName(`${item.fullName} (${item.role})`);
                      setShowUserModal(false);
                      setErrors(e => ({ ...e, userId: '' }));
                    }}
                  >
                    <Text style={styles.userName}>{item.fullName}</Text>
                    <Text style={styles.userRole}>{item.role}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No employees found. Register some first.</Text>
                }
              />
            </>
          )}
          
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setShowUserModal(false)}
          >
            <Text style={styles.closeModalText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Create New Shift</Text>

      {/* Employee Selection */}
      <Text style={styles.label}>Employee <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity
        style={[styles.pickerButton, errors.userId && styles.inputError]}
        onPress={() => setShowUserModal(true)}
      >
        <Text style={selectedUserId ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
          {selectedUserName || 'Tap to select employee'}
        </Text>
      </TouchableOpacity>
      {errors.userId && <Text style={styles.errorText}>{errors.userId}</Text>}

      {/* Date Picker */}
      <Text style={styles.label}>Date <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
        <Text style={styles.pickerButtonText}>{formatDate(date)}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      {/* Shift Type */}
      <Text style={styles.label}>Shift Type <Text style={styles.required}>*</Text></Text>
      <View style={styles.optionRow}>
        {SHIFT_TYPES.map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.optionBtn, shiftType === type && styles.optionBtnActive]}
            onPress={() => { 
              setShiftType(type);
              setShiftTimes(type);
              setErrors(e => ({ ...e, shiftType: '' })); 
            }}
          >
            <Text style={[styles.optionBtnText, shiftType === type && styles.optionBtnTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.shiftType && <Text style={styles.errorText}>{errors.shiftType}</Text>}

      {/* Start Time */}
      <Text style={styles.label}>Start Time <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => {
        setStartTimeHours(String(startTime.getHours()).padStart(2, '0'));
        setStartTimeMinutes(String(startTime.getMinutes()).padStart(2, '0'));
        setShowStartTimeModal(true);
      }}>
        <Text style={styles.pickerButtonText}>{formatTimeDisplay(startTime)}</Text>
      </TouchableOpacity>

      {/* End Time */}
      <Text style={styles.label}>End Time <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => {
        setEndTimeHours(String(endTime.getHours()).padStart(2, '0'));
        setEndTimeMinutes(String(endTime.getMinutes()).padStart(2, '0'));
        setShowEndTimeModal(true);
      }}>
        <Text style={styles.pickerButtonText}>{formatTimeDisplay(endTime)}</Text>
      </TouchableOpacity>
      {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}

      {renderTimeModal(true)}
      {renderTimeModal(false)}

      {/* Status */}
      <Text style={styles.label}>Status</Text>
      <View style={styles.optionRow}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.optionBtn, status === s && styles.optionBtnActive]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.optionBtnText, status === s && styles.optionBtnTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notes */}
      <Text style={styles.label}>Notes (Optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Additional notes..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      {/* Attendance Document */}
      <Text style={styles.label}>Attendance Document (Optional)</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={pickAttendanceReport}>
        {attendanceReport ? (
          <View style={styles.fileSelectedBox}>
            <Text style={styles.fileName} numberOfLines={2}>{attendanceReport.name || 'Selected document'}</Text>
            <Text style={styles.fileMeta}>{attendanceReport.mimeType || 'Document file'}</Text>
          </View>
        ) : (
          <View style={styles.imagePickerPlaceholder}>
            <Text style={styles.imagePickerIcon}>📄</Text>
            <Text style={styles.imagePickerText}>Tap to upload attendance document</Text>
          </View>
        )}
      </TouchableOpacity>
      {attendanceReport && (
        <TouchableOpacity onPress={() => setAttendanceReport(null)}>
          <Text style={styles.removeImageText}>✕ Remove document</Text>
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
          : <Text style={styles.submitBtnText}>Create Shift</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {renderUserModal()}
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
  pickerButton: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, backgroundColor: '#fafafa',
  },
  pickerButtonText: { fontSize: 14, color: '#333' },
  pickerButtonPlaceholder: { fontSize: 14, color: '#999' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  optionBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f5f5f5',
  },
  optionBtnActive: { backgroundColor: '#6A1B9A', borderColor: '#6A1B9A' },
  optionBtnText: { color: '#555', fontSize: 13, fontWeight: '500' },
  optionBtnTextActive: { color: '#fff', fontWeight: '700' },
  imagePicker: {
    borderWidth: 2, borderColor: '#6A1B9A', borderStyle: 'dashed',
    borderRadius: 10, overflow: 'hidden', marginTop: 4,
  },
  imagePickerPlaceholder: { padding: 30, alignItems: 'center' },
  imagePickerIcon: { fontSize: 36, marginBottom: 8 },
  imagePickerText: { color: '#6A1B9A', fontWeight: '600', fontSize: 14 },
  fileSelectedBox: { padding: 16 },
  fileName: { fontSize: 14, fontWeight: '600', color: '#333' },
  fileMeta: { marginTop: 6, fontSize: 12, color: '#777' },
  removeImageText: { color: '#d32f2f', fontSize: 13, marginTop: 6, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#6A1B9A', padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#d32f2f', fontSize: 12, marginTop: 3 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 12,
    width: '85%', maxHeight: '70%', padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  userItem: {
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  userName: { fontSize: 16, fontWeight: '500', color: '#333' },
  userRole: { fontSize: 13, color: '#6A1B9A', marginTop: 2 },
  closeModalBtn: {
    backgroundColor: '#6A1B9A', padding: 12, borderRadius: 8,
    marginTop: 16, alignItems: 'center',
  },
  closeModalText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', padding: 20 },
  timeInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, width: 60, textAlign: 'center', fontSize: 20,
    fontWeight: 'bold', backgroundColor: '#f5f5f5',
  },
});