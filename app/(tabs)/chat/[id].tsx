import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';

interface Message {
  text: string;
}

const Chat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [response, setResponse] = useState<Message | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  const handleSendMessage = () => {
    const newMessage: Message = { text: message };
    setMessages([...messages, newMessage]);
    setMessage('');
  };

  return (
    <View>
      <Text>Chat</Text>
      <TextInput
        value={message}
        onChangeText={(text: string) => setMessage(text)}
        placeholder="Escribe un mensaje"
      />
      <Button title="Enviar" onPress={handleSendMessage} />
      <View>
        {messages.map((message: Message, index: number) => (
          <Text key={index}>{message.text}</Text>
        ))}
      </View>
    </View>
  );
};

export default Chat;