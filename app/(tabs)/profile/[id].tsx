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
53:   const { data: profile } = useQuery(getProfileById(id));
54:   const { data: theme } = useTheme();
55:   const { data: matches } = useQuery(MATCHES);
56:   const { data: profileData } = useQuery(getProfile);
57:   const [storyPhotos, setStoryPhotos] = useState<StoryItem[]>([]);
58:   const [loading, setLoading] = useState(false);
59:   const [selectedPhoto, setSelectedPhoto] = useState<StoryItem | null>(null);
60:   const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
61:   const [selectedPhotoToDelete, setSelectedPhotoToDelete] = useState<StoryItem | null>(null);
62:   const [selectedPhotoToDeleteIndex, setSelectedPhotoToDeleteIndex] = useState(0);
63:   const [selectedPhotoToAdd, setSelectedPhotoToAdd] = useState<StoryItem | null>(null);
64:   const [selectedPhotoToAddIndex, setSelectedPhotoToAddIndex] = useState(0);
65:   const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
66:   const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
67:   const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
68:   const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
69:   const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
70:   const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
71:   const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
72:   const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
73:   const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
74:   const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
75:   const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
76:   const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
77:   const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
78:   const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
79:   const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
80:   const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
81:   const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
82:   const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
83:   const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
84:   const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
85:   const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
86:   const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
87:   const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
88:   const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
89:   const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
90:   const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
91:   const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
92:   const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
93:   const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
94:   const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
95:   const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
96:   const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
97:   const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
98:   const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
99:   const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
100: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
101: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
102: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
103: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
104: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
105: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
106: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
107: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
108: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
109: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
110: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
111: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
112: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
113: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
114: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
115: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
116: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
117: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
118: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
119: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
120: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
121: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
122: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
123: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
124: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
125: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
126: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
127: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
128: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
129: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
130: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
131: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
132: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
133: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
134: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
135: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
136: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
137: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
138: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
139: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
140: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
141: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
142: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
143: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
144: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
145: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
146: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
147: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
148: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
149: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
150: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
151: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
152: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
153: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
154: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
155: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
156: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
157: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
158: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
159: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
160: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
161: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
162: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
163: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
164: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
165: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
166: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
167: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
168: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
169: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
170: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
171: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
172: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
173: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
174: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
175: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
176: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
177: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
178: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
179: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
180: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
181: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
182: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
183: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
184: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
185: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
186: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
187: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
188: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
189: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
190: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
191: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
192: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
193: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
194: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
195: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
196: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
197: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
198: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
199: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
200: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] = useState(0);
201: const [selectedPhotoToAddStorage, setSelectedPhotoToAddStorage] = useState<StoryItem | null>(null);
202: const [selectedPhotoToAddStorageIndex, setSelectedPhotoToAddStorageIndex] = useState(0);
203: const [selectedPhotoToDeleteStorage, setSelectedPhotoToDeleteStorage] = useState<StoryItem | null>(null);
204: const [selectedPhotoToDeleteStorageIndex, setSelectedPhotoToDeleteStorageIndex] =