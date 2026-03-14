import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Sender = 'user' | 'bot';

interface ChatMessageProps {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ text, sender, timestamp }) => {
  const isUser = sender === 'user';
  const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.botContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={styles.messageText}>{text}</Text>
        <Text style={styles.timeText}>{formattedTime}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  botContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#007aff',
    borderTopRightRadius: 0,
  },
  botBubble: {
    backgroundColor: '#e5e5ea',
    borderTopLeftRadius: 0,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  timeText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
});

export default ChatMessage;