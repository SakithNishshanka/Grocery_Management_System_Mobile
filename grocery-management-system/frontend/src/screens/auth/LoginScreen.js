import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Pressable,
  Alert, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login, requestPasswordReset, resetPassword } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('', result.error);
    }
  };

  const openForgotPassword = () => {
    setForgotEmail(email);
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotStep(1);
    setForgotVisible(true);
  };

  const handleRequestResetCode = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setForgotLoading(true);
    const result = await requestPasswordReset(forgotEmail);
    setForgotLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error);
      return;
    }

    setForgotStep(2);
    Alert.alert('Success', result.message || 'Reset code sent to your email');
  };

  const handleResetPassword = async () => {
    if (!resetCode.trim() || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setForgotLoading(true);
    const result = await resetPassword(forgotEmail, resetCode, newPassword);
    setForgotLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error);
      return;
    }

    setForgotVisible(false);
    Alert.alert('Success', 'Password reset successfully. You can now sign in with your new password.');
  };

  return (
    <KeyboardAvoidingView
      style={S.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Green curved header */}
        <View style={[S.hero, { paddingTop: insets.top + 28 }]}>
          <View style={S.logoCircle}>
            <Ionicons name="cart-outline" size={34} color={colors.primary} />
          </View>
          <Text style={S.brandName}>GroceryApp</Text>
          <Text style={S.brandTagline}>Fresh from farm to your door</Text>
        </View>

        {/* White login card */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Welcome Back</Text>
          <Text style={S.cardSubtitle}>Sign in to continue</Text>

          <Text style={S.label}>Email Address</Text>
          <View style={S.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#94a3b8" style={S.inputIcon} />
            <TextInput
              style={S.input}
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <Text style={S.label}>Password</Text>
          <View style={S.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={S.inputIcon} />
            <TextInput
              style={S.input}
              placeholder="Enter your password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={S.forgotWrap} activeOpacity={0.7} onPress={openForgotPassword}>
            <Text style={S.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.signInBtn, loading && S.signInBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={S.signInText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={S.dividerRow}>
            <View style={S.dividerLine} />
            <Text style={S.dividerText}>OR</Text>
            <View style={S.dividerLine} />
          </View>

          <View style={S.registerRow}>
            <Text style={S.registerMuted}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')} activeOpacity={0.7}>
              <Text style={S.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={forgotVisible} transparent animationType="slide" onRequestClose={() => setForgotVisible(false)}>
        <Pressable style={S.modalOverlay} onPress={() => setForgotVisible(false)}>
          <Pressable style={S.modalCard} onPress={() => {}}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>{forgotStep === 1 ? 'Reset Password' : 'Enter Reset Code'}</Text>
              <TouchableOpacity onPress={() => setForgotVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {forgotStep === 1 ? (
              <>
                <Text style={S.modalText}>Enter your email address and we will send a reset code to your inbox.</Text>
                <TextInput
                  style={S.modalInput}
                  placeholder="you@example.com"
                  placeholderTextColor="#94a3b8"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={[S.modalBtn, forgotLoading && S.modalBtnDisabled]} onPress={handleRequestResetCode} disabled={forgotLoading} activeOpacity={0.85}>
                  <Text style={S.modalBtnText}>{forgotLoading ? 'Sending...' : 'Send Reset Code'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={S.modalText}>Check your email for the reset code, then enter it below with your new password.</Text>
                <TextInput
                  style={S.modalInput}
                  placeholder="Reset code"
                  placeholderTextColor="#94a3b8"
                  value={resetCode}
                  onChangeText={setResetCode}
                  autoCapitalize="none"
                />
                <TextInput
                  style={S.modalInput}
                  placeholder="New password"
                  placeholderTextColor="#94a3b8"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TextInput
                  style={S.modalInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="#94a3b8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
                <TouchableOpacity style={[S.modalBtn, forgotLoading && S.modalBtnDisabled]} onPress={handleResetPassword} disabled={forgotLoading} activeOpacity={0.85}>
                  <Text style={S.modalBtnText}>{forgotLoading ? 'Resetting...' : 'Reset Password'}</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f3f4f6' },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    paddingBottom: 56,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  brandTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 6,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: -32,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    minHeight: 50,
    marginBottom: 16,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 0,
  },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 18, marginTop: -6 },
  forgotText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  signInBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnDisabled: { opacity: 0.65 },
  signInText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerMuted: { fontSize: 14, color: '#64748b' },
  registerLink: { fontSize: 14, fontWeight: '800', color: colors.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 12,
    color: '#0f172a',
  },
  modalBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalBtnDisabled: { opacity: 0.7 },
  modalBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
});
