import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Platform, TextInput } from "react-native";
import { Calendar } from "react-native-calendars";

export default function DateInput({ value, onChange }) {
  const [show, setShow] = useState(false);

  if (Platform.OS === "web") {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        style={{
          borderWidth: 1.5,
          borderColor: "#E2E8F0",
          padding: 16,
          borderRadius: 16,
          backgroundColor: "#F8FAFC",
        }}
      />
    );
  }

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{
          borderWidth: 1.5,
          borderColor: "#E2E8F0",
          padding: 16,
          borderRadius: 16,
          backgroundColor: "#F8FAFC",
        }}
      >
        <Text style={{ color: value ? "#0F172A" : "#94A3B8" }}>
          {value || "Sélectionner une date"}
        </Text>
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}>
          <View style={{
            backgroundColor: "#FFF",
            borderRadius: 16,
            padding: 10,
            width: "90%",
          }}>
            <Calendar
              current={value || undefined}
              maxDate={new Date().toISOString().split("T")[0]}
              markedDates={value ? { [value]: { selected: true, selectedColor: "#3B82F6" } } : {}}
              onDayPress={(day) => {
                onChange(day.dateString);
                setShow(false);
              }}
              theme={{
                selectedDayBackgroundColor: "#3B82F6",
                todayTextColor: "#3B82F6",
                arrowColor: "#3B82F6",
              }}
            />
            <TouchableOpacity
              onPress={() => setShow(false)}
              style={{
                alignItems: "center",
                padding: 12,
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#EF4444", fontWeight: "600" }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}