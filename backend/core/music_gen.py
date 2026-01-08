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
        
        s.insert(0, metadata.Metadata())
        s.metadata.title = "AI Music Tutor Transcription"
        s.metadata.composer = "User"

        m1 = stream.Measure()
        m1.timeSignature = meter.TimeSignature('4/4')
        m1.append(tempo.MetronomeMark(number=120))
        
        for n_data in notes_data:
            # 1. Get name
            pitch_name = n_data.get("name", "C4")
            
            # 2. SAFETY FIX: Replace Unicode symbols just in case
            pitch_name = pitch_name.replace('♯', '#').replace('♭', 'b')
            
            duration_sec = n_data.get("duration", 1.0)
            
            # 3. Create Note
            try:
                n = note.Note(pitch_name)
            except:
                print(f"Skipping invalid note: {pitch_name}")
                continue

            # Calculate duration
            quarter_len = duration_sec * (120 / 60)
            n.quarterLength = max(0.25, round(quarter_len * 4) / 4)
            
            p.append(n)

        s.append(p)

        # 4. Write to Temp File & Read Back (Required for music21)
        with tempfile.NamedTemporaryFile(suffix=".musicxml", delete=False) as tmp:
            temp_path = tmp.name
            
        s.write('musicxml', fp=temp_path)
        
        with open(temp_path, 'r', encoding='utf-8') as f:
            xml_content = f.read()
            
        try:
            os.remove(temp_path)
        except:
            pass
            
        return xml_content

    except Exception as e:
        print(f"Error generating MusicXML: {e}")
        return ""