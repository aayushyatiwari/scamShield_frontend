//// filepath: /home/pavan/Desktop/Everything/pict_call/components/VoiceWaveform.tsx
import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

interface VoiceWaveformProps {
  data: number[];
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ data }) => {
  const { width } = Dimensions.get('window');
  const height = 100;
  const pointSpacing = 4; // pixels between points
  const points = data
    .map((amp, index) => {
      // Map amplitude (0..1) to a y-coordinate (centered on height/2)
      const x = index * pointSpacing;
      const y = height / 2 - amp * (height / 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline
          points={points}
          fill="none"
          stroke="blue"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
});