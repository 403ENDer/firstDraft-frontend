"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/hooks/use-auth-store";

export default function LandingPage() {
  const router = useRouter();
  const { token, user, logout } = useAuthStore();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const isAuthenticated = !!token && !!user;

  const handleGenerateScript = (input: string) => {
    if (!input.trim()) return;
    if (isAuthenticated) {
      router.push(`/chat?message=${encodeURIComponent(input.trim())}`);
    } else {
      router.push(
        `/login?redirect=${encodeURIComponent(
          `/chat?message=${encodeURIComponent(input.trim())}`
        )}`
      );
    }
  };

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleGenerateScript(inputValue);
    }
  };

  const handleGenreClick = (genre: string) => {
    handleGenerateScript(`I want a script for a ${genre.toLowerCase()}`);
  };

  const handleLogout = () => {
    logout();
    router.replace("/landing");
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-green-400/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link
          href="/landing"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            <span className="text-black text-sm font-bold">S</span>
          </div>
          <span className="text-white font-semibold text-lg">FirstDraft</span>
        </Link>
        <div className="flex items-center gap-4">
          {hasHydrated && !!token && !!user ? (
            <Button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2"
            >
              Logout
            </Button>
          ) : (
            <>
              <Link href="/signup">
                <Button
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-800 bg-transparent px-6 py-2"
                >
                  Sign Up
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2">
                  Log In
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 py-12">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Unleash Your Cinematic Vision
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Transform your ideas into captivating scripts with the power of AI.
            Simply describe your vision, upload reference images, and let
            FirstDraft bring your story to life.
          </p>

          {/* Search Input */}
          <div className="max-w-2xl mx-auto mt-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe your cinematic idea..."
                className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 pl-12 pr-36 py-6 text-lg rounded-xl"
                onKeyPress={handleInputKeyPress}
              />
              <Button
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 text-sm font-medium rounded-lg"
                onClick={() => handleGenerateScript(inputValue)}
              >
                Generate Script
              </Button>
            </div>
          </div>
        </div>

        {/* Genre Tags */}
        <div className="flex flex-wrap justify-center gap-4 mt-16 max-w-4xl mx-auto px-6">
          {[
            "Epic Fantasy Adventure",
            "Sci-Fi Thriller",
            "Romantic Comedy",
            "Historical Drama",
            "Animated Short Film",
          ].map((genre) => (
            <button
              key={genre}
              className="px-6 py-3 bg-gray-800/50 border border-gray-600 rounded-full text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
              onClick={() => handleGenreClick(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 mt-24">
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-8 text-sm text-gray-400">
          <div className="flex gap-8 mb-6 md:mb-0">
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact Us
            </a>
          </div>
          <div>© 2024 FirstDraft. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
