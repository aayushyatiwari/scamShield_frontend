import { StyleSheet,ScrollView } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CallRecorder } from '@/components/CallRecorder';
import { LiveAnalysis } from '@/components/LiveAnalysis';
import { AlertDisplay } from '@/components/AlertDisplay';
import { ThemedView } from '@/components/ThemedView';
import { CallHeader } from '@/components/CallHeader';
import { CallAnalysisType } from '@/types';
import { StreamingRecorder } from '@/components/StreamingRecorder';
import { RealTimeAnalysis } from '@/components/RealTimeAnalysis';

export default function HomeScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [analysis, setAnalysis] = useState<CallAnalysisType | null>(null);
  const [streamingAlerts, setStreamingAlerts] = useState<string[]>([]);

  const handleStreamingAnalysis = (streamAnalysis: Partial<CallAnalysisType>) => {
    if (streamAnalysis.suspicious) {
      // Add new alerts to the list
      if (streamAnalysis.reasons) {
        setStreamingAlerts(prev => [...prev, ...streamAnalysis.reasons]);
      }
      
      // Show the analysis in the AlertDisplay
      setAnalysis({
        suspicious: true,
        confidence: streamAnalysis.confidence || 0.85,
        sentiments: streamAnalysis.sentiments || 'Neutral',
        reasons: streamAnalysis.reasons || [],
        timestamps: streamAnalysis.timestamps || []
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <CallHeader />
          
          <StreamingRecorder 
            onAnalysisReceived={handleStreamingAnalysis}
          />
          
          <CallRecorder 
            isRecording={isRecording}
            onRecordingStart={() => {
              setIsRecording(true);
              setStreamingAlerts([]);
            }}
            onRecordingStop={() => setIsRecording(false)}
            onAnalysisReceived={setAnalysis}
          />

          {isRecording && (
            <LiveAnalysis 
              isActive={isRecording}
              alerts={streamingAlerts}
            />
          )}

          {analysis && analysis.suspicious && (
            <AlertDisplay 
              analysis={analysis}
              onDismiss={() => setAnalysis(null)}
            />
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black', 
    
  },
  scrollContainer:{
    flex: 1,
    paddingVertical: 16,
  },
  container: {
    flex: 5,
    padding: 16,
    paddingVertical: 64,
  }
});