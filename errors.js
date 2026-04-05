import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';

const Errors = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCount(count + 1);
    }, 1000);
    return () => {
      clearInterval(intervalId);
    };
  }, [count]);

  const handlePress = () => {
    // @ts-ignore
    console.log('Button pressed');
  };

  return (
    <View>
      <Text>Count: {count}</Text>
      <Button title="Press me" onPress={handlePress} />
    </View>
  );
};

export default Errors;