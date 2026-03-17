import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View, Modal, Pressable, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { getProfile, updateProfile } from "../src/storage";

type Option = { label: string; value: number };

function SelectModal({
  visible, title, options, onPick, onClose,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  onPick: (v: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", padding: 18, justifyContent: "center" }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14 }}>
          <Text style={{ fontWeight: "900", fontSize: 18, color: "#000" }}>{title}</Text>
          <FlatList
            style={{ marginTop: 10, maxHeight: 360 }}
            data={options}
            keyExtractor={(i) => String(i.value)}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onPick(item.value)}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" }}
              >
                <Text style={{ color: "#000", fontWeight: "900" }}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function AgeScreen() {
  const router = useRouter();
  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);

  const [openDay, setOpenDay] = useState(false);
  const [openMonth, setOpenMonth] = useState(false);
  const [openYear, setOpenYear] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (p.dob) {
        setDay(p.dob.day);
        setMonth(p.dob.month);
        setYear(p.dob.year);
      }
    })();
  }, []);

  const dayOpts = useMemo(() => Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 })), []);
  const monthOpts = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), value: i + 1 })), []);
  const yearOpts = useMemo(() => {
    const now = new Date().getFullYear();
    const min = now - 80;
    const max = now - 13;
    const arr: Option[] = [];
    for (let y = max; y >= min; y--) arr.push({ label: String(y), value: y });
    return arr;
  }, []);

  const canSave = !!day && !!month && !!year;

  const save = async () => {
    if (!canSave) return;
    await updateProfile({ dob: { day: day!, month: month!, year: year! } });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
      <Text style={{ fontSize: 26, fontWeight: "900", color: "#000" }}>Tu edad</Text>
      <Text style={{ marginTop: 8, opacity: 0.75, color: "#000" }}>
        Se usa para mejorar matches. No mostramos tu fecha exacta.
      </Text>

      <View style={{ marginTop: 16, gap: 10 }}>
        <TouchableOpacity onPress={() => setOpenDay(true)} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 14 }}>
          <Text style={{ color: "#000", fontWeight: "900" }}>Día: {day ?? "-"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setOpenMonth(true)} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 14 }}>
          <Text style={{ color: "#000", fontWeight: "900" }}>Mes: {month ?? "-"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setOpenYear(true)} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 14 }}>
          <Text style={{ color: "#000", fontWeight: "900" }}>Año: {year ?? "-"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={save}
          disabled={!canSave}
          style={{ backgroundColor: canSave ? "#000" : "#ddd", padding: 14, borderRadius: 12 }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>Guardar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={{ padding: 10 }}>
          <Text style={{ color: "#000", textAlign: "center", opacity: 0.75 }}>Volver</Text>
        </TouchableOpacity>
      </View>

      <SelectModal visible={openDay} title="Elegí día" options={dayOpts} onPick={(v) => { setDay(v); setOpenDay(false); }} onClose={() => setOpenDay(false)} />
      <SelectModal visible={openMonth} title="Elegí mes" options={monthOpts} onPick={(v) => { setMonth(v); setOpenMonth(false); }} onClose={() => setOpenMonth(false)} />
      <SelectModal visible={openYear} title="Elegí año" options={yearOpts} onPick={(v) => { setYear(v); setOpenYear(false); }} onClose={() => setOpenYear(false)} />
    </SafeAreaView>
  );
}
