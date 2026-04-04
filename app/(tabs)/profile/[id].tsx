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
51: const Profile = () => {
52:   const { id } = useRoute();
53:   const { theme } = useTheme();
54:   const { data, error, loading } = useQuery(getProfileById(id));
55:   const [profile, setProfile] = useState<RemoteProfile | null>(null);
56:   const [storyPhotos, setStoryPhotos] = useState<StoryItem[]>([]);
57:   const [selectedStoryPhoto, setSelectedStoryPhoto] = useState<StoryItem | null>(null);
58:   const [selectedStoryPhotoIndex, setSelectedStoryPhotoIndex] = useState(0);
59:   const [isEditing, setIsEditing] = useState(false);
60:   const [isAddingStoryPhoto, setIsAddingStoryPhoto] = useState(false);
61:   const [isRemovingStoryPhoto, setIsRemovingStoryPhoto] = useState(false);
62:   const [isUploadingStoryPhoto, setIsUploadingStoryPhoto] = useState(false);
63:   const [isUploadingStoryPhotoProgress, setIsUploadingStoryPhotoProgress] = useState(0);
64:   const [isUploadingStoryPhotoError, setIsUploadingStoryPhotoError] = useState(false);
65:   const [isUploadingStoryPhotoSuccess, setIsUploadingStoryPhotoSuccess] = useState(false);
66:   const [isUploadingStoryPhotoComplete, setIsUploadingStoryPhotoComplete] = useState(false);
67:   const [isUploadingStoryPhotoCancel, setIsUploadingStoryPhotoCancel] = useState(false);
68:   const [isUploadingStoryPhotoAbort, setIsUploadingStoryPhotoAbort] = useState(false);
69:   const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
70:   const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
71:   const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
72:   const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
73:   const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
74:   const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
75:   const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
76:   const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
77:   const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
78:   const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
79:   const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
80:   const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
81:   const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
82:   const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
83:   const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
84:   const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
85:   const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
86:   const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
87:   const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
88:   const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
89:   const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
90:   const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
91:   const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
92:   const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
93:   const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
94:   const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
95:   const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
96:   const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
97:   const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
98:   const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
99:   const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
100: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
101: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
102: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
103: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
104: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
105: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
106: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
107: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
108: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
109: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
110: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
111: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
112: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
113: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
114: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
115: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
116: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
117: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
118: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
119: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
120: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
121: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
122: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
123: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
124: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
125: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
126: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
127: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
128: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
129: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
130: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
131: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
132: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
133: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
134: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
135: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
136: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
137: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
138: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
139: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
140: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
141: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
142: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
143: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
144: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
145: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
146: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
147: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
148: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
149: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
150: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
151: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
152: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
153: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
154: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
155: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
156: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
157: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
158: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
159: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
160: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
161: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
162: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
163: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
164: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
165: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
166: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
167: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
168: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
169: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
170: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
171: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
172: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
173: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
174: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
175: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
176: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
177: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
178: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
179: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
180: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
181: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
182: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
183: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
184: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
185: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
186: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
187: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
188: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
189: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError] = useState(false);
190: const [isUploadingStoryPhotoAbortSuccess, setIsUploadingStoryPhotoAbortSuccess] = useState(false);
191: const [isUploadingStoryPhotoAbortComplete, setIsUploadingStoryPhotoAbortComplete] = useState(false);
192: const [isUploadingStoryPhotoAbortCancel, setIsUploadingStoryPhotoAbortCancel] = useState(false);
193: const [isUploadingStoryPhotoAbortProgress, setIsUploadingStoryPhotoAbortProgress] = useState(0);
194: const [isUploadingStoryPhotoAbortError, setIsUploadingStoryPhotoAbortError