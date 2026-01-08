import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/ui/GlassCard';
import { User, Lock, ArrowRight } from 'lucide-react';
// Import the helper function
import { getApiUrl } from '../api'; 

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Check for existing session on mount
    useEffect(() => {
        const token = localStorage.getItem("musicTutorToken");
        if (token) {
            navigate("/dashboard", { replace: true });
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("STEP 1: Submit button clicked"); 

        setError("");
        
        try {
            console.log("STEP 2: Determining endpoint...");
            const path = isLogin ? "/api/token" : "/api/register";
            
            console.log("STEP 3: Calling getApiUrl with path:", path);
            // If it crashes here, your import from '../api' is broken
            const endpoint = getApiUrl(path); 
            console.log("STEP 4: Target URL is:", endpoint); 

            const formData = new FormData();
            formData.append("username", username);
            formData.append("password", password);

            console.log("STEP 5: Starting Fetch to", endpoint);
            const res = await fetch(endpoint, { method: "POST", body: formData });
            console.log("STEP 6: Response received. Status:", res.status);
            
            // Safety check: Did the server send JSON?
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                console.log("ERROR: Response is not JSON. Content-Type:", contentType);
                const text = await res.text();
                console.log("Response Body (HTML/Text):", text);
                throw new Error("Server sent HTML/Text instead of JSON. The URL might be wrong or the backend is crashing.");
            }

            const data = await res.json();
            console.log("STEP 7: Data parsed successfully", data); 

            if (!res.ok) throw new Error(data.detail || "Authentication failed");

            if (isLogin) {
                console.log("STEP 8: Login Success"); 
                localStorage.setItem("musicTutorToken", data.access_token);
                navigate("/dashboard", { replace: true });
            } else {
                console.log("STEP 8: Register Success");
                setIsLogin(true);
                setError("Registered! Please log in.");
            }
        } catch (err) {
            console.error("CRITICAL ERROR IN HANDLESUBMIT:", err);
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