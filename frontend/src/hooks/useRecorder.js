import { useState, useRef } from 'react';

const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 1. Setup Audio Context for Visualizer
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256; 
      source.connect(analyserNode);
      setAnalyser(analyserNode);

      // 2. Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        
        // Cleanup Audio Context & Stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        setAnalyser(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return { isRecording, startRecording, stopRecording, audioBlob, analyser };
};

export default useRecorder;