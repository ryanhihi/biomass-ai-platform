import { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Button,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

// Same targets as web app
const TARGETS = [
  "Dry Clover (g)",
  "Dry Dead (g)",
  "Dry Green (g)",
  "Dry Total (g)",
  "Wet Total (g)",
];

// Backend base URL – comes from .env
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type PredictResult = {
  ok: boolean;
  outputs: Record<string, number>;
  recommend: boolean;
  imageFileId?: string;
  originalName?: string;
  error?: string;
};

export default function HomeScreen() {
  // Auth state
  const [email, setEmail] = useState("demo@demo.com");
  const [password, setPassword] = useState("demo123");
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Image + prediction state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);

  async function handleRegister() {
    try {
      setAuthLoading(true);
      const resp = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || "Register failed");
      }
      // Auto-login after register
      await handleLogin();
    } catch (err) {
      Alert.alert(
        "Register error",
        err instanceof Error ? err.message : "Register failed"
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin() {
    try {
      setAuthLoading(true);
      const resp = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok || !data.token) {
        throw new Error(data.error || "Login failed");
      }
      setToken(data.token);
      Alert.alert("Logged in", `You are logged in as ${email}`);
    } catch (err) {
      Alert.alert(
        "Login error",
        err instanceof Error ? err.message : "Login failed"
      );
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
  }

  async function pickImageFromLibrary() {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Media library access is needed.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!res.canceled && res.assets.length > 0) {
      setImageUri(res.assets[0].uri);
      setResult(null);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera access is needed.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (!res.canceled && res.assets.length > 0) {
      setImageUri(res.assets[0].uri);
      setResult(null);
    }
  }

  async function handlePredict() {
    if (!token) {
      Alert.alert("Login required", "Please login first.");
      return;
    }
    if (!imageUri) {
      Alert.alert("Image required", "Please pick or take a photo first.");
      return;
    }

    try {
      setPredictLoading(true);
      setResult(null);

      const form = new FormData();
      form.append("image", {
        uri: imageUri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      // Do NOT set Content-Type manually; RN will add the correct boundary.

      const resp = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers,
        body: form,
      });

      const data: PredictResult = await resp.json();

      if (!resp.ok || !data.ok) {
        throw new Error(data.error || "Prediction failed");
      }

      setResult(data);
    } catch (err) {
      Alert.alert(
        "Predict error",
        err instanceof Error ? err.message : "Prediction failed"
      );
    } finally {
      setPredictLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
    source={require("@/assets/images/logo.png")}
    style={styles.logo}
    resizeMode="contain"
  />
      <ThemedText type="title">🌱 Pasture GURU Biomass App</ThemedText>
      <ThemedText>
        Image-only biomass estimation using trained TensorFlow model.
      </ThemedText>

      {/* Auth block */}
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Authentication</ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.row}>
          <View style={styles.rowButton}>
            <Button title="Login" onPress={handleLogin} disabled={authLoading} />
          </View>
          <View style={styles.rowButton}>
            <Button
              title="Register"
              onPress={handleRegister}
              disabled={authLoading}
            />
          </View>
        </View>

        {token ? (
          <View style={styles.loggedInRow}>
            <ThemedText>✅ Logged in</ThemedText>
            <Button title="Logout" onPress={handleLogout} />
          </View>
        ) : (
          <ThemedText style={styles.hint}>
            Use the same email / password as the web app.
          </ThemedText>
        )}

        {authLoading && <ActivityIndicator style={{ marginTop: 8 }} />}
      </ThemedView>

      {/* Image + predict block */}
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Capture or upload image</ThemedText>
        <ThemedText style={styles.hint}>
          You can pick from gallery or open the camera.
        </ThemedText>

        <View style={styles.row}>
          <View style={styles.rowButton}>
            <Button title="Pick from gallery" onPress={pickImageFromLibrary} />
          </View>
          <View style={styles.rowButton}>
            <Button title="Take photo" onPress={takePhoto} />
          </View>
        </View>

        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        )}

        <View style={{ marginTop: 12 }}>
          <Button
            title={predictLoading ? "Predicting..." : "Predict"}
            onPress={handlePredict}
            disabled={predictLoading || !imageUri}
          />
        </View>

        {predictLoading && <ActivityIndicator style={{ marginTop: 8 }} />}
      </ThemedView>

      {/* Results */}
      {result && (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Results</ThemedText>
          <ThemedText>
            Recommendation:{" "}
            {result.recommend ? "✅ Recommend" : "❌ Not recommend"}
          </ThemedText>

          {TARGETS.map((label) => (
            <ThemedText key={label}>
              <ThemedText type="defaultSemiBold">{label}:</ThemedText>{" "}
              {Number(result.outputs?.[label] ?? 0).toFixed(2)} g
            </ThemedText>
          ))}
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    gap: 8,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 12,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  rowButton: {
    flex: 1,
  },
  loggedInRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    opacity: 0.8,
  },
  preview: {
    marginTop: 12,
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
  },
});
