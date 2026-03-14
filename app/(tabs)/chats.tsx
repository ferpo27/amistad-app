import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

interface ChatListProps {
  chats: any[];
}

const ChatList: React.FC<ChatListProps> = ({ chats }) => {
  const handleChatPress = (chat: any) => {
    if (chats.length > 0 && chat.id !== null) {
      // Lógica para manejar el chat seleccionado
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => handleChatPress(item)} style={{ padding: 12, borderBottomWidth: 1, borderColor: '#ccc' }}>
      <Text>{item.title ?? `Chat ${item.id}`}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={chats}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
    />
  );
};

export default ChatList;