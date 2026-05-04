import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Linking, Modal, FlatList,
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
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStartTimeModal, setShowStartTimeModal] = useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = useState(false);
  const [startTimeHours, setStartTimeHours] = useState('06');
  const [startTimeMinutes, setStartTimeMinutes] = useState('00');
  const [endTimeHours, setEndTimeHours] = useState('14');
  const [endTimeMinutes, setEndTimeMinutes] = useState('00');

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
          'image/jpeg',
          'image/png',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length) {
        setNewAttendanceReport(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick attendance document');
    }
  };

  const formatDate = (value) => value.toISOString().split('T')[0];

  const formatTime = (value) => value.toTimeString().split(' ')[0].slice(0, 5);

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
    if (startTime >= endTime && shiftType !== 'Night') {
      return 'Start time must be before end time';
    }
    return '';
  };

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
    
    const timeError = validateTimes();
    if (timeError) nextErrors.time = timeError;
    
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

      // Check for overlapping shifts for this user on the same date (exclude current shift)
      try {
        const resp = await axios.get(`${BASE_URL}/shifts`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { userId: selectedUserId, date: formatDate(date) }
        });
        const existing = resp.data || [];

        const toMillis = (d) => d.getTime();
        const newStart = new Date(date);
        newStart.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        const newEnd = new Date(date);
        newEnd.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
        if (newEnd <= newStart) newEnd.setDate(newEnd.getDate() + 1);

        const overlaps = existing.some(s => {
          if (s._id === shift._id) return false;
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
      }

      // Prevent setting start time in the past for today
      const now = new Date();
      if (formatDate(date) === formatDate(now)) {
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
          
          {users.length === 0 ? (
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
                      setShowUserModal(false);
                      setErrors(e => ({ ...e, userId: '' }));
                    }}
                  >
                    <Text style={styles.userName}>{item.fullName}</Text>
                    <Text style={styles.userRole}>{item.role}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No employees found</Text>}
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
                style={styles.timeInput}
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
                style={styles.timeInput}
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

  return (
    <>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Shift Details</Text>
      <Text style={styles.subTitle}>
        {canManageShift ? 'Manage assignment and attendance document' : 'Submit your attendance response'}
      </Text>

      <Text style={styles.infoText}>Assigned Employee: {shift.userId?.fullName || 'Unknown'}</Text>
      <Text style={styles.infoText}>Current Response: {shift.employeeStatus || 'Pending'}</Text>
      {shift.employeeStatusReason ? <Text style={styles.infoText}>Reason: {shift.employeeStatusReason}</Text> : null}

      {/* Always-visible details to improve the view for workers */}
      <Text style={styles.infoText}>Date: {formatDate(date)}</Text>
      <Text style={styles.infoText}>Shift Type: {shiftType}</Text>
      <Text style={styles.infoText}>Time: {formatTimeDisplay(startTime)} - {formatTimeDisplay(endTime)}</Text>
      {shift.notes ? <Text style={styles.infoText}>Notes: {shift.notes}</Text> : null}

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
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowUserModal(true)}
          >
            <Text style={styles.pickerButtonText}>
              {users.find(u => u._id === selectedUserId)?.fullName || 'Tap to select employee'}
            </Text>
          </TouchableOpacity>
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
              minimumDate={new Date()}
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
                onPress={() => {
                  setShiftType(type);
                  setShiftTimes(type);
                  setErrors(e => ({ ...e, shiftType: '' }));
                }}
              >
                <Text style={[styles.optionBtnText, shiftType === type && styles.optionBtnTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Start Time</Text>
          <TouchableOpacity style={[styles.pickerButton, errors.startTime && styles.inputError]} onPress={() => {
            setStartTimeHours(String(startTime.getHours()).padStart(2, '0'));
            setStartTimeMinutes(String(startTime.getMinutes()).padStart(2, '0'));
            setShowStartTimeModal(true);
          }}>
            <Text style={styles.pickerButtonText}>{formatTimeDisplay(startTime)}</Text>
          </TouchableOpacity>
          {errors.startTime ? <Text style={styles.errorText}>{errors.startTime}</Text> : null}

          <Text style={styles.label}>End Time</Text>
          <TouchableOpacity style={[styles.pickerButton, errors.endTime && styles.inputError]} onPress={() => {
            setEndTimeHours(String(endTime.getHours()).padStart(2, '0'));
            setEndTimeMinutes(String(endTime.getMinutes()).padStart(2, '0'));
            setShowEndTimeModal(true);
          }}>
            <Text style={styles.pickerButtonText}>{formatTimeDisplay(endTime)}</Text>
          </TouchableOpacity>
          {errors.endTime ? <Text style={styles.errorText}>{errors.endTime}</Text> : null}
          {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}

          {renderTimeModal(true)}
          {renderTimeModal(false)}

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
            <>
              <View style={styles.fileBox}>
                <Text style={styles.fileTitle}>Selected Document</Text>
                <Text style={styles.fileText}>{newAttendanceReport.name || 'Document selected'}</Text>
              </View>
              <TouchableOpacity onPress={() => setNewAttendanceReport(null)}>
                <Text style={styles.removeDocText}>✕ Remove document</Text>
              </TouchableOpacity>
            </>
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
      {renderUserModal()}
    </>
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
  removeDocText: { color: '#d32f2f', fontSize: 13, marginTop: 8, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#6A1B9A',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
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