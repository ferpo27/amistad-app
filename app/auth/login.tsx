import { storage, saveItem, getItem, removeItem } from '../../src/storage'
import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { supabase } from '../../src/lib/supabase'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signIn({
        email: email,
        password: password,
      })

      if (error) {
        setErrorMessage(error.message)
      } else {
        const user = data.user
        await saveItem('user', user)
        // navigate to home screen
      }
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  return (
    <View style={styles.container}>
      <Text>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={(text) => setEmail(text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={(text) => setPassword(text)}
      />
      <Pressable style={styles.button} onPress={handleLogin}>
        <Text>Login</Text>
      </Pressable>
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: 200,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    width: 100,
    alignItems: 'center',
    borderRadius: 5,
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
})

export default Login