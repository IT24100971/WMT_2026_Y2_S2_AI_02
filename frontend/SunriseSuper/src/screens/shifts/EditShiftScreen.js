import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Linking,
} from 'react-native';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BASE_URL } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = BASE_URL.replace('/api', '');
const SHIFT_TYPES = ['Morning', 'Evening', 'Night'];
const SHIFT_STATUSES = ['Scheduled', 'Completed', 'Absent'];
const MEMBER_RESPONSES = ['Will Attend', 'Unable to Attend'];

const parseTimeToDate = (timeString) => {
  if (!timeString) return new Date();
  const [hours = '0', minutes = '0'] = String(timeString).split(':');
  const nextDate = new Date();
  nextDate.setHours(Number(hours), Number(minutes), 0, 0);
  return nextDate;
};

export default function EditShiftScreen({ route, navigation }) {
  const { shift } = route.params;

  const [users, setUsers] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const [selectedUserId, setSelectedUserId] = useState(shift.userId?._id || shift.userId);
  const [date, setDate] = useState(shift.date ? new Date(shift.date) : new Date());
  const [shiftType, setShiftType] = useState(shift.shiftType);
  const [startTime, setStartTime] = useState(parseTimeToDate(shift.startTime));
  const [endTime, setEndTime] = useState(parseTimeToDate(shift.endTime));
  const [status, setStatus] = useState(shift.status);
  const [notes, setNotes] = useState(shift.notes || '');

  const [memberStatus, setMemberStatus] = useState(
    shift.employeeStatus === 'Will Attend' || shift.employeeStatus === 'Unable to Attend'
      ? shift.employeeStatus
      : 'Will Attend'
  );
  const [memberReason, setMemberReason] = useState(shift.employeeStatusReason || '');

  const [newAttendanceReport, setNewAttendanceReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const canManageShift = currentUserRole === 'Admin' || currentUserRole === 'Supervisor';
  const shiftOwnerId = shift.userId?._id || shift.userId;
  const isOwner = currentUserId && shiftOwnerId && currentUserId === shiftOwnerId;

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (canManageShift) {
      fetchUsers();
    }
  }, [canManageShift]);

  const loadCurrentUser = async () => {
    try {
      const user = JSON.parse((await AsyncStorage.getItem('user')) || '{}');
      setCurrentUserRole(user.role || '');
      setCurrentUserId(user._id || '');
    } catch (error) {
      console.log('Failed to read current user:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.log('Error fetching users:', error?.response?.data || error.message);
    }
  };

  const pickAttendanceReport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/*',
        ],
      });

      if (result.type === 'success') {
        setNewAttendanceReport(result);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick attendance document');
    }
  };

  const formatDate = (value) => value.toISOString().split('T')[0];

  const formatTime = (value) => value.toTimeString().split(' ')[0].slice(0, 5);

  const openExistingReport = async () => {
    if (!shift.attendanceReport) return;
    const normalizedReportPath = shift.attendanceReport.replace(/\\/g, '/');
    const reportUrl = normalizedReportPath.startsWith('http')
      ? normalizedReportPath
      : `${SERVER_URL}/${normalizedReportPath}`;
    try {
      await Linking.openURL(reportUrl);
    } catch (error) {
      Alert.alert('Error', 'Could not open attendance document');
    }
  };

  const validateManagerUpdate = () => {
    const nextErrors = {};
    if (!selectedUserId) nextErrors.userId = 'Please select an employee';
    if (!date) nextErrors.date = 'Date is required';
    if (!shiftType) nextErrors.shiftType = 'Please select shift type';
    if (!startTime) nextErrors.startTime = 'Start time is required';
    if (!endTime) nextErrors.endTime = 'End time is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateMemberResponse = () => {
    const nextErrors = {};
    if (!['Will Attend', 'Unable to Attend'].includes(memberStatus)) {
      nextErrors.memberStatus = 'Please select your response';
    }
    if (memberStatus === 'Unable to Attend' && !memberReason.trim()) {
      nextErrors.memberReason = 'Please provide a reason';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleManagerUpdate = async () => {
    if (!validateManagerUpdate()) return;
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();

      formData.append('userId', selectedUserId);
      formData.append('date', formatDate(date));
      formData.append('shiftType', shiftType);
      formData.append('startTime', formatTime(startTime));
      formData.append('endTime', formatTime(endTime));
      formData.append('status', status);
      formData.append('notes', notes);

      if (newAttendanceReport) {
        formData.append('attendanceReport', {
          uri: newAttendanceReport.uri,
          type: newAttendanceReport.mimeType || 'application/octet-stream',
          name: newAttendanceReport.name || 'attendance-document',
        });
      }

      await axios.put(`${BASE_URL}/shifts/${shift._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert('Updated', 'Shift updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update shift';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberResponse = async () => {
    if (!validateMemberResponse()) return;
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.patch(
        `${BASE_URL}/shifts/${shift._id}/member-response`,
        {
          employeeStatus: memberStatus,
          employeeStatusReason: memberReason,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Response Saved', 'Your shift response was updated', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update response';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Shift Details</Text>
      <Text style={styles.subTitle}>
        {canManageShift ? 'Manage assignment and attendance document' : 'Submit your attendance response'}
      </Text>

      <Text style={styles.infoText}>Assigned Employee: {shift.userId?.fullName || 'Unknown'}</Text>
      <Text style={styles.infoText}>Current Response: {shift.employeeStatus || 'Pending'}</Text>
      {shift.employeeStatusReason ? <Text style={styles.infoText}>Reason: {shift.employeeStatusReason}</Text> : null}

      <Text style={styles.label}>Attendance Document</Text>
      {shift.attendanceReport ? (
        <TouchableOpacity style={styles.fileBox} onPress={openExistingReport}>
          <Text style={styles.fileTitle}>Open current document</Text>
          <Text style={styles.fileText}>
            {shift.attendanceReportOriginalName || shift.attendanceReport}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.muted}>No attendance document uploaded yet.</Text>
      )}

      {canManageShift ? (
        <>
          <Text style={styles.label}>Employee</Text>
          <View style={styles.optionRow}>
            {users.map((user) => (
              <TouchableOpacity
                key={user._id}
                style={[styles.optionBtn, selectedUserId === user._id && styles.optionBtnActive]}
                onPress={() => {
                  setSelectedUserId(user._id);
                  setErrors((prev) => ({ ...prev, userId: '' }));
                }}
              >
                <Text style={[styles.optionBtnText, selectedUserId === user._id && styles.optionBtnTextActive]}>
                  {user.fullName} ({user.role})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.userId ? <Text style={styles.errorText}>{errors.userId}</Text> : null}

          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={[styles.pickerButton, errors.date && styles.inputError]} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.pickerButtonText}>{formatDate(date)}</Text>
          </TouchableOpacity>
          {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
          {showDatePicker ? (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          ) : null}

          <Text style={styles.label}>Shift Type</Text>
          <View style={styles.optionRow}>
            {SHIFT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.optionBtn, shiftType === type && styles.optionBtnActive]}
                onPress={() => setShiftType(type)}
              >
                <Text style={[styles.optionBtnText, shiftType === type && styles.optionBtnTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Start Time</Text>
          <TouchableOpacity style={[styles.pickerButton, errors.startTime && styles.inputError]} onPress={() => setShowStartTimePicker(true)}>
            <Text style={styles.pickerButtonText}>{formatTime(startTime)}</Text>
          </TouchableOpacity>
          {errors.startTime ? <Text style={styles.errorText}>{errors.startTime}</Text> : null}
          {showStartTimePicker ? (
            <DateTimePicker
              value={startTime}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowStartTimePicker(false);
                if (selectedTime) setStartTime(selectedTime);
              }}
            />
          ) : null}

          <Text style={styles.label}>End Time</Text>
          <TouchableOpacity style={[styles.pickerButton, errors.endTime && styles.inputError]} onPress={() => setShowEndTimePicker(true)}>
            <Text style={styles.pickerButtonText}>{formatTime(endTime)}</Text>
          </TouchableOpacity>
          {errors.endTime ? <Text style={styles.errorText}>{errors.endTime}</Text> : null}
          {showEndTimePicker ? (
            <DateTimePicker
              value={endTime}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowEndTimePicker(false);
                if (selectedTime) setEndTime(selectedTime);
              }}
            />
          ) : null}

          <Text style={styles.label}>Shift Status</Text>
          <View style={styles.optionRow}>
            {SHIFT_STATUSES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.optionBtn, status === item && styles.optionBtnActive]}
                onPress={() => setStatus(item)}
              >
                <Text style={[styles.optionBtnText, status === item && styles.optionBtnTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity style={styles.filePickBtn} onPress={pickAttendanceReport}>
            <Text style={styles.filePickBtnText}>Choose New Document</Text>
          </TouchableOpacity>

          {newAttendanceReport ? (
            <View style={styles.fileBox}>
              <Text style={styles.fileTitle}>Selected Document</Text>
              <Text style={styles.fileText}>{newAttendanceReport.name || 'Document selected'}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleManagerUpdate}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Update Shift</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          {!isOwner ? (
            <Text style={styles.errorText}>You can only respond to your own shift.</Text>
          ) : (
            <>
              <Text style={styles.label}>Your Response</Text>
              <View style={styles.optionRow}>
                {MEMBER_RESPONSES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.optionBtn, memberStatus === item && styles.optionBtnActive]}
                    onPress={() => setMemberStatus(item)}
                  >
                    <Text style={[styles.optionBtnText, memberStatus === item && styles.optionBtnTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.memberStatus ? <Text style={styles.errorText}>{errors.memberStatus}</Text> : null}

              <Text style={styles.label}>Reason (required when unable to attend)</Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.memberReason && styles.inputError]}
                multiline
                numberOfLines={3}
                value={memberReason}
                onChangeText={setMemberReason}
              />
              {errors.memberReason ? <Text style={styles.errorText}>{errors.memberReason}</Text> : null}

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleMemberResponse}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Response</Text>}
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 4, marginBottom: 4 },
  subTitle: { fontSize: 13, color: '#777', marginBottom: 14 },
  infoText: { fontSize: 13, color: '#444', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 14, marginBottom: 6 },
  muted: { color: '#777', fontSize: 13 },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 11,
    backgroundColor: '#fafafa',
  },
  pickerButtonText: { fontSize: 14, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 11,
    fontSize: 14,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  inputError: { borderColor: '#d32f2f' },
  errorText: { color: '#d32f2f', fontSize: 12, marginTop: 4 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  optionBtnActive: { backgroundColor: '#6A1B9A', borderColor: '#6A1B9A' },
  optionBtnText: { color: '#555', fontSize: 13, fontWeight: '500' },
  optionBtnTextActive: { color: '#fff', fontWeight: '700' },
  fileBox: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f7f7f7',
    marginTop: 8,
  },
  fileTitle: { fontSize: 12, color: '#666', fontWeight: '700', marginBottom: 4 },
  fileText: { fontSize: 13, color: '#333' },
  filePickBtn: {
    marginTop: 10,
    backgroundColor: '#6A1B9A',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filePickBtnText: { color: '#fff', fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#6A1B9A',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});