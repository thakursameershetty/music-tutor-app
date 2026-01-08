import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/ui/GlassCard';
import { User, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // --- FIX: Check for existing session on mount ---
    useEffect(() => {
        const token = localStorage.getItem("musicTutorToken");
        if (token) {
            // If already logged in, go straight to dashboard
            navigate("/dashboard", { replace: true });
        }
    }, [navigate]);
    // -----------------------------------------------

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        
        const endpoint = isLogin ? "/api/token" : "/api/register";
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);

        try {
            const res = await fetch(endpoint, { method: "POST", body: formData });
            const data = await res.json();

            if (!res.ok) throw new Error(data.detail || "Authentication failed");

            if (isLogin) {
                // Save token
                localStorage.setItem("musicTutorToken", data.access_token);
                // --- FIX: Use 'replace: true' so Back button skips login page ---
                navigate("/dashboard", { replace: true });
            } else {
                setIsLogin(true);
                setError("Registered! Please log in.");
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020202] text-white p-4">
            <GlassCard className="w-full max-w-md border-t-4 border-neon-blue">
                <h2 className="text-3xl font-serif font-bold text-center mb-6">
                    {isLogin ? "Welcome Back" : "Create Account"}
                </h2>
                {error && <div className="bg-red-500/20 text-red-200 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 text-white focus:outline-none focus:border-neon-blue transition-colors"
                                placeholder="Enter username"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 text-white focus:outline-none focus:border-neon-blue transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>
                    
                    <button type="submit" className="w-full bg-neon-blue hover:bg-neon-blue/80 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                        {isLogin ? "Log In" : "Sign Up"} <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-slate-400 hover:text-white underline decoration-dotted underline-offset-4"
                    >
                        {isLogin ? "Need an account? Sign Up" : "Have an account? Log In"}
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};

export default Login;