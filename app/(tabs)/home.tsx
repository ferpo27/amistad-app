import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSavedMatches } from '../../src/storage';

/**
 * Home screen component that loads saved match IDs from storage
 * whenever the screen gains focus.
 */
const HomeScreen = () => {
  // State to hold the list of saved match IDs
  const [savedIds, setSavedIds] = useState<string[]>([]);
  // Loading and error states for better UX
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads saved matches from storage and updates component state.
   * Errors are caught and stored in the error state.
   */
  const loadSavedMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = await getSavedMatches();
      setSavedIds(ids);
    } catch (e) {
      setError('Failed to load saved matches');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger loading each time the screen is focused
  useFocusEffect(
    useCallback(() => {
      loadSavedMatches();
    }, [loadSavedMatches])
  );

  // Render loading indicator
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Render error message if loading failed
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{error}</Text>
      </View>
    );
  }

  // Main UI of the Home screen
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Saved Matches: {savedIds.length}</Text>
      {/* TODO: Render list of matches using savedIds */}
    </View>
  );
};

export default HomeScreen;