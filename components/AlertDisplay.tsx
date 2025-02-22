import { StyleSheet, View, TouchableOpacity, Animated } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { CallAnalysisType } from "@/types";
import { useEffect, useRef } from "react";

interface Props {
  analysis: CallAnalysisType;
  onDismiss: () => void;
}

export function AlertDisplay({ analysis, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const confidenceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // Confidence bar animation
    if (analysis.suspicious) {
      Animated.timing(confidenceAnim, {
        toValue: analysis.confidence,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, []);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  const formatTimestamp = (start: number, end: number) => {
    const formatSeconds = (sec: number) => {
      const minutes = Math.floor(sec / 60);
      const seconds = Math.floor(sec % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
    return `${formatSeconds(start)} - ${formatSeconds(end)}`;
  };

  return (
    <Animated.View style={[styles.container, /* existing styles */]}>
      <View style={[styles.header, analysis.suspicious ? styles.suspicious : styles.safe]}>
        <MaterialIcons
          name={analysis.suspicious ? "warning" : "verified-user"}
          size={28}
          color="white"
        />
        <ThemedText style={styles.headerText}>
          {analysis.suspicious ? "Suspicious Call Detected" : "Call Appears Safe"}
        </ThemedText>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {analysis.suspicious && (
        <View style={styles.content}>
          {/* Sentiment Section */}
          <View style={styles.sentimentSection}>
            <View style={styles.sentimentContent}>
              <MaterialIcons 
                name="mood" 
                size={24} 
                color={Colors.primary} 
                style={styles.sentimentIcon} 
              />
              <View>
                <ThemedText style={styles.sentimentLabel}>Sentiment Analysis</ThemedText>
                <ThemedText style={styles.sentimentValue}>{analysis.sentiments}</ThemedText>
              </View>
            </View>
          </View>

          {/* Reasons Section */}
          {analysis.reasons.map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <View style={styles.reasonIcon}>
                <MaterialIcons name="error-outline" size={20} color={Colors.danger} />
              </View>
              <ThemedText style={styles.reasonText}>{reason}</ThemedText>
            </View>
          ))}

          {/* Timestamps Section */}
          {analysis.timestamps && analysis.timestamps.length > 0 && (
            <View style={styles.timestampsSection}>
              <ThemedText style={styles.sectionTitle}>Detected Keywords:</ThemedText>
              {analysis.timestamps.map((timestamp, index) => (
                <View key={index} style={styles.timestampItem}>
                  <MaterialIcons
                    name="schedule"
                    size={18}
                    color={Colors.primary}
                    style={styles.timestampIcon}
                  />
                  <View style={styles.timestampContent}>
                    <ThemedText style={styles.timestampText}>
                      {timestamp.text}
                    </ThemedText>
                    <ThemedText style={styles.timestampType}>
                      {timestamp.type.toUpperCase()}
                    </ThemedText>
                    <ThemedText style={styles.timestampDetail}>
                      Time: {timestamp.start}s - {timestamp.end}s
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Confidence Section */}
          <View style={styles.confidenceSection}>
            <ThemedText style={styles.confidenceText}>
              Confidence: {(analysis.confidence * 100).toFixed(0)}%
            </ThemedText>
            <View style={styles.confidenceBar}>
              <Animated.View
                style={[
                  styles.confidenceFill,
                  {
                    width: confidenceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]}
              />
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: "white",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  suspicious: {
    backgroundColor: Colors.danger,
  },
  safe: {
    backgroundColor: Colors.success,
  },
  headerText: {
    flex: 1,
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  content: {
    padding: 20,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  reasonIcon: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    marginRight: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: "#333",
  },
  confidenceSection: {
    marginTop: 20,
  },
  confidenceText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: "#F2F2F7",
    borderRadius: 3,
    overflow: "hidden",
  },
  confidenceFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  timestampsSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  timestampItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timestampIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  timestampContent: {
    flex: 1,
  },
  timestampText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.primary,
    marginBottom: 4,
  },
  timestampType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timestampDetail: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  sentimentSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  sentimentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentimentIcon: {
    marginRight: 12,
  },
  sentimentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sentimentValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  }
});