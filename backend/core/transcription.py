import librosa
import numpy as np
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

def extract_notes_from_audio(audio_path: str):
    print(f"🎵 Analyzing: {audio_path}")
    
    try:
        # 1. LOAD AUDIO (Matches PDF Source)
        TARGET_SR = 16000 
        y, sr = librosa.load(audio_path, sr=TARGET_SR, mono=True)
        
        # Normalize
        rms = np.sqrt(np.mean(y**2))
        y_norm = y * ((10**(-20/20)) / (rms + 1e-9))

        # 2. PITCH DETECTION (pYIN with PDF Parameters)
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y_norm, 
            fmin=50, 
            fmax=1000, 
            sr=sr,
            frame_length=2048,
            hop_length=256
        )
        
        midi_pitch = librosa.hz_to_midi(np.nan_to_num(f0))
        midi_pitch[f0 == 0] = 0
        segments = []

        # 3. ONSET DETECTION (Strategy 1)
        onset_env = librosa.onset.onset_strength(y=y_norm, sr=sr)
        onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, backtrack=True)
        onset_times = librosa.frames_to_time(onsets, sr=sr)
        
        if len(onset_times) > 1:
            for j in range(len(onset_times)-1):
                t_start = onset_times[j]
                t_end = onset_times[j+1]
                idx_start = int(t_start * sr / 256)
                idx_end = int(t_end * sr / 256)
                
                if idx_end > idx_start and idx_end < len(midi_pitch):
                    segment_pitches = midi_pitch[idx_start:idx_end]
                    voiced = segment_pitches[segment_pitches > 0]
                    if len(voiced) > 0:
                        avg_pitch = int(round(np.median(voiced)))
                        segments.append({
                            "start": t_start,
                            "duration": t_end - t_start,
                            "pitch": avg_pitch,
                            "name": librosa.midi_to_note(avg_pitch, unicode=False)
                        })

        # 4. FALLBACK (Strategy 2 - Sustained Notes)
        if not segments:
            print("   ⚠️ Switching to Sustained Mode...")
            is_voiced = (midi_pitch > 0).astype(int)
            bounded = np.hstack(([0], is_voiced, [0]))
            difs = np.diff(bounded)
            starts = np.where(difs == 1)[0]
            ends = np.where(difs == -1)[0]
            times = librosa.times_like(f0, sr=sr, hop_length=256)

            for s, e in zip(starts, ends):
                if e > s:
                    dur = times[min(e, len(times)-1)] - times[s]
                    if dur > 0.1:
                        avg_pitch = int(round(np.median(midi_pitch[s:e])))
                        segments.append({
                            "start": times[s],
                            "duration": dur,
                            "pitch": avg_pitch,
                            "name": librosa.midi_to_note(avg_pitch, unicode=False)
                        })

        print(f"✅ Extracted {len(segments)} notes.")
        return segments

    except Exception as e:
        print(f"❌ Error in transcription: {e}")
        return []