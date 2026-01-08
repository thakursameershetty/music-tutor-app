from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import Response, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import shutil
import os
import json
import uuid  # For unique filenames

from core.transcription import extract_notes_from_audio
from core.music_gen import generate_musicxml
from core.feedback import calculate_feedback, save_reference_melody, generate_performance_pdf
from core import models, database, auth

# --- 1. DATABASE INIT ---
# This creates the tables if they don't exist
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# --- 2. CORS SETUP ---
# Allow everything for local development. 
# If deploying to Vercel separately, you would restrict this, 
# but since we are serving frontend from backend, "*" is fine.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. STORAGE SETUP ---
os.makedirs("storage/audio_samples", exist_ok=True)
os.makedirs("storage/history", exist_ok=True)

# --- 4. AUTH ENDPOINTS ---

@app.post("/api/register")
def register(user_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(auth.get_db)):
    # Check if user exists
    existing = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create User
    hashed_pw = auth.get_password_hash(user_data.password)
    new_user = models.User(username=user_data.username, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    return {"status": "success", "message": "User created"}

@app.post("/api/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(auth.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/me/history")
def get_history(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(auth.get_db)):
    # Fetch history specifically for this user
    history = db.query(models.History).filter(models.History.user_id == current_user.id).order_by(models.History.date.desc()).all()
    return history

# --- 5. CORE APP ENDPOINTS ---

@app.post("/api/teach")
async def teach_lesson(file: UploadFile = File(...)):
    try:
        file_location = "storage/audio_samples/teacher_reference.wav"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        teacher_notes = extract_notes_from_audio(file_location)
        if not teacher_notes:
            return {"status": "error", "message": "No notes detected."}

        save_reference_melody(teacher_notes)
        xml_content = generate_musicxml(teacher_notes)

        return {"status": "success", "mode": "teacher", "notes": teacher_notes, "musicxml": xml_content}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze")
async def analyze_student(
    file: UploadFile = File(...), 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(auth.get_db)
):
    try:
        # 1. Save Temporary File for Processing
        temp_location = "storage/audio_samples/student_attempt.wav"
        with open(temp_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 2. Analyze
        student_notes = extract_notes_from_audio(temp_location)
        feedback = calculate_feedback(student_notes, temp_location)
        xml_content = generate_musicxml(student_notes)
        
        full_response = {
            "status": "success",
            "mode": "student",
            "notes": student_notes,
            "musicxml": xml_content,
            "feedback": feedback
        }

        # 3. SAVE TO HISTORY (Persistent)
        # Generate unique filename to avoid overwriting
        unique_filename = f"{current_user.id}_{uuid.uuid4()}.wav"
        history_path = f"storage/history/{unique_filename}"
        shutil.copy(temp_location, history_path)

        # Save DB Entry
        new_attempt = models.History(
            score=feedback['score'],
            feedback_summary=feedback['comments'][0],
            audio_filename=unique_filename,
            analysis_data=json.dumps(full_response), # Save full JSON so we can reload it later
            user_id=current_user.id
        )
        db.add(new_attempt)
        db.commit()

        return full_response

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/report")
async def get_report():
    try:
        student_path = "storage/audio_samples/student_attempt.wav"
        if not os.path.exists(student_path):
             raise HTTPException(status_code=404, detail="No student recording found")
        
        student_notes = extract_notes_from_audio(student_path)
        feedback = calculate_feedback(student_notes, student_path)
        
        pdf_buffer = generate_performance_pdf(student_path, feedback['score'], feedback['detailed_breakdown'])
        if not pdf_buffer: 
            raise HTTPException(status_code=500, detail="Failed to generate PDF")
            
        return Response(content=pdf_buffer.read(), media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=Report.pdf"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 6. AUDIO SERVING (For History Playback) ---
@app.get("/api/audio/{filename}")
def get_audio(filename: str):
    path = f"storage/history/{filename}"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(path)

# --- 7. SERVE FRONTEND (STATIC FILES) ---
# This must be the LAST part of the file.
# It serves the React app for any route that isn't an API route.

frontend_path = "../frontend/dist"

if os.path.exists(frontend_path):
    # Mount assets (JS, CSS, Images)
    app.mount("/assets", StaticFiles(directory=f"{frontend_path}/assets"), name="assets")

    # Catch-all route for React Router (Single Page Application support)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # 1. If it's an API call that wasn't caught above, return 404 (don't serve HTML)
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API Endpoint Not Found")
        
        # 2. If it's a specific file (like favicon.ico), serve it
        file_path = os.path.join(frontend_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # 3. Otherwise, serve index.html (React handles the routing)
        return FileResponse(f"{frontend_path}/index.html")
else:
    print("WARNING: Frontend build folder not found. Did you run 'npm run build'?")