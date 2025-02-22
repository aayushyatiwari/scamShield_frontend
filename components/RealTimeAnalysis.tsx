import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import SoundLevel from 'react-native-sound-level';
import { VoiceWaveform } from './VoiceWaveform';

interface RealTimeAnalysisProps {
  isActive: boolean;
}

export const RealTimeAnalysis: React.FC<RealTimeAnalysisProps> = ({ isActive }) => {
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const SMOOTHING_FACTOR = 0.9;
  const BASELINE = 0.05; // baseline amplitude when silence

  useEffect(() => {
    if (isActive) {
      // Start listening to the mic noise level
      SoundLevel.start();
      const onNewFrame = (data: { value: number }) => {
        // data.value is in dB (e.g., -160 dB silence to 0 dB loud)
        // Convert dB to a normalized amplitude (0 to 1)
        // For example, assuming -160 (silence) maps to BASELINE and 0 maps to 1.
        const normalized = Math.max(BASELINE, Math.min(1, (data.value + 160) / 160));
        setAmplitudes(prev => {
          const last = prev.length ? prev[prev.length - 1] : BASELINE;
          const smooth = last * SMOOTHING_FACTOR + normalized * (1 - SMOOTHING_FACTOR);
          const newData = [...prev, smooth];
          const maxPoints = Math.floor(Dimensions.get('window').width / 4);
          return newData.slice(-maxPoints);
        });
      };

      SoundLevel.onNewFrame(onNewFrame);

      return () => {
        SoundLevel.stop();
      };
    } else {
      // When inactive, set constant baseline
      const maxPoints = Math.floor(Dimensions.get('window').width / 4);
      setAmplitudes(Array(maxPoints).fill(BASELINE));
    }
  }, [isActive]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Real-Time Analysis</Text>
      <VoiceWaveform data={amplitudes} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold' },
});