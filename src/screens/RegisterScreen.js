import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { createUser, getUserByEmail } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';
import { syncPendingBackup } from '../services/backupSync';
import { RECOVERY_QUESTIONS } from '../constants/recoveryQuestions';

// Validates owner and staff account fields before allowing registration.
const getValidationErrors = ({
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
  recoveryQuestion,
  recoveryAnswer,
}, showRequired = false, requireRecoverySetup = true) => {
  const nameRegex = /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]+(?: [A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]+)*$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRecoveryAnswer = recoveryAnswer.trim();
  const errors = {};

  if (normalizedFirstName && !nameRegex.test(normalizedFirstName)) {
    errors.firstName = 'Use letters and spaces only';
  } else if (showRequired && !normalizedFirstName) {
    errors.firstName = 'Enter your first name';
  }

  if (normalizedLastName && !nameRegex.test(normalizedLastName)) {
    errors.lastName = 'Use letters and spaces only';
  } else if (showRequired && !normalizedLastName) {
    errors.lastName = 'Enter your last name';
  }

  if (normalizedEmail && !emailRegex.test(normalizedEmail)) {
    errors.email = 'Enter a valid email address';
  } else if (showRequired && !normalizedEmail) {
    errors.email = 'Enter your email address';
  }

  if (password && password.length < 8) {
    errors.password = 'Use at least 8 characters';
  } else if (password && !/[A-Za-z]/.test(password)) {
    errors.password = 'Add at least one letter';
  } else if (password && !/\d/.test(password)) {
    errors.password = 'Add at least one number';
  } else if (showRequired && !password) {
    errors.password = 'Enter a password';
  }

  if (confirmPassword && password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  } else if (showRequired && !confirmPassword) {
    errors.confirmPassword = 'Confirm your password';
  }

  if (requireRecoverySetup && recoveryQuestion && !RECOVERY_QUESTIONS.includes(recoveryQuestion.trim())) {
    errors.recoveryQuestion = 'Select one of the listed questions';
  } else if (showRequired && requireRecoverySetup && !recoveryQuestion.trim()) {
    errors.recoveryQuestion = 'Select a recovery question';
  }

  if (requireRecoverySetup && normalizedRecoveryAnswer && normalizedRecoveryAnswer.length < 2) {
    errors.recoveryAnswer = 'Use at least 2 characters';
  } else if (showRequired && requireRecoverySetup && !normalizedRecoveryAnswer) {
    errors.recoveryAnswer = 'Enter your recovery answer';
  }

  return errors;
};

