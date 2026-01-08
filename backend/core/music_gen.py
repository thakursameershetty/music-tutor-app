import matplotlib
# --- CRITICAL: Set backend to non-interactive 'Agg' before importing pyplot ---
matplotlib.use('Agg') 
import matplotlib.pyplot as plt

from music21 import stream, note, tempo, meter, metadata
import tempfile
import os

def generate_musicxml(notes_data):
    """
    Converts a list of note dictionaries into MusicXML string.
    Uses makeMeasures() to ensure valid sheet music structure.
    """
    try:
        s = stream.Score()
        p = stream.Part()
        
        # 1. Setup Metadata
        s.insert(0, metadata.Metadata())
        s.metadata.title = "AI Music Tutor Transcription"
        s.metadata.composer = "User"

        # 2. Setup Tempo & Time Signature (Insert into Part, let music21 handle measures later)
        # 120 BPM = 2 Quarter notes per second
        p.append(meter.TimeSignature('4/4'))
        p.append(tempo.MetronomeMark(number=120))
        
        bpm = 120
        seconds_per_quarter = 60 / bpm
        current_position_quarters = 0.0
        
        for n_data in notes_data:
            # --- A. Data Retrieval ---
            pitch_name = n_data.get("name", "C4")
            # Safety replacement for symbols
            pitch_name = pitch_name.replace('♯', '#').replace('♭', 'b')
            
            start_sec = n_data.get("start", 0.0)
            duration_sec = n_data.get("duration", 1.0)
            
            # --- B. Timing Calculation ---
            # Convert Seconds -> Quarter Notes
            # Formula: time / seconds_per_quarter
            note_start_quarters = start_sec / seconds_per_quarter
            note_dur_quarters = duration_sec / seconds_per_quarter
            
            # Quantize duration to nearest 16th note (0.25)
            # We enforce a minimum duration of 0.25 so notes are visible
            q_duration = max(0.25, round(note_dur_quarters * 4) / 4)
            
            # --- C. Handle Rests (Gaps) ---
            # If the note starts significantly later than our current cursor, insert a Rest
            gap = note_start_quarters - current_position_quarters
            
            # If gap is larger than a 32nd note (0.125), add a rest
            if gap > 0.125:
                r = note.Rest()
                # Quantize the rest too
                r_dur = round(gap * 4) / 4
                if r_dur > 0:
                    r.quarterLength = r_dur
                    p.append(r)
                    current_position_quarters += r_dur
            
            # --- D. Create Note ---
            try:
                n = note.Note(pitch_name)
                n.quarterLength = q_duration
                p.append(n)
                
                # Advance cursor
                current_position_quarters += q_duration
                
                # Sync cursor to actual start time + duration to prevent drift
                # (Optional, but helps keep alignment with audio)
                current_position_quarters = max(current_position_quarters, note_start_quarters + q_duration)

            except Exception as e:
                print(f"Skipping invalid note: {pitch_name} - Error: {e}")
                continue

        # --- E. AUTOMATIC MEASURE CREATION ---
        # This is the magic function that fixes "Empty Sheet" issues.
        # It takes the long stream of notes/rests and chops them into 4/4 measures.
        p.makeMeasures(inPlace=True)
        s.append(p)

        # 3. Write to Temp File & Read Back
        with tempfile.NamedTemporaryFile(suffix=".musicxml", delete=False) as tmp:
            temp_path = tmp.name
            
        s.write('musicxml', fp=temp_path)
        
        with open(temp_path, 'r', encoding='utf-8') as f:
            xml_content = f.read()
            
        # Cleanup
        try:
            os.remove(temp_path)
        except OSError:
            pass
            
        return xml_content

    except Exception as e:
        print(f"Error generating MusicXML: {e}")
        return ""