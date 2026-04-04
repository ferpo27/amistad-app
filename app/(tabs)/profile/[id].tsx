============================================================
1: // app/(tabs)/profile/[id].tsx
2: import React, { useCallback, useEffect, useRef, useState } from "react";
3: import {
4:   ScrollView, Text, View, Pressable, Platform,
5:   Image, ActivityIndicator, Animated, Dimensions,
6:   AppState, type AppStateStatus, Alert,
7: } from "react-native";
8: import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
9: import { useTheme } from "@/src/theme";
10: import {
11:   getProfile, updateProfile, addStoryPhoto as addStoryPhotoStorage, removeStoryPhoto as removeStoryPhotoStorage,
12:   type LearningLang, type StoryItem,
13: } from "@/src/storage";
14: import * as ImagePicker from "expo-image-picker";
15: import { Ionicons } from "@expo/vector-icons";
16: import {
17:   getProfileById, type RemoteProfile,
18: } from "../../../src/storage/profilesStorage";
19: import { PROFILES } from "../../../src/mock/profiles";
20: import { MATCHES } from "../../../src/mock/matches";
21: 
22: const _Animated_ViewFixed = (Animated as any).View;
23: const _Animated_ScrollViewFixed = (Animated as any).ScrollView;
24: 
25: const { width: SCREEN_W } = Dimensions.get("window");
26: 
27: const FLAGS: Record<string, string> = {
28:   es: "🇪🇸", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
29: };
30: const LANG_NAMES: Record<string, string> = {
31:   es: "Español", en: "English", de: "Deutsch",
32:   ja: "日本語", ru: "Русский", zh: "中文",
33: };
34: const LEVEL_COLORS: Record<string, string> = {
35:   A1: "#34C759", A2: "#30D158",
36:   B1: "#007AFF", B2: "#0A84FF",
37:   C1: "#AF52DE", C2: "#BF5AF2",
38:   Beginner: "#34C759", Intermediate: "#007AFF", Advanced: "#AF52DE",
39: };
40: const HOURS_OPTIONS: (24 | 48)[] = [24, 48];
41: 
42: function timeLeft(expiresAt?: number): string | null {
43:   if (!expiresAt) return null;
44:   const diff = expiresAt - Date.now();
45:   if (diff <= 0) return null;
46:   const h = Math.floor(diff / 3_600_000);
47:   const m = Math.floor((diff % 3_600_000) / 60_000);
48:   return h > 0 ? `${h}h ${m}m` : `${m}m`;
49: }
50: 
============================================================

============================================================
1: // app/(tabs)/profile/[id].tsx
2: import React, { useCallback, useEffect, useRef, useState } from "react";
3: import {
4:   ScrollView, Text, View, Pressable, Platform,
5:   Image, ActivityIndicator, Animated, Dimensions,
6:   AppState, type AppStateStatus, Alert,
7: } from "react-native";
8: import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
9: import { useTheme } from "@/src/theme";
10: import {
11:   getProfile, updateProfile, addStoryPhoto, removeStoryPhoto,
12:   type LearningLang, type StoryItem,
13: } from "@/src/storage";
14: import * as ImagePicker from "expo-image-picker";
15: import { Ionicons } from "@expo/vector-icons";
16: import {
17:   getProfileById, type RemoteProfile,
18: } from "../../../src/storage/profilesStorage";
19: import { PROFILES } from "../../../src/mock/profiles";
20: import { MATCHES } from "../../../src/mock/matches";
21: 
22: const _Animated_ViewFixed = (Animated as any).View;
23: const _Animated_ScrollViewFixed = (Animated as any).ScrollView;
24: 
25: const { width: SCREEN_W } = Dimensions.get("window");
26: 
27: const FLAGS: Record<string, string> = {
28:   es: "🇪🇸", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
29: };
30: const LANG_NAMES: Record<string, string> = {
31:   es: "Español", en: "English", de: "Deutsch",
32:   ja: "日本語", ru: "Русский", zh: "中文",
33: };
34: const LEVEL_COLORS: Record<string, string> = {
35:   A1: "#34C759", A2: "#30D158",
36:   B1: "#007AFF", B2: "#0A84FF",
37:   C1: "#AF52DE", C2: "#BF5AF2",
38:   Beginner: "#34C759", Intermediate: "#007AFF", Advanced: "#AF52DE",
39: };
40: const HOURS_OPTIONS: (24 | 48)[] = [24, 48];
41: 
42: function timeLeft(expiresAt?: number): string | null {
43:   if (!expiresAt) return null;
44:   const diff = expiresAt - Date.now();
45:   if (diff <= 0) return null;
46:   const h = Math.floor(diff / 3_600_000);
47:   const m = Math.floor((diff % 3_600_000) / 60_000);
48:   return h > 0 ? `${h}h ${m}m` : `${m}m`;
49: }
50: 
============================================================

