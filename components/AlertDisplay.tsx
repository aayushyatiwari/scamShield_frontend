// import { StyleSheet, View, TouchableOpacity } from "react-native";
// import { MaterialIcons } from "@expo/vector-icons";
// import { ThemedText } from "@/components/ThemedText";
// import { Colors } from "@/constants/Colors";
// import { CallAnalysisType } from "@/types";

// interface Props {
//   analysis: CallAnalysisType;
//   onDismiss: () => void;
// }

// export function AlertDisplay({ analysis, onDismiss }: Props) {
//   return (
//     <View style={styles.container}>
//       <View
//         style={[
//           styles.header,
//           analysis.suspicious ? styles.suspicious : styles.safe,
//         ]}
//       >
//         <MaterialIcons
//           name={analysis.suspicious ? "warning" : "verified-user"}
//           size={24}
//           color="white"
//         />
//         <ThemedText style={styles.headerText}>
//           {analysis.suspicious
//             ? "Suspicious Call Detected"
//             : "Call Appears Safe"}
//         </ThemedText>
//         <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
//           <MaterialIcons name="close" size={24} color="white" />
//         </TouchableOpacity>
//       </View>

//       {analysis.suspicious && (
//         <View style={styles.content}>
//           {analysis.reasons.map((reason, index) => (
//             <View key={index} style={styles.reasonItem}>
//               <MaterialIcons
//                 name="error-outline"
//                 size={20}
//                 color={Colors.danger}
//               />
//               <ThemedText style={styles.reasonText}>{reason}</ThemedText>
//             </View>
//           ))}

//           <ThemedText style={styles.confidenceText}>
//               Confidence: {(analysis.confidence * 100).toFixed(1)}%
//             </ThemedText>
//           <View style={styles.confidenceBar}>
//             <View
//               style={[
//                 styles.confidenceFill,
//                 { width: `${analysis.confidence * 100}%` },
//               ]}
//             />
            
//           </View>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     margin: 16,
//     borderRadius: 12,
//     backgroundColor: "white",
//     elevation: 4,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 16,
//     borderTopLeftRadius: 12,
//     borderTopRightRadius: 12,
//   },
//   suspicious: {
//     backgroundColor: Colors.danger,
//   },
//   safe: {
//     backgroundColor: Colors.success,
//   },
//   headerText: {
//     flex: 1,
//     color: "white",
//     fontSize: 16,
//     fontWeight: "600",
//     marginLeft: 8,
//   },
//   closeButton: {
//     padding: 4,
//   },
//   content: {
//     padding: 16,
//     gap: 12,
//   },
//   reasonItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     color: Colors.danger,
//   },
//   reasonText:{
//     color:"Black",
//     fontSize: 16,
//   },

//   confidenceBar: {
//     height: 4,
//     backgroundColor: "#E5E5EA",
//     borderRadius: 2,
//     marginTop: 16,
//     overflow: "hidden",
//   },
//   confidenceFill: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     bottom: 0,
//     backgroundColor: Colors.primary,
//   },
//   confidenceText: {
//     marginTop: 8,
//     textAlign: "center",
//     color:"Black"
//   },
// });
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

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
          opacity: slideAnim,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          analysis.suspicious ? styles.suspicious : styles.safe,
        ]}
      >
        <MaterialIcons
          name={analysis.suspicious ? "warning" : "verified-user"}
          size={28}
          color="white"
        />
        <ThemedText style={styles.headerText}>
          {analysis.suspicious
            ? "Suspicious Call Detected"
            : "Call Appears Safe"}
        </ThemedText>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {analysis.suspicious && (
        <View style={styles.content}>
          {analysis.reasons.map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <View style={styles.reasonIcon}>
                <MaterialIcons
                  name="error-outline"
                  size={20}
                  color={Colors.danger}
                />
              </View>
              <ThemedText style={styles.reasonText}>{reason}</ThemedText>
            </View>
          ))}

          <View style={styles.confidenceSection}>
            <ThemedText style={styles.confidenceText}>
              Confidence Level: {(analysis.confidence * 100).toFixed(0)}%
            </ThemedText>
            <View style={styles.confidenceBar}>
              <Animated.View
                style={[
                  styles.confidenceFill,
                  {
                    width: confidenceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
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
});