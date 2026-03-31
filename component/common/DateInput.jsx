import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform, TextInput } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function DateInput({ value, onChange }) {
  const [show, setShow] = useState(false);

  // WEB
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
        type="date" //  clé pour web
      />
    );
  }

  //  MOBILE
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
        <Text style={{ color: value ? "#000" : "#94A3B8" }}>
          {value || "Sélectionner une date"}
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShow(false);
            if (selectedDate) {
              onChange(selectedDate.toISOString().split("T")[0]);
            }
          }}
        />
      )}
    </View>
  );
}