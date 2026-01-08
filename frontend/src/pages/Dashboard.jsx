import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import {
    Mic, Square, Loader2, Music, CheckCircle,
    XCircle, GraduationCap, School, Save, Sparkles,
    Zap, BarChart3, ChevronRight, Upload, History,
    Play, Pause, RefreshCw, Volume2, LayoutTemplate,
    Eye, EyeOff, RotateCcw, MousePointer2, Download,
    LogOut, User as UserIcon, Calendar, ChevronDown
} from 'lucide-react';
import { OrbitControls, Stars, Float } from '@react-three/drei';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis, Label
} from 'recharts';

import useRecorder from '../hooks/useRecorder';
import SheetMusic from '../components/SheetMusic';
import AudioOrb from '../components/canvas/AudioOrb';
import GlassCard from '../components/ui/GlassCard';
import { getApiUrl } from '../api';

// --- PIANO ROLL BAR SHAPE ---
const PianoRollBar = (props) => {
    const { cx, cy, payload, focusMode } = props;
    const barWidth = payload.duration * 40;
    const baseColor = payload.type === 'teacher' ? '#2f5aff' : '#ff0055';

    let opacity = 0.8;
    if (focusMode !== 'all') {
        if (focusMode !== payload.type) opacity = 0.1;
        else opacity = 1.0;
    }

    return <rect x={cx} y={cy - 5} width={Math.max(barWidth, 5)} height={10} fill={baseColor} rx={3} opacity={opacity} />;
};

