import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Dimensions, Image, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth, realtimeDb } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [adminDetails, setAdminDetails] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyInvite = async () => {
    setError('');
    if (!adminCode) {
      setError('Please enter an Admin Invite Code.');
      return;
    }

    setIsLoading(true);
    try {
      const adminRef = ref(realtimeDb, `users/${adminCode}`);
      const adminSnapshot = await get(adminRef);

      if (!adminSnapshot.exists()) {
        setError('Invalid Admin Invite Code.');
        setIsLoading(false);
        return;
      }

      const adminData = adminSnapshot.val();
      if (adminData.role !== 'admin') {
        setError('Invalid Admin Invite Code. User is not an admin.');
        setIsLoading(false);
        return;
      }

      // Success! Move to step 2 and store admin info
      setAdminDetails(adminData);
      setStep(2);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to verify invite code.');
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    
    if (!fullName || !email || !password || !confirmPassword || !adminCode) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // Create the personnel Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save personnel details to Realtime Database, linked permanently to the Admin
      await set(ref(realtimeDb, 'users/' + user.uid), {
        fullName: fullName,
        email: email,
        adminId: adminCode, // Link the user to their admin
        lastLogin: Date.now(),
        createdAt: Date.now(),
        role: 'user' // Since this is the mobile client
      });

      navigation.replace('Home');
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Decorators */}
      <View style={styles.bgDecoratorLeft} />
      <View style={styles.bgDecoratorRight} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logoImage} 
            resizeMode="contain" 
          />
          <Text style={styles.subtitle}>Create a new account</Text>
        </View>

        <View style={styles.formCard}>
          {/* Using ScrollView here so keyboard doesn't hide bottom inputs on small screens */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 1 ? (
            // ================= STEP 1: INVITE CODE =================
            <View style={styles.stepContainer}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
              </View>
              <Text style={styles.stepTitle}>Enter Invite Code</Text>
              <Text style={styles.stepDescription}>
                Ask your administrator for your unit's unique invite code to get started.
              </Text>

              <Text style={styles.label}>Admin Code</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Paste code here..."
                  placeholderTextColor={colors.mutedForeground}
                  value={adminCode}
                  onChangeText={setAdminCode}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity onPress={handleVerifyInvite} activeOpacity={0.8} style={{ marginTop: 10 }} disabled={isLoading}>
                <LinearGradient
                  colors={['#38bdf8', '#0284c7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Verify Code</Text>
                      <Ionicons name="arrow-forward" size={20} color={colors.background} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            // ================= STEP 2: ACCOUNT DETAILS =================
            <View style={styles.stepContainer}>
              <View style={styles.bannerContainer}>
                <Ionicons name="business" size={24} color={colors.background} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>Joining Unit</Text>
                  <Text style={styles.bannerSubtitle}>{adminDetails?.fullName || 'Administrator'}</Text>
                </View>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.bannerAction}>
                  <Text style={styles.bannerActionText}>Change</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Juan Dela Cruz"
                  placeholderTextColor={colors.mutedForeground}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="personnel@unifit.org"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity onPress={handleRegister} activeOpacity={0.8} style={{ marginTop: 10 }} disabled={isLoading}>
                <LinearGradient
                  colors={['#38bdf8', '#0284c7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Sign Up</Text>
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.background} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1c', // Match web app dark background
  },
  bgDecoratorLeft: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(56,189,248,0.1)',
  },
  bgDecoratorRight: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    zIndex: 10,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 120,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: colors.mutedForeground,
  },
  formCard: {
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.5)',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
    height: '100%',
  },
  button: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  stepContainer: {
    width: '100%',
  },
  stepIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(56,189,248,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  bannerContainer: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bannerTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  bannerSubtitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bannerAction: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bannerActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
