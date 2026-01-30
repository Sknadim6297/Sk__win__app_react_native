import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/theme';
import { userService } from '../services/api';
import SKWinLogo from '../components/SKWinLogo';

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useContext(AuthContext);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gameUsername, setGameUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [userId, setUserId] = useState('');
  
  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await userService.getProfile();
      setName(data.name || '');
      setEmail(data.email || '');
      setGameUsername(data.gameUsername || '');
      setUserId('#' + (data._id?.slice(-8) || ''));
      if (data.dateOfBirth) {
        const date = new Date(data.dateOfBirth);
        const formatted = date.toISOString().split('T')[0]; // YYYY-MM-DD
        setDateOfBirth(formatted);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (gameUsername.trim() && gameUsername.trim().length < 3) {
      Alert.alert('Error', 'Game username must be at least 3 characters');
      return;
    }

    setSaving(true);
    try {
      const updateData = { 
        name: name.trim(),
      };
      
      if (gameUsername.trim()) {
        updateData.gameUsername = gameUsername.trim();
      }
      
      if (dateOfBirth) {
        updateData.dateOfBirth = new Date(dateOfBirth);
      }

      const response = await userService.updateProfile(updateData);
      
      if (response.success || response.user) {
        await updateUser({
          name: name.trim(),
          gameUsername: gameUsername.trim(),
        });
        
        Alert.alert('Success', 'Profile updated successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters long');
      return;
    }

    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!hasNumber || !hasSpecialChar) {
      Alert.alert('Error', 'Password must contain at least 1 number and 1 special character');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (oldPassword === newPassword) {
      Alert.alert('Error', 'New password cannot be the same as old password');
      return;
    }

    setSaving(true);
    try {
      const response = await userService.changePassword({ 
        oldPassword, 
        newPassword 
      });
      
      if (response.success) {
        Alert.alert('Success', 'Password changed successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <SKWinLogo size={100} />
          </View>
          <Text style={styles.avatarHint}>App Logo</Text>
        </View>

        {/* Profile Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.gray}
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Game Username</Text>
            <TextInput
              style={styles.input}
              value={gameUsername}
              onChangeText={setGameUsername}
              placeholder="Enter game username"
              placeholderTextColor={COLORS.gray}
              editable={!saving}
            />
            <Text style={styles.hint}>Unique username for tournaments (min 3 characters)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.gray}
              editable={!saving}
            />
            <Text style={styles.hint}>Format: YYYY-MM-DD (e.g., 1990-01-15)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>User ID</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={userId}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
            />
            <Text style={styles.hint}>Email cannot be changed</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.savingButton]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={20} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
        </View>

        {/* Password Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Old Password *</Text>
            <TextInput
              style={styles.input}
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Enter old password"
              placeholderTextColor={COLORS.gray}
              secureTextEntry
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password *</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={COLORS.gray}
              secureTextEntry
              editable={!saving}
            />
            <Text style={styles.hint}>Min 8 characters, 1 number, 1 special character</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password *</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor={COLORS.gray}
              secureTextEntry
              editable={!saving}
            />
          </View>
        </View>

        {/* Change Password Button */}
        <TouchableOpacity
          style={[styles.passwordButton, saving && styles.savingButton]}
          onPress={handleChangePassword}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="lock-reset" size={20} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Change Password</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.accent,
  },
  avatarHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 15,
  },
  formSection: {
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: COLORS.white,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray + '30',
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: COLORS.lightGray,
  },
  hint: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    marginHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    marginHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  savingButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    paddingVertical: 30,
    paddingHorizontal: 15,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.darkGray,
  },
});

export default EditProfileScreen;
