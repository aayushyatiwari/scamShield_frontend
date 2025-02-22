import { StyleSheet, View, Switch, Alert } from 'react-native';
import { useAudioStreaming } from '@/hooks/useAudioStreaming';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useCallback, useState, useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export interface CallAnalysisType {
  suspicious: boolean;
  confidence: number;
  sentiments: string;
  reasons: string[];
  detected_keywords: string[];
  history?: string[];
}

interface Props {
  onAnalysisReceived: (analysis: Partial<CallAnalysisType>) => void;
}

export function StreamingRecorder({ onAnalysisReceived }: Props) {
  const [isEnabled, setIsEnabled] = useState(false);
  const { isStreaming, startStreaming, stopStreaming, error } = useAudioStreaming(
    useCallback((analysis) => {
      console.log('Received streaming analysis:', analysis);
      
      // Check if we have suspicious content and required fields
      if (analysis.suspicious) {
        const formattedAnalysis: CallAnalysisType = {
          suspicious: true,
          confidence: analysis.confidence || 0,
          sentiments: analysis.sentiments || 'Neutral',
          reasons: analysis.reasons || [],
          timestamps: analysis.timestamps?.map(t => ({
            start: t.start,
            end: t.end,
            text: t.text,
            type: t.type
          })) || []
        };

        console.log('Passing formatted analysis to parent:', formattedAnalysis);
        onAnalysisReceived(formattedAnalysis);
      }
    }, [onAnalysisReceived])
  );

  const toggleSwitch = useCallback(async () => {
    try {
      if (!isEnabled) {
        console.log('🎙️ Starting streaming...');
        await startStreaming();
        setIsEnabled(true);
      } else {
        console.log('⏹️ Stopping streaming...');
        await stopStreaming();
        setIsEnabled(false);
      }
    } catch (err) {
      console.error('❌ Failed to toggle streaming:', err);
      Alert.alert('Error', 'Failed to toggle streaming');
      setIsEnabled(false);
    }
  }, [isEnabled, startStreaming, stopStreaming]);

  // Reset enabled state if streaming stops unexpectedly
  useEffect(() => {
    if (!isStreaming && isEnabled) {
      setIsEnabled(false);
    }
  }, [isStreaming]);

  return (
    <View style={styles.container}>
      <View style={styles.switchContainer}>
        <ThemedText>Real-time Analysis</ThemedText>
        <Switch
          trackColor={{ false: '#767577', true: Colors.primary }}
          thumbColor={isEnabled ? '#ffffff' : '#f4f3f4'}
          onValueChange={toggleSwitch}
          value={isEnabled}
        />
      </View>
      {isStreaming && (
        <View style={styles.streamingIndicator}>
          <PulsingDot />
          <ThemedText style={styles.streamingText}>
            Live Analysis Active
          </ThemedText>
        </View>
      )}
    </View>
  );
}
function PulsingDot() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 })
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  streamingText: {
    fontSize: 14,
    color: Colors.danger,
  },
});