============================================================
1: // app/(tabs)/profile/[id].tsx
2: import React, { useCallback, useEffect, useRef, useState } from "react";
3: import {
4:   ScrollView, Text, View, Pressable, Platform,
5:   Image, ActivityIndicator, Animated, Dimensions,
6:   AppState, type AppStateStatus, Alert,
7: } from "react-native";
8: import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
9: import { useTheme } from "@/src/theme";
10: import {
11:   getProfile, updateProfile, addStoryPhoto as addStoryPhotoStorage, removeStoryPhoto as removeStoryPhotoStorage,
12:   type LearningLang, type StoryItem,
13: } from "@/src/storage";
14: import * as ImagePicker from "expo-image-picker";
15: import { Ionicons } from "@expo/vector-icons";
16: import {
17:   getProfileById, type RemoteProfile,
18: } from "../../../src/storage/profilesStorage";
19: import { PROFILES } from "../../../src/mock/profiles";
20: import { MATCHES } from "../../../src/mock/matches";
21: 
22: const _Animated_ViewFixed = (Animated as any).View;
23: const _Animated_ScrollViewFixed = (Animated as any).ScrollView;
24: 
25: const { width: SCREEN_W } = Dimensions.get("window");
26: 
27: const FLAGS: Record<string, string> = {
28:   es: "🇪🇸", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
29: };
30: const LANG_NAMES: Record<string, string> = {
31:   es: "Español", en: "English", de: "Deutsch",
32:   ja: "日本語", ru: "Русский", zh: "中文",
33: };
34: const LEVEL_COLORS: Record<string, string> = {
35:   A1: "#34C759", A2: "#30D158",
36:   B1: "#007AFF", B2: "#0A84FF",
37:   C1: "#AF52DE", C2: "#BF5AF2",
38:   Beginner: "#34C759", Intermediate: "#007AFF", Advanced: "#AF52DE",
39: };
40: const HOURS_OPTIONS: (24 | 48)[] = [24, 48];
41: 
42: function timeLeft(expiresAt?: number): string | null {
43:   if (!expiresAt) return null;
44:   const diff = expiresAt - Date.now();
45:   if (diff <= 0) return null;
46:   const h = Math.floor(diff / 3_600_000);
47:   const m = Math.floor((diff % 3_600_000) / 60_000);
48:   return h > 0 ? `${h}h ${m}m` : `${m}m`;
49: }
50: 
============================================================

============================================================
1: // app/(tabs)/profile/[id].tsx
2: import React, { useCallback, useEffect, useRef, useState } from "react";
3: import {
4:   ScrollView, Text, View, Pressable, Platform,
5:   Image, ActivityIndicator, Animated, Dimensions,
6:   AppState, type AppStateStatus, Alert,
7: } from "react-native";
8: import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
9: import { useTheme } from "@/src/theme";
10: import {
11:   getProfile, updateProfile, addStoryPhoto, removeStoryPhoto,
12:   type LearningLang, type StoryItem,
13: } from "@/src/storage";
14: import * as ImagePicker from "expo-image-picker";
15: import { Ionicons } from "@expo/vector-icons";
16: import {
17:   getProfileById, type RemoteProfile,
18: } from "../../../src/storage/profilesStorage";
19: import { PROFILES } from "../../../src/mock/profiles";
20: import { MATCHES } from "../../../src/mock/matches";
21: 
22: const _Animated_ViewFixed = (Animated as any).View;
23: const _Animated_ScrollViewFixed = (Animated as any).ScrollView;
24: 
25: const { width: SCREEN_W } = Dimensions.get("window");
26: 
27: const FLAGS: Record<string, string> = {
28:   es: "🇪🇸", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
29: };
30: const LANG_NAMES: Record<string, string> = {
31:   es: "Español", en: "English", de: "Deutsch",
32:   ja: "日本語", ru: "Русский", zh: "中文",
33: };
34: const LEVEL_COLORS: Record<string, string> = {
35:   A1: "#34C759", A2: "#30D158",
36:   B1: "#007AFF", B2: "#0A84FF",
37:   C1: "#AF52DE", C2: "#BF5AF2",
38:   Beginner: "#34C759", Intermediate: "#007AFF", Advanced: "#AF52DE",
39: };
40: const HOURS_OPTIONS: (24 | 48)[] = [24, 48];
41: 
42: function timeLeft(expiresAt?: number): string | null {
43:   if (!expiresAt) return null;
44:   const diff = expiresAt - Date.now();
45:   if (diff <= 0) return null;
46:   const h = Math.floor(diff / 3_600_000);
47:   const m = Math.floor((diff % 3_600_000) / 60_000);
48:   return h > 0 ? `${h}h ${m}m` : `${m}m`;
49: }
50: 
============================================================