// --- AUDIO PLAYER COMPONENT ---
const AudioPlayerButton = React.forwardRef(({ audioUrl, label, colorClass = "text-white" }, ref) => {
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlay = () => {
        if (!ref.current) return;
        if (playing) ref.current.pause();
        else ref.current.play();
        setPlaying(!playing);
    };

    const formatTime = (time) => {
        if (!time) return "0:00";
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? '0' + sec : sec}`;
    };

    useEffect(() => {
        const audio = ref.current;
        if (audio) {
            const handleState = () => setPlaying(!audio.paused);
            const handleTime = () => setCurrentTime(audio.currentTime);

            audio.addEventListener('play', handleState);
            audio.addEventListener('pause', handleState);
            audio.addEventListener('ended', () => setPlaying(false));
            audio.addEventListener('timeupdate', handleTime);
            return () => {
                audio.removeEventListener('play', handleState);
                audio.removeEventListener('pause', handleState);
                audio.removeEventListener('ended', () => setPlaying(false));
                audio.removeEventListener('timeupdate', handleTime);
            };
        }
    }, [ref]);

    return (
        <div className="flex items-center gap-3">
            <button onClick={togglePlay} className={`flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all ${playing ? 'scale-90 bg-white/30' : 'scale-100'}`}>
                {playing ? <Pause className={`w-3 h-3 ${colorClass}`} /> : <Play className={`w-3 h-3 ${colorClass} ml-0.5`} />}
            </button>
            <div className="flex flex-col">
                {label && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">{label}</span>}
                <span className="text-xs font-mono text-white/80 leading-none">{formatTime(currentTime)}</span>
            </div>
            <audio ref={ref} src={audioUrl} preload="auto" crossOrigin="anonymous" />
        </div>
    );
});

const Dashboard = () => {
    const navigate = useNavigate();
    const { isRecording, startRecording, stopRecording, audioBlob, analyser } = useRecorder();
    const [status, setStatus] = useState('idle');
    const [mode, setMode] = useState('teacher');
    const [teacherData, setTeacherData] = useState(null);
    const [studentData, setStudentData] = useState(null);
    const [teacherAudioURL, setTeacherAudioURL] = useState(null);
    const [studentAudioURL, setStudentAudioURL] = useState(null);

    // Profile & History State
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [isDownloading, setIsDownloading] = useState(false);

    // Refs for Audio Sync
    const teacherAudioRef = useRef(null);
    const studentAudioRef = useRef(null);

    const [focusMode, setFocusMode] = useState('all');
    const [isScrubbingEnabled, setIsScrubbingEnabled] = useState(false);

    // --- AUDIO "PRIMING" (Unlock Browser Autoplay) ---
    const toggleScrubbing = async () => {
        const newState = !isScrubbingEnabled;
        setIsScrubbingEnabled(newState);

        if (newState) {
            const prime = async (ref) => {
                if (ref.current) {
                    try {
                        const vol = ref.current.volume;
                        ref.current.volume = 0; // Mute
                        await ref.current.play();
                        ref.current.pause();
                        ref.current.currentTime = 0;
                        ref.current.volume = vol; // Restore volume
                    } catch (e) { console.log("Audio prime failed", e); }
                }
            };
            await prime(teacherAudioRef);
            await prime(studentAudioRef);
        }
    };

    const handleGraphMouseEnter = () => {
        if (!isScrubbingEnabled) return;
        const playSafe = (ref) => {
            if (ref.current && ref.current.paused) {
                ref.current.play().catch(e => { });
            }
        };
        if (focusMode === 'all' || focusMode === 'teacher') playSafe(teacherAudioRef);
        if (focusMode === 'all' || focusMode === 'student') playSafe(studentAudioRef);
        if (focusMode === 'teacher' && studentAudioRef.current) studentAudioRef.current.pause();
        if (focusMode === 'student' && teacherAudioRef.current) teacherAudioRef.current.pause();
    };

    const handleGraphMouseMove = (state) => {
        if (!isScrubbingEnabled || !state || !state.activePayload) return;
        const time = state.activePayload[0].payload.seconds;
        if (time === undefined) return;
        const seek = (ref) => {
            if (ref.current && Math.abs(ref.current.currentTime - time) > 0.1) {
                ref.current.currentTime = time;
            }
        };
        if (focusMode === 'all' || focusMode === 'teacher') seek(teacherAudioRef);
        if (focusMode === 'all' || focusMode === 'student') seek(studentAudioRef);
    };

    const handleGraphMouseLeave = () => {
        if (teacherAudioRef.current) teacherAudioRef.current.pause();
        if (studentAudioRef.current) studentAudioRef.current.pause();
    };

    // --- History Fetching ---
    const fetchHistory = async () => {
        const token = localStorage.getItem('musicTutorToken');
        if (!token) return;
        try {
            const response = await fetch(getApiUrl('/api/me/history'), { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            } else if (response.status === 401) handleLogout();
        } catch (e) { console.error("History fetch error:", e); }
    };

    useEffect(() => { fetchHistory(); }, []);

    // --- Load Old Session ---
    const loadHistoryItem = (item) => {
        try {
            const savedData = JSON.parse(item.analysis_data);
            setStudentData(savedData);
            setStudentAudioURL(getApiUrl(`/api/audio/${item.audio_filename}`));
            setMode('student');
            setIsProfileOpen(false);
        } catch (e) {
            console.error("Error loading history:", e);
            alert("Could not load this session data.");
        }
    };

    useEffect(() => {
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            if (mode === 'teacher') setTeacherAudioURL(url);
            else setStudentAudioURL(url);
            handleUpload(audioBlob);
        }
    }, [audioBlob]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            if (mode === 'teacher') setTeacherAudioURL(url);
            else setStudentAudioURL(url);
            handleUpload(file);
        }
    };

    const handleUpload = async (fileBlob) => {
        setStatus('processing');
        const formData = new FormData();
        
        let fileName = 'recording.webm'; // Default for mic recording
        
        // 🚨 INTELLIGENT FORMAT HANDLING 🚨
        if (fileBlob.name) {
            // It's a FILE UPLOAD (mp3, flac, etc.) -> Use original name
            fileName = fileBlob.name;
        } else {
             // It's a MIC RECORDING -> Use blob type
             const ext = fileBlob.type.includes('wav') ? 'wav' : 'webm';
             fileName = `recording.${ext}`;
        }
        
        formData.append('file', fileBlob, fileName);
        
        const endpoint = mode === 'teacher' 
            ? getApiUrl('/api/teach') 
            : getApiUrl('/api/analyze');
            
        const token = localStorage.getItem('musicTutorToken');

        try {
            const response = await fetch(endpoint, {
                method: 'POST', body: formData, headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (response.status === 401) { handleLogout(); return; }
            
            if (!response.ok) {
                console.error("Server Error:", response.status);
                setStatus('error');
                return;
            }

            const data = await response.json();

            if (data.status === 'success') {
                setStatus('success');
                if (mode === 'teacher') setTeacherData(data);
                else {
                    setStudentData(data);
                    fetchHistory();
                }
            } else { setStatus('error'); }
        } catch (e) { console.error(e); setStatus('error'); }
    };

    const handleDownloadReport = async () => {
        setIsDownloading(true);
        const token = localStorage.getItem('musicTutorToken');
        try {
            const response = await fetch(getApiUrl('/api/report'), {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "MusicTutor_Report.pdf";
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                console.error("Failed to download");
            }
        } catch (e) {
            console.error(e);
        }
        setIsDownloading(false);
    };

    const handleLogout = () => { localStorage.removeItem('musicTutorToken'); navigate('/'); };
    const resetStudentAttempt = () => { setStudentData(null); setStudentAudioURL(null); setStatus('idle'); };
    const switchMode = (newMode) => { setMode(newMode); setStatus('idle'); };
    const getScoreColor = (score) => {
        if (score >= 80) return "text-neon-green";
        if (score >= 50) return "text-neon-yellow";
        return "text-neon-pink";
    };

    const AnalysisTopBar = () => (
        <GlassCard className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl mb-6 overflow-visible">
            <div className="flex items-center gap-4">
                <button onClick={resetStudentAttempt} className="p-2 hover:bg-white/10 rounded-full transition-colors group" title="Back to Dashboard">
                    <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-white rotate-90" />
                </button>

                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <LayoutTemplate className="w-4 h-4 text-neon-cyan" />
                        <h3 className="font-bold text-white uppercase tracking-wider text-xs">Analysis Report</h3>
                    </div>
                    {studentAudioURL && (
                        <div className="mt-1">
                            <AudioPlayerButton ref={studentAudioRef} audioUrl={studentAudioURL} label="" colorClass="text-neon-pink" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={handleDownloadReport} disabled={isDownloading} className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs font-bold border border-white/5">
                    {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Download PDF
                </button>
                <button onClick={resetStudentAttempt} className="flex items-center gap-2 px-3 py-1.5 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue hover:text-white rounded-lg transition-colors text-xs font-bold">
                    <RefreshCw className="w-3 h-3" /> Retry
                </button>
                <div className="h-6 w-px bg-white/10 mx-1"></div>
                <ProfileMenu />
            </div>
        </GlassCard>
    );

    const RecorderCard = ({ label }) => (
        <GlassCard className="flex flex-col items-center justify-center p-6 border-white/10 bg-black/20 relative overflow-hidden h-full min-h-[400px]">
            <div className="absolute inset-0 z-0 opacity-40">
                <Canvas camera={{ position: [0, 0, 4] }}>
                    <ambientLight intensity={0.5} />
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                        {isRecording && analyser ? <AudioOrb analyser={analyser} /> : (
                            <mesh rotation={[0.5, 0.5, 0]}>
                                <torusKnotGeometry args={[0.9, 0.3, 100, 16]} />
                                <meshStandardMaterial color={mode === 'teacher' ? "#2f5aff" : "#bd00ff"} wireframe />
                            </mesh>
                        )}
                    </Float>
                    <OrbitControls enableZoom={false} autoRotate={!isRecording} />
                </Canvas>
            </div>
            <div className="relative z-10 w-full max-w-xs space-y-4 text-center">
                <h3 className="text-white font-serif text-2xl mb-2">{label}</h3>
                {!isRecording ? (
                    <button onClick={startRecording} disabled={status === 'processing'} className="flex items-center justify-center gap-3 w-full py-4 bg-white text-black rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform">
                        <Mic className="text-black w-5 h-5" /> {status === 'processing' ? 'Processing...' : 'Record'}
                    </button>
                ) : (
                    <button onClick={stopRecording} className="flex items-center justify-center gap-3 w-full py-4 bg-neon-pink text-white rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform">
                        <Square className="fill-current w-4 h-4" /> Stop
                    </button>
                )}
                <div className="text-center">
                    <p className="text-slate-400 text-[10px] mb-2 uppercase tracking-widest">or</p>
                    <label className="inline-flex items-center gap-2 px-5 py-2 bg-white/10 border border-white/10 rounded-full text-xs font-bold text-slate-300 hover:bg-white/20 hover:text-white cursor-pointer transition-colors backdrop-blur-md">
                        <Upload className="w-3 h-3" /> Upload Audio
                        <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                </div>
            </div>
        </GlassCard>
    );

    const ProfileMenu = () => (
        <div className="relative z-50">
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full pl-2 pr-4 py-1.5 transition-all backdrop-blur-md">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neon-blue to-neon-purple flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">My Profile</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isProfileOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 top-14 w-80 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Session History</h4>
                            <p className="text-[10px] text-slate-600">Click an item to load results</p>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {history.length > 0 ? history.map((h) => (
                                <button key={h.id} onClick={() => loadHistoryItem(h)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group text-left">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-300 group-hover:text-white flex items-center gap-2"><Calendar className="w-3 h-3 opacity-50" /> {new Date(h.date).toLocaleDateString()}</span>
                                        <span className="text-[10px] text-slate-500">{new Date(h.date).toLocaleTimeString()}</span>
                                    </div>
                                    <div className={`px-2 py-1 rounded-md text-xs font-bold bg-white/5 ${h.score >= 80 ? 'text-neon-green' : h.score >= 50 ? 'text-neon-yellow' : 'text-neon-pink'}`}>{h.score}%</div>
                                </button>
                            )) : <div className="p-4 text-center text-xs text-slate-500">No recordings yet.</div>}
                        </div>
                        <div className="p-2 border-t border-white/10 bg-black/20">
                            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded-lg transition-colors"><LogOut className="w-3 h-3" /> Log Out</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    const SmartLegend = (props) => {
        const { payload } = props;
        const handleLegendClick = (val) => {
            const key = val.toLowerCase();
            setFocusMode(focusMode === key ? 'all' : key);
        };
        return (
            <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-white/5">
                {payload.map((entry, index) => {
                    const key = entry.value.toLowerCase();
                    const isFocused = focusMode === key;
                    const isDimmed = focusMode !== 'all' && !isFocused;
                    return (
                        <div key={`item-${index}`} className={`flex items-center gap-2 cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-30 blur-[1px]' : 'opacity-100 scale-105'}`} onClick={() => handleLegendClick(entry.value)}>
                            <div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: entry.color }} />
                            <span className="text-xs font-bold uppercase text-slate-300 hover:text-white">{entry.value} {isFocused && <Eye className="w-3 h-3 inline ml-1 text-white" />}</span>
                        </div>
                    );
                })}
                {focusMode !== 'all' && <button onClick={() => setFocusMode('all')} className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold uppercase text-slate-300 transition-colors ml-4"><RotateCcw className="w-3 h-3" /> Reset</button>}
            </div>
        );
    };

    return (
        <div className="min-h-screen text-white p-6 relative overflow-x-hidden font-sans">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <motion.div animate={{ background: mode === 'teacher' ? 'linear-gradient(to right, #2f5aff, #00f0ff)' : 'linear-gradient(to right, #bd00ff, #ff0055)' }} className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 transition-all duration-1000" />
            </div>
            <div className="relative z-10 max-w-7xl mx-auto space-y-6">
                {!studentData && (
                    <header className="flex flex-col items-center justify-center space-y-6 pt-6 relative">
                        <div className="absolute right-0 top-6"><ProfileMenu /></div>
                        <h1 className="text-5xl font-serif font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">Music Tutor</h1>
                        <div className="p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex shadow-2xl">
                            <motion.div className={`absolute top-1 bottom-1 rounded-full shadow-lg ${mode === 'teacher' ? 'bg-neon-blue' : 'bg-neon-purple'}`} initial={false} animate={{ x: mode === 'teacher' ? 0 : '100%', width: '50%' }} />
                            <button onClick={() => switchMode('teacher')} className={`relative z-10 px-8 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${mode === 'teacher' ? 'text-white' : 'text-slate-400'}`}>Teacher</button>
                            <button onClick={() => switchMode('student')} className={`relative z-10 px-8 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${mode === 'student' ? 'text-white' : 'text-slate-400'}`}>Student</button>
                        </div>
                    </header>
                )}
                <main className="w-full">
                    {mode === 'teacher' && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="h-[350px]"><RecorderCard label="Record Reference Lesson" /></div>
                            <AnimatePresence>
                                {teacherData && (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                        <GlassCard className="border-l-4 border-neon-blue relative">
                                            <div className="flex justify-between items-center mb-6">
                                                <div><h3 className="text-neon-blue font-bold uppercase tracking-widest text-xs mb-1">Teacher's Reference</h3><h2 className="text-2xl font-serif text-white">Lesson Captured</h2></div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right"><span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold">Notes</span><span className="text-xl font-bold text-white">{teacherData.notes ? teacherData.notes.length : 0}</span></div>
                                                    {teacherAudioURL && <AudioPlayerButton ref={teacherAudioRef} audioUrl={teacherAudioURL} colorClass="text-neon-blue" />}
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-xl p-4 shadow-inner min-h-[150px] flex items-center justify-center"><SheetMusic xmlData={teacherData.musicxml} /></div>
                                        </GlassCard>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                    {mode === 'student' && (
                        <div className="w-full">
                            {!studentData ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[500px]">
                                    <div className="flex flex-col h-full">
                                        {teacherData ? (
                                            <GlassCard className="flex-1 flex flex-col border-t-4 border-neon-blue bg-white/5">
                                                <div className="flex justify-between items-center mb-6"><h3 className="text-neon-blue font-bold uppercase tracking-widest text-xs">Target Lesson</h3>{teacherAudioURL && <AudioPlayerButton ref={teacherAudioRef} audioUrl={teacherAudioURL} label="Listen" colorClass="text-neon-blue" />}</div>
                                                <div className="flex-1 bg-white rounded-xl p-4 flex items-center justify-center shadow-inner overflow-hidden"><div className="scale-90 origin-top w-full"><SheetMusic xmlData={teacherData.musicxml} /></div></div>
                                            </GlassCard>
                                        ) : <GlassCard className="flex-1 flex flex-col items-center justify-center border-dashed border-2 border-white/10 bg-transparent opacity-50"><School className="w-12 h-12 text-slate-600 mb-4" /><p className="text-slate-500 text-sm">No Teacher Lesson Found</p></GlassCard>}
                                    </div>
                                    <div className="flex flex-col h-full"><RecorderCard label="Record Your Attempt" /></div>
                                </div>
                            ) : (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                    <AnalysisTopBar />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <GlassCard className="border-t-4 border-neon-blue">
                                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-neon-blue flex items-center gap-2 text-xs uppercase tracking-wider"><School className="w-4 h-4" /> Reference</h3>{teacherAudioURL && <AudioPlayerButton ref={teacherAudioRef} audioUrl={teacherAudioURL} colorClass="text-neon-blue" />}</div>
                                            <div className="bg-white rounded-xl overflow-hidden p-2 min-h-[180px] flex items-center justify-center shadow-inner">{teacherData ? <SheetMusic xmlData={teacherData.musicxml} /> : <span className="text-black/30 text-sm">No data</span>}</div>
                                        </GlassCard>
                                        <GlassCard className="border-t-4 border-neon-pink">
                                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-neon-pink flex items-center gap-2 text-xs uppercase tracking-wider"><GraduationCap className="w-4 h-4" /> Your Transcription</h3><div className="flex items-baseline gap-1"><span className={`text-4xl font-serif font-bold ${getScoreColor(studentData.feedback.score)}`}>{studentData.feedback.score}</span><span className="text-sm text-slate-500 font-serif">%</span></div></div>
                                            <div className="bg-white rounded-xl overflow-hidden p-2 min-h-[180px] flex items-center justify-center shadow-inner"><SheetMusic xmlData={studentData.musicxml} /></div>
                                        </GlassCard>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <GlassCard className="lg:col-span-1 max-h-[500px] overflow-y-auto custom-scrollbar">
                                            <h3 className="font-bold text-white mb-4 flex items-center gap-2 sticky top-0 bg-[#0a0a0a] z-10 py-2"><Zap className="w-4 h-4 text-neon-yellow" /> Note Analysis</h3>
                                            <div className="space-y-3">
                                                {studentData.feedback.detailed_breakdown?.map((item, i) => (
                                                    <div key={i} className={`flex flex-col p-3 rounded-lg text-sm border border-white/5 ${item.status === 'match' ? 'bg-green-500/10 text-green-200' : 'bg-red-500/10 text-red-200'}`}>
                                                        <div className="flex justify-between items-center mb-1"><span className="font-bold text-xs opacity-70">Note {item.index}</span>{item.status === 'match' ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}</div>
                                                        <span className="opacity-90">{item.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </GlassCard>
                                        <div className="lg:col-span-2 space-y-6">
                                            {studentData.feedback.graph_data?.heatmap && (
                                                <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl text-black">
                                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Tonal Harmony (Heatmap)</h4>
                                                    <img src={`data:image/png;base64,${studentData.feedback.graph_data.heatmap}`} alt="Heatmap" className="w-full h-32 object-cover rounded-lg" />
                                                </div>
                                            )}
                                            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl text-black h-[250px] relative group">
                                                <div className="flex justify-between mb-2">
                                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Pitch Accuracy</h4>
                                                    <button onClick={toggleScrubbing} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${isScrubbingEnabled ? 'bg-neon-blue text-white shadow-lg' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>
                                                        {isScrubbingEnabled ? <Pause className="w-3 h-3 animate-pulse" /> : <MousePointer2 className="w-3 h-3" />}
                                                        {isScrubbingEnabled ? 'Scrubbing ON' : 'Enable Audio Hover'}
                                                    </button>
                                                </div>
                                                <ResponsiveContainer width="100%" height="85%">
                                                    <LineChart data={studentData.feedback.graph_data?.pitch_data || []} onMouseEnter={handleGraphMouseEnter} onMouseMove={handleGraphMouseMove} onMouseLeave={handleGraphMouseLeave}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                                        <XAxis dataKey="seconds" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fontSize: 10 }} fontSize={10} tick={{ fill: '#666' }} />
                                                        <YAxis label={{ value: 'Pitch (Hz)', angle: -90, position: 'insideLeft', fontSize: 10 }} fontSize={10} tick={{ fill: '#666' }} />
                                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                        <Legend content={SmartLegend} />
                                                        <Line type="monotone" dataKey="teacher" stroke="#2f5aff" strokeWidth={3} dot={false} name="Teacher" strokeOpacity={focusMode === 'all' || focusMode === 'teacher' ? 1 : 0.1} />
                                                        <Line type="monotone" dataKey="student" stroke="#ff0055" strokeWidth={3} dot={false} name="Student" strokeOpacity={focusMode === 'all' || focusMode === 'student' ? 1 : 0.1} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl text-black h-[250px] relative">
                                                <div className="flex justify-between mb-2"><h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Dynamics (Waveform)</h4><div className={`w-2 h-2 rounded-full ${isScrubbingEnabled ? 'bg-neon-green' : 'bg-slate-300'}`} /></div>
                                                <ResponsiveContainer width="100%" height="85%">
                                                    <AreaChart data={studentData.feedback.graph_data?.rhythm_data || []} onMouseEnter={handleGraphMouseEnter} onMouseMove={handleGraphMouseMove} onMouseLeave={handleGraphMouseLeave}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                                        <XAxis dataKey="seconds" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fontSize: 10 }} fontSize={10} tick={{ fill: '#666' }} />
                                                        <YAxis label={{ value: 'Amplitude', angle: -90, position: 'insideLeft', fontSize: 10 }} fontSize={10} tick={{ fill: '#666' }} />
                                                        <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                        <Legend content={SmartLegend} />
                                                        <Area type="monotone" dataKey="teacher_top" stackId="1" stroke="#2f5aff" fill="#2f5aff" name="Teacher" strokeOpacity={focusMode === 'all' || focusMode === 'teacher' ? 1 : 0.1} fillOpacity={focusMode === 'all' || focusMode === 'teacher' ? 0.4 : 0.05} />
                                                        <Area type="monotone" dataKey="teacher_bottom" stackId="1" stroke="#2f5aff" fill="#2f5aff" showTooltip={false} strokeOpacity={focusMode === 'all' || focusMode === 'teacher' ? 1 : 0.1} fillOpacity={focusMode === 'all' || focusMode === 'teacher' ? 0.4 : 0.05} />
                                                        <Area type="monotone" dataKey="student_top" stackId="2" stroke="#ff0055" fill="#ff0055" name="Student" strokeOpacity={focusMode === 'all' || focusMode === 'student' ? 1 : 0.1} fillOpacity={focusMode === 'all' || focusMode === 'student' ? 0.4 : 0.05} />
                                                        <Area type="monotone" dataKey="student_bottom" stackId="2" stroke="#ff0055" fill="#ff0055" showTooltip={false} strokeOpacity={focusMode === 'all' || focusMode === 'student' ? 1 : 0.1} fillOpacity={focusMode === 'all' || focusMode === 'student' ? 0.4 : 0.05} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl text-black h-[220px]">
                                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Rhythm & Timing (Piano Roll)</h4>
                                                <ResponsiveContainer width="100%" height="85%">
                                                    <ScatterChart>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                                        <XAxis type="number" dataKey="x" name="Time" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fontSize: 10 }} fontSize={10} tick={{ fill: '#666' }} />
                                                        <YAxis type="number" dataKey="y" name="Pitch" domain={['auto', 'auto']} label={{ value: 'Pitch (MIDI)', angle: -90, position: 'insideLeft', fontSize: 10 }} fontSize={10} tick={{ fill: '#666' }} />
                                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px' }} />
                                                        <Legend content={SmartLegend} />
                                                        <Scatter name="Timing" data={studentData.feedback.graph_data?.piano_roll || []} shape={<PianoRollBar focusMode={focusMode} />} />
                                                    </ScatterChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;