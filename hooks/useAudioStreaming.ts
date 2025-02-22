import { useState, useEffect, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { CallAnalysisType } from '../types';
import { StreamingAnalyzer } from '../services/StreamingAnalyzer';
import { FFmpegKit } from 'ffmpeg-kit-react-native';
import { Platform } from 'react-native'; 
const CHUNK_DURATION = 5000; // Changed from 3000ms to 5000ms for more context

// Add these helper functions at the top of the file
const createWavHeader = (pcmDataLength: number): ArrayBuffer => {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;

  // RIFF identifier
  view.setUint32(0, 0x52494646, false);  // 'RIFF'
  // file length minus RIFF header
  view.setUint32(4, 36 + pcmDataLength, true);
  // WAVE identifier
  view.setUint32(8, 0x57415645, false);  // 'WAVE'
  // fmt chunk identifier
  view.setUint32(12, 0x666d7420, false); // 'fmt '
  // fmt chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
  // block align
  view.setUint16(32, numChannels * bitsPerSample / 8, true);
  // bits per sample
  view.setUint16(34, bitsPerSample, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // 'data'
  // data chunk length
  view.setUint32(40, pcmDataLength, true);

  return buffer;
};


export function useAudioStreaming(onAnalysisUpdate: (analysis: Partial<CallAnalysisType>) => void) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const analyzerRef = useRef<StreamingAnalyzer | null>(null);
  const chunkCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupInProgressRef = useRef(false);
  const analysisHistoryRef = useRef<Array<Partial<CallAnalysisType>>>([]);
  // Use a ref that gets updated synchronously for streaming status.
  const streamingRef = useRef<boolean>(false);

  const cleanupRecording = async () => {
    if (cleanupInProgressRef.current) {
      console.log('🚫 Cleanup already in progress, skipping...');
      return;
    }
    
    cleanupInProgressRef.current = true;
    console.log('🧹 Starting cleanup...');
    
    try {
      // Clear any pending retries
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Stop and unload any existing recording
      if (recordingRef.current) {
        const recording = recordingRef.current;
        recordingRef.current = null;
        
        try {
          await recording.stopAndUnloadAsync();
        } catch (err) {
          console.warn('⚠️ Warning during recording cleanup:', err);
        }
      }

      // Reset audio system more thoroughly
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      
      await Audio.setIsEnabledAsync(false);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await Audio.setIsEnabledAsync(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('✨ Cleanup completed');
    } catch (err) {
      console.error('❌ Error during cleanup:', err);
      throw err;
    } finally {
      cleanupInProgressRef.current = false;
    }
  };

const processRecording = async (recording: Audio.Recording) => {
  try {
    const uri = recording.getURI();
    if (!uri) return;
    
    console.log('Processing audio file:', uri);

    // Read the audio file directly
    const base64Content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64
    });

    // Send the complete audio in one chunk for iOS
    if (Platform.OS === 'ios') {
      if (analyzerRef.current) {
        await analyzerRef.current.sendAudio(base64Content);
      }
    } else {
      // For Android, split into chunks
      const chunkSize = 32 * 1024; // 32KB chunks
      let position = 0;

      if (analyzerRef.current) {
        while (position < base64Content.length) {
          const chunk = base64Content.slice(position, position + chunkSize);
          await analyzerRef.current.sendAudio(chunk);
          position += chunkSize;
        }
      }
    }

    // Cleanup temporary file
    try {
      await FileSystem.deleteAsync(uri);
      console.log(`🗑️ Cleaned up temporary file: ${uri}`);
    } catch (err) {
      console.warn('⚠️ Failed to delete temporary file:', err);
    }
  } catch (err) {
    console.error('❌ Error in processRecording:', err);
  }
};

  const startRecording = async () => {
    console.log('Checking recording preconditions:', {
      streaming: streamingRef.current,
      initializing: isInitializing,
      cleanupInProgress: cleanupInProgressRef.current
    });

    if (!streamingRef.current || isInitializing || cleanupInProgressRef.current) {
      console.log('⏳ Skipping recording - not ready:', {
        streaming: streamingRef.current,
        initializing: isInitializing,
        cleanupInProgress: cleanupInProgressRef.current
      });
      return;
    }

    try {
      console.log('🎯 Starting new recording chunk...');
      
      // Double check audio mode before starting
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      // Update the recording options
      const recordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_WEBM_OPUS,  // Changed
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_OPUS,       // Changed
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,          // Changed
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
          audioQualityIOSLow: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH    // Added
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        }
      };

      // Use these options when preparing recording
      await recording.prepareToRecordAsync(recordingOptions);

      recordingRef.current = recording;
      console.log('✅ Recording prepared successfully');

      // Start recording immediately
      await recording.startAsync();
      console.log(`✅ Chunk #${chunkCountRef.current + 1} recording started`);

      recording.setProgressUpdateInterval(500);
      recording.setOnRecordingStatusUpdate(async (status) => {
        if (!streamingRef.current || !recordingRef.current) {
          return;
        }
        // Only process when the recording duration meets the threshold
        if (status.isRecording && status.durationMillis >= CHUNK_DURATION) {
          chunkCountRef.current++;
          console.log(`📊 Processing chunk #${chunkCountRef.current} (${status.durationMillis}ms)`);
          try {
            const currentRecording = recordingRef.current;
            recordingRef.current = null;
            await currentRecording.stopAndUnloadAsync();
            await processRecording(currentRecording);
            // Start next recording before cleanup
            if (streamingRef.current) {
              startRecording().catch(console.error);
            }
          } catch (err) {
            console.error(`❌ Error processing chunk #${chunkCountRef.current}:`, err);
            if (streamingRef.current) {
              retryTimeoutRef.current = setTimeout(() => startRecording(), 1000);
            }
          }
        }
      });
    } catch (err) {
      console.error('❌ Failed to start recording chunk:', err);
      if (streamingRef.current && !cleanupInProgressRef.current) {
        retryTimeoutRef.current = setTimeout(() => startRecording(), 1000);
      }
    }
  };

  const stopStreaming = useCallback(async () => {
    console.log('🛑 Stopping streaming...');
    streamingRef.current = false;
    setIsStreaming(false);
    
    // Clear any pending retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    try {
      if (analyzerRef.current) {
        analyzerRef.current.disconnect();
        analyzerRef.current = null;
      }

      await cleanupRecording();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
      });

      analysisHistoryRef.current = [];
      chunkCountRef.current = 0;
      console.log('✅ Streaming stopped and cleaned up');
    } catch (err) {
      console.error('❌ Error stopping streaming:', err);
    }
  }, []);

  const startStreaming = useCallback(async () => {
    try {
      // Set streaming state first
      streamingRef.current = true;
      setIsStreaming(true);
      
      // Initialize analyzer with WebSocket
      analyzerRef.current = new StreamingAnalyzer(
        (analysis) => {
          console.log('📊 Received analysis:', analysis);
          onAnalysisUpdate(analysis);
        },
        (error) => {
          console.error('❌ Analyzer error:', error);
          setError(error);
        }
      );

      // Connect WebSocket
      await analyzerRef.current.connect();

      // Start recording after WebSocket is connected
      await startRecording();
    } catch (err) {
      console.error('Failed to start streaming:', err);
      // Reset states on error
      streamingRef.current = false;
      setIsStreaming(false);
      if (analyzerRef.current) {
        analyzerRef.current.disconnect();
        analyzerRef.current = null;
      }
    }
  }, [onAnalysisUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    isStreaming,
    startStreaming,
    stopStreaming,
    error,
  };
}