============================================================
1: // app/(tabs)/profile/[id].tsx
2: import React, { useCallback, useEffect, useRef, useState } from "react";
3: import {
4:   ScrollView, Text, View, Pressable, Platform,
5:   Image, ActivityIndicator, Animated, Dimensions,
6:   AppState, type AppStateStatus, Alert,
7: } from "react-native";
8: import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
9: import { useTheme } from "@/src/theme";
10: import {
11:   getProfile, updateProfile, addStoryPhoto as addStoryPhotoStorage, removeStoryPhoto as removeStoryPhotoStorage,
12:   type LearningLang, type StoryItem,
13: } from "@/src/storage";
14: import * as ImagePicker from "expo-image-picker";
15: import { Ionicons } from "@expo/vector-icons";
16: import {
17:   getProfileById, type RemoteProfile,
18: } from "../../../src/storage/profilesStorage";
19: import { PROFILES } from "../../../src/mock/profiles";
20: import { MATCHES } from "../../../src/mock/matches";
21: 
22: const _Animated_ViewFixed = (Animated as any).View;
23: const _Animated_ScrollViewFixed = (Animated as any).ScrollView;
24: 
25: const { width: SCREEN_W } = Dimensions.get("window");
26: 
27: const FLAGS: Record<string, string> = {
28:   es: "🇪🇸", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
29: };
30: const LANG_NAMES: Record<string, string> = {
31:   es: "Español", en: "English", de: "Deutsch",
32:   ja: "日本語", ru: "Русский", zh: "中文",
33: };
34: const LEVEL_COLORS: Record<string, string> = {
35:   A1: "#34C759", A2: "#30D158",
36:   B1: "#007AFF", B2: "#0A84FF",
37:   C1: "#AF52DE", C2: "#BF5AF2",
38:   Beginner: "#34C759", Intermediate: "#007AFF", Advanced: "#AF52DE",
39: };
40: const HOURS_OPTIONS: (24 | 48)[] = [24, 48];
41: 
42: function timeLeft(expiresAt?: number): string | null {
43:   if (!expiresAt) return null;
44:   const diff = expiresAt - Date.now();
45:   if (diff <= 0) return null;
46:   const h = Math.floor(diff / 3_600_000);
47:   const m = Math.floor((diff % 3_600_000) / 60_000);
48:   return h > 0 ? `${h}h ${m}m` : `${m}m`;
49: }
50: 
============================================================

============================================================
1: // app/(tabs)/profile/[id].tsx
2: import React, { useCallback, useEffect, useRef, useState } from "react";
3: import {
4:   ScrollView, Text, View, Pressable, Platform,
5:   Image, ActivityIndicator, Animated, Dimensions,
6:   AppState, type AppStateStatus, Alert,
7: } from "react-native";
8: import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
9: import { useTheme } from "@/src/theme";
10: import {
11:   getProfile, updateProfile, addStoryPhoto, removeStoryPhoto,
12:   type LearningLang, type StoryItem,
13: } from "@/src/storage";
14: import * as ImagePicker from "expo-image-picker";
15: import { Ionicons } from "@expo/vector-icons";
16: import {
17:   getProfileById, type RemoteProfile,
18: } from "../../../src/storage/profilesStorage";
19: import { PROFILES } from "../../../src/mock/profiles";
20: import { MATCHES } from "../../../src/mock/matches";
21: 
22: const _Animated_ViewFixed = (Animated as any).View;
23: const _Animated_ScrollViewFixed = (Animated as any).ScrollView;
24: 
25: const { width: SCREEN_W } = Dimensions.get("window");
26: 
27: const FLAGS: Record<string, string> = {
28:   es: "🇪🇸", en: "🇺🇸", de: "🇩🇪", ja: "🇯🇵", ru: "🇷🇺", zh: "🇨🇳",
29: };
30: const LANG_NAMES: Record<string, string> = {
31:   es: "Español", en: "English", de: "Deutsch",
32:   ja: "日本語", ru: "Русский", zh: "中文",
33: };
34: const LEVEL_COLORS: Record<string, string> = {
35:   A1: "#34C759", A2: "#30D158",
36:   B1: "#007AFF", B2: "#0A84FF",
37:   C1: "#AF52DE", C2: "#BF5AF2",
38:   Beginner: "#34C759", Intermediate: "#007AFF", Advanced: "#AF52DE",
39: };
40: const HOURS_OPTIONS: (24 | 48)[] = [24, 48];
41: 
42: function timeLeft(expiresAt?: number): string | null {
43:   if (!expiresAt) return null;
44:   const diff = expiresAt - Date.now();
45:   if (diff <= 0) return null;
46:   const h = Math.floor(diff / 3_600_000);
47:   const m = Math.floor((diff % 3_600_000) / 60_000);
48:   return h > 0 ? `${h}h ${m}m` : `${m}m`;
49: }
50: 
============================================================

============================================================
1: // app/(tabs)/profile/[id].tsx
2: import React, { useCallback, useEffect, useRef, useState } from "react";
3: import {
4:   ScrollView, Text, View,