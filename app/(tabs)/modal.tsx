import React from 'react';
import { Modal, View, StyleSheet, TouchableWithoutFeedback, GestureResponderEvent } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const ReusableModal: React.FC<Props> = ({ visible, onClose, children }) => {
  const handleOverlayPress = (event: GestureResponderEvent) => {
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleOverlayPress}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={styles.contentContainer}>{children}</View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  contentContainer: {
    position: 'absolute',
    top: '30%',
    left: '5%',
    right: '5%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default ReusableModal;