import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';

interface LoginFormValues {
  email: string;
  password: string;
}

interface InputProps {
  name: keyof LoginFormValues;
  control: any;
  placeholder?: string;
  secureTextEntry?: boolean;
  rules?: object;
}

const Input: React.FC<InputProps> = ({
  name,
  control,
  placeholder,
  secureTextEntry = false,
  rules = {},
}) => (
  <Controller
    control={control}
    name={name}
    rules={rules}
    render={({
      field: { onChange, onBlur, value },
      fieldState: { error },
    }) => (
      <>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          onBlur={onBlur}
          onChangeText={onChange}
          value={value}
          autoCapitalize="none"
        />
        {error && <Text style={styles.errorText}>{error.message}</Text>}
      </>
    )}
  />
);

const LoginScreen: React.FC = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = (data) => {
    // Aquí iría la lógica de autenticación
    Alert.alert('Login Attempt', `Email: ${data.email}\nPassword: ${data.password}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      <Input
        name="email"
        control={control}
        placeholder="Correo electrónico"
        rules={{
          required: 'El correo es obligatorio',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Formato de correo inválido',
          },
        }}
      />
      <Input
        name="password"
        control={control}
        placeholder="Contraseña"
        secureTextEntry
        rules={{
          required: 'La contraseña es obligatoria',
          minLength: {
            value: 6,
            message: 'La contraseña debe tener al menos 6 caracteres',
          },
        }}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit(onSubmit)}
      >
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4d4f',
  },
  errorText: {
    color: '#ff4d4f',
    marginBottom: 8,
    fontSize: 12,
  },
  button: {
    height: 48,
    backgroundColor: '#0066ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
});