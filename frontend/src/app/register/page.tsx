"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        if (email && password) {
            const success = await register(email, password);
            if (success) {
                router.push("/");
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f2f4] flex items-center justify-center p-4">
            <div className="bg-white flex rounded shadow-md max-w-[850px] w-full min-h-[528px] overflow-hidden">
                {/* Left Side (Banner) */}
                <div className="w-[40%] bg-[#065f46] p-10 flex flex-col justify-between text-white hidden md:flex">
                    <div>
                        <h2 className="text-[28px] font-medium mb-4">Looks like you're new here!</h2>
                        <p className="text-[18px] text-gray-200 leading-7">Sign up with your mobile number to get started</p>
                    </div>
                    <div className="relative w-full h-40">
                        <div className="w-full h-full bg-[#059669]/20 rounded-full blur-3xl absolute top-10"></div>
                    </div>
                </div>

                {/* Right Side (Form) */}
                <div className="flex-1 p-10 flex flex-col justify-center">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
                        <div className="relative">
                            <input
                                type="email"
                                required
                                className="peer w-full border-b border-gray-300 py-2 focus:outline-none focus:border-[#059669] placeholder-transparent transition-colors text-black"
                                id="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <label htmlFor="email" className="absolute left-0 -top-3 text-[12px] text-gray-500 peer-placeholder-shown:text-[14px] peer-placeholder-shown:top-2 peer-focus:-top-3 peer-focus:text-[12px] peer-focus:text-[#059669] transition-all">Enter Email/Mobile number</label>
                        </div>

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                className="peer w-full border-b border-gray-300 py-2 focus:outline-none focus:border-[#059669] placeholder-transparent transition-colors text-black pr-8"
                                id="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <label htmlFor="password" className="absolute left-0 -top-3 text-[12px] text-gray-500 peer-placeholder-shown:text-[14px] peer-placeholder-shown:top-2 peer-focus:-top-3 peer-focus:text-[12px] peer-focus:text-[#059669] transition-all">Enter Password</label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-2 text-gray-400 hover:text-[#059669]"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                className="peer w-full border-b border-gray-300 py-2 focus:outline-none focus:border-[#059669] placeholder-transparent transition-colors text-black"
                                id="confirmPassword"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <label htmlFor="confirmPassword" className="absolute left-0 -top-3 text-[12px] text-gray-500 peer-placeholder-shown:text-[14px] peer-placeholder-shown:top-2 peer-focus:-top-3 peer-focus:text-[12px] peer-focus:text-[#059669] transition-all">Confirm Password</label>
                        </div>

                        <button type="submit" className="bg-[#f59e0b] text-white font-bold py-3 rounded-[2px] shadow-sm text-[15px] mt-4 hover:shadow-md transition-shadow">
                            Continue
                        </button>

                        <div className="text-center mt-4">
                            <Link href="/login" className="text-[#059669] font-medium text-[14px] shadow-sm bg-white border border-gray-200 py-3 block w-full hover:shadow-md transition-shadow">Existing User? Log in</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