// Keeps password focus state separate from the registration screen's hooks.
function PasswordFieldWithRequirements({
  password,
  onChangeText,
  showPassword,
  onTogglePassword,
  isEmptyInvalid,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const passwordRequirements = [
    { key: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { key: 'letter', label: 'At least one letter', met: /[A-Za-z]/.test(password) },
    { key: 'number', label: 'At least one number', met: /\d/.test(password) },
  ];

  return (
    <>
      <View style={styles.passwordField}>
        <TextInput
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete="new-password"
          style={[styles.passwordInput, isEmptyInvalid ? styles.inputInvalid : null]}
        />
        <TouchableOpacity onPress={onTogglePassword} style={styles.passwordToggle}>
          <Text style={styles.passwordToggleText}>{showPassword ? '\u{1F648}' : '\u{1F441}'}</Text>
        </TouchableOpacity>
      </View>
      <View
        style={[styles.passwordRequirements, !isFocused ? styles.passwordRequirementsHidden : null]}
        accessibilityElementsHidden={!isFocused}
        importantForAccessibility={isFocused ? 'auto' : 'no-hide-descendants'}
      >
        <Text style={styles.passwordRequirementsTitle}>Password must include:</Text>
        {passwordRequirements.map(requirement => (
          <View
            key={requirement.key}
            style={styles.passwordRequirementRow}
            accessible
            accessibilityLabel={`${requirement.label}, ${requirement.met ? 'met' : 'not met'}`}
          >
            <View
              style={[
                styles.passwordRequirementCheckbox,
                requirement.met ? styles.passwordRequirementCheckboxMet : null,
              ]}
            >
              {requirement.met ? <Text style={styles.passwordRequirementCheck}>✓</Text> : null}
            </View>
            <Text
              style={[
                styles.passwordRequirementText,
                requirement.met ? styles.passwordRequirementTextMet : null,
              ]}
            >
              {requirement.label}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

// Creates owner accounts from public sign-up and staff accounts from the owner dashboard.
export default function RegisterScreen({ navigation, route }) {
  // Determines whether this screen is creating an owner account or an owner-linked staff account.
  const ownerUserId = route?.params?.ownerUserId ?? null;
  const isOwnerCreatingStaff = ownerUserId != null;
  const requiresRecoverySetup = !isOwnerCreatingStaff;
  const roleOptions = [
    { label: 'Manager', value: 'manager' },
    { label: 'Worker', value: 'worker' },
  ];

  // Stores account form fields and dropdown visibility state.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [role, setRole] = useState(isOwnerCreatingStaff ? 'manager' : 'owner');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showRecoveryQuestionDropdown, setShowRecoveryQuestionDropdown] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [emailAvailabilityError, setEmailAvailabilityError] = useState('');
  const validationErrors = getValidationErrors(
    { firstName, lastName, email, password, confirmPassword, recoveryQuestion, recoveryAnswer },
    hasSubmitted,
    requiresRecoverySetup
  );
  // Validates the form, prevents duplicate emails, creates the user, and attempts backup sync.
  const handleRegister = () => {
    setHasSubmitted(true);
    const normalizedEmail = email.trim().toLowerCase();
    const targetRole = isOwnerCreatingStaff ? role : 'owner';
    const errors = getValidationErrors(
      {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        recoveryQuestion,
        recoveryAnswer,
      },
      true,
      requiresRecoverySetup
    );

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (isOwnerCreatingStaff && !['manager', 'worker'].includes(targetRole)) {
      Alert.alert('Error', 'Staff accounts can only be manager or worker');
      return;
    }

    setEmailAvailabilityError('');

    getUserByEmail(normalizedEmail, async existingUser => {
      if (existingUser) {
        setEmailAvailabilityError('An account with this email already exists');
        return;
      }

      try {
        const createdUser = await createUser(
          firstName.trim(),
          lastName.trim(),
          normalizedEmail,
          password,
          targetRole,
          isOwnerCreatingStaff ? ownerUserId : null,
          requiresRecoverySetup ? recoveryQuestion : null,
          requiresRecoverySetup ? recoveryAnswer : null
        );

        let backupSucceeded = false;

        try {
          const syncResults = await syncPendingBackup();
          backupSucceeded = syncResults.some(item => item.key === 'users' && item.syncedCount > 0);
        } catch (error) {
          console.log('Backup pending after local registration', error);
        }

        const successMessage = backupSucceeded
          ? isOwnerCreatingStaff
            ? 'Staff account created and backed up to cloud'
            : 'Owner account created and backed up to cloud'
          : isOwnerCreatingStaff
            ? 'Staff account created locally (backup pending)'
            : 'Owner account created locally (backup pending)';

        Alert.alert('Success', successMessage, [
          {
            text: isOwnerCreatingStaff ? 'Done' : 'Continue',
            onPress: () => {
              if (isOwnerCreatingStaff) {
                navigation.goBack();
              } else if (createdUser?.insertId) {
                navigation.replace('AddFarm', {
                  userId: createdUser.insertId,
                  onboarding: true,
                });
              } else {
                navigation.navigate('Login');
              }
            },
          },
        ]);
      } catch (error) {
        console.log(error);
        Alert.alert('Error', 'Failed to create account locally');
      }
    });
  };

  return (
    <ScreenBackground scroll contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.formCard}>
        <Text style={styles.title}>{isOwnerCreatingStaff ? 'Create Staff Account' : 'Create Owner Account'}</Text>

      <Text style={styles.roleLabel}>
        {isOwnerCreatingStaff ? `Staff Role: ${role}` : 'Public sign-up creates owner accounts only'}
      </Text>

      {/* Lets owners select whether the staff account is a manager or worker. */}
      {isOwnerCreatingStaff ? (
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            activeOpacity={0.8}
            onPress={() => setShowRoleDropdown(previous => !previous)}
          >
            <Text style={styles.dropdownTriggerText}>
              {roleOptions.find(option => option.value === role)?.label ?? 'Select role'}
            </Text>
            <Text style={styles.dropdownChevron}>{showRoleDropdown ? '\u25B2' : '\u25BC'}</Text>
          </TouchableOpacity>

          {showRoleDropdown ? (
            <View style={styles.dropdownMenu}>
              {roleOptions.map(option => {
                const isSelected = option.value === role;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.dropdownOption, isSelected ? styles.dropdownOptionSelected : null]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setRole(option.value);
                      setShowRoleDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, isSelected ? styles.dropdownOptionTextSelected : null]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Collects the user's name and email identity. */}
      <TextInput
        placeholder="First Name"
        placeholderTextColor="#999"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        autoCorrect={false}
        style={[styles.input, validationErrors.firstName ? styles.inputInvalid : null]}
      />
      {validationErrors.firstName ? <Text style={styles.fieldError}>{validationErrors.firstName}</Text> : null}
      <TextInput
        placeholder="Last Name"
        placeholderTextColor="#999"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        autoCorrect={false}
        style={[styles.input, validationErrors.lastName ? styles.inputInvalid : null]}
      />
      {validationErrors.lastName ? <Text style={styles.fieldError}>{validationErrors.lastName}</Text> : null}
      <TextInput
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={value => {
          setEmail(value);
          setEmailAvailabilityError('');
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="username"
        style={[
          styles.input,
          emailAvailabilityError || validationErrors.email ? styles.inputInvalid : null,
        ]}
      />
      {emailAvailabilityError || validationErrors.email ? (
        <Text style={styles.fieldError}>{emailAvailabilityError || validationErrors.email}</Text>
      ) : null}

      {/* Collects and confirms the password with visibility toggles. */}
      <PasswordFieldWithRequirements
        password={password}
        onChangeText={setPassword}
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(previous => !previous)}
        isEmptyInvalid={hasSubmitted && !password}
      />
      {hasSubmitted && !password ? <Text style={styles.fieldError}>Enter a password</Text> : null}

      <View style={styles.passwordField}>
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#999"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoComplete="new-password"
          style={[styles.passwordInput, validationErrors.confirmPassword ? styles.inputInvalid : null]}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.passwordToggle}>
          <Text style={styles.passwordToggleText}>{showConfirmPassword ? '\u{1F648}' : '\u{1F441}'}</Text>
        </TouchableOpacity>
      </View>
      {validationErrors.confirmPassword ? (
        <Text style={styles.fieldError}>{validationErrors.confirmPassword}</Text>
      ) : null}

      {/* Owner self-registration requires recovery setup immediately. */}
      {requiresRecoverySetup ? (
        <>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                validationErrors.recoveryQuestion ? styles.inputInvalid : null,
              ]}
              activeOpacity={0.8}
              onPress={() => setShowRecoveryQuestionDropdown(previous => !previous)}
            >
              <Text style={styles.dropdownTriggerText}>
                {recoveryQuestion || 'Select recovery question'}
              </Text>
              <Text style={styles.dropdownChevron}>{showRecoveryQuestionDropdown ? '\u25B2' : '\u25BC'}</Text>
            </TouchableOpacity>

            {showRecoveryQuestionDropdown ? (
              <View style={styles.dropdownMenu}>
                {RECOVERY_QUESTIONS.map(question => {
                  const isSelected = question === recoveryQuestion;

                  return (
                    <TouchableOpacity
                      key={question}
                      style={[styles.dropdownOption, isSelected ? styles.dropdownOptionSelected : null]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setRecoveryQuestion(question);
                        setShowRecoveryQuestionDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, isSelected ? styles.dropdownOptionTextSelected : null]}>
                        {question}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
          {validationErrors.recoveryQuestion ? (
            <Text style={styles.fieldError}>{validationErrors.recoveryQuestion}</Text>
          ) : null}
          <TextInput
            placeholder="Recovery Answer"
            placeholderTextColor="#999"
            value={recoveryAnswer}
            onChangeText={setRecoveryAnswer}
            style={[styles.input, validationErrors.recoveryAnswer ? styles.inputInvalid : null]}
          />
          {validationErrors.recoveryAnswer ? (
            <Text style={styles.fieldError}>{validationErrors.recoveryAnswer}</Text>
          ) : null}
        </>
      ) : null}

      <Button
        title={isOwnerCreatingStaff ? 'Create Staff Account' : 'Create Owner Account'}
        onPress={handleRegister}
      />

      {/* Public owner registration can return to login after account creation. */}
      {!isOwnerCreatingStaff ? (
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Already have an account? Login</Text>
        </TouchableOpacity>
      ) : null}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Form layout, validation, dropdown, and password field styles.
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  fieldError: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '600',
    marginTop: -6,
    marginBottom: 10,
  },
  inputInvalid: {
    borderColor: '#f87171',
  },
  roleLabel: {
    color: '#fff',
    marginBottom: 12,
  },
  dropdownContainer: {
    width: '100%',
    marginBottom: 12,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTriggerText: {
    color: '#0f172a',
    fontSize: 15,
    flex: 1,
    paddingRight: 12,
  },
  dropdownChevron: {
    color: '#475569',
    fontSize: 12,
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dropdownOptionSelected: {
    backgroundColor: '#dcfce7',
  },
  dropdownOptionText: {
    color: '#0f172a',
    fontSize: 15,
  },
  dropdownOptionTextSelected: {
    fontWeight: '700',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  passwordField: {
    position: 'relative',
    width: '100%',
    marginBottom: 12,
  },
  passwordRequirements: {
    width: '100%',
    marginTop: -4,
    marginBottom: 12,
  },
  passwordRequirementsHidden: {
    display: 'none',
  },
  passwordRequirementsTitle: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  passwordRequirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  passwordRequirementCheckbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordRequirementCheckboxMet: {
    borderColor: '#22c55e',
    backgroundColor: '#16a34a',
  },
  passwordRequirementCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  passwordRequirementText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  passwordRequirementTextMet: {
    color: '#bbf7d0',
    fontWeight: '600',
  },
  passwordInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    paddingRight: 56,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#0f172a',
  },
  passwordToggle: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleText: {
    fontSize: 18,
  },
  loginLink: {
    marginTop: 10,
    color: '#bfdbfe',
    textAlign: 'center',
  },
});
