import matplotlib
# --- CRITICAL: Set backend to non-interactive 'Agg' before importing pyplot ---
# This prevents "TclError: no display name" crashes on servers like Render.
matplotlib.use('Agg') 
import matplotlib.pyplot as plt

from music21 import stream, note, tempo, meter, metadata
import tempfile
import os

def generate_musicxml(notes_data):
    """
    Converts a list of note dictionaries into MusicXML string.
    """
    try:
        s = stream.Score()
        p = stream.Part()
        
        # Add Metadata
        s.insert(0, metadata.Metadata())
        s.metadata.title = "AI Music Tutor Transcription"
        s.metadata.composer = "User"

        # Setup Measure 1
        m1 = stream.Measure()
        m1.timeSignature = meter.TimeSignature('4/4')
        m1.append(tempo.MetronomeMark(number=120))
        p.append(m1) # Ensure the measure is added to the part
        
        for n_data in notes_data:
            # 1. Get name
            pitch_name = n_data.get("name", "C4")
            
            # 2. SAFETY FIX: Replace Unicode symbols just in case music21 doesn't like them
            pitch_name = pitch_name.replace('♯', '#').replace('♭', 'b')
            
            duration_sec = n_data.get("duration", 1.0)
            
            # 3. Create Note
            try:
                n = note.Note(pitch_name)
            except Exception as e:
                print(f"Skipping invalid note: {pitch_name} - Error: {e}")
                continue

            # Calculate duration (Simple quantization)
            # 120 BPM = 2 beats per second.
            quarter_len = duration_sec * (120 / 60)
            # Round to nearest 0.25 (16th note) to make sheet music readable
            n.quarterLength = max(0.25, round(quarter_len * 4) / 4)
            
            p.append(n)

        s.append(p)

        # 4. Write to Temp File & Read Back
        # music21 needs a file path to write XML, we can't write directly to string easily.
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
        # Return empty string or a basic valid XML failure response if needed
        return ""