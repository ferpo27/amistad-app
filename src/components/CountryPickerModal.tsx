import React from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';

interface Country {
  code: string;
  name: string;
}

interface CountryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  selectedCountryCode?: string;
}

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
];

const CountryPickerModal: React.FC<CountryPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedCountryCode,
}) => {
  const renderItem = ({ item }: { item: Country }) => {
    const isSelected = item.code === selectedCountryCode;
    return (
      <TouchableOpacity
        style={[styles.itemContainer, isSelected && styles.itemSelected]}
        onPress={() => {
          onSelect(item);
          onClose();
        }}
      >
        <Text style={styles.itemText}>{item.name}</Text>
        {isSelected && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Country</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={COUNTRIES}
          keyExtractor={(item) => item.code}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  close: {
    fontSize: 22,
    color: '#777',
  },
  list: {
    paddingHorizontal: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  itemSelected: {
    backgroundColor: '#e6f7ff',
  },
  itemText: {
    fontSize: 16,
  },
  checkMark: {
    fontSize: 16,
    color: '#007aff',
  },
});

export default CountryPickerModal;