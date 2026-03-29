import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/8bit/card";
import { Button } from "../components/ui/8bit/button";

export default function Login() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Welcome to Songle!</CardTitle>
          <CardDescription className="text-center">Guess the daily song</CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center justify-center p-6">
          <Button
            onClick={handleLogin}
            className="flex items-center justify-center w-full px-2 py-4 text-xs sm:text-sm font-bold text-white bg-green-500 hover:bg-green-600 uppercase tracking-tighter"
          >
            Login with Spotify
          </Button>
        </CardContent>

        {/* 8-bit Disclaimer Footer */}
        <CardFooter className="flex flex-col gap-2 pt-0">
          <div className="border-t-2 border-dashed border-gray-700 w-full mb-4" />
          <p className="text-[10px] leading-tight text-center text-yellow-500 uppercase font-bold">
            ⚠️ Developer Access Only ⚠️
          </p>
          <p className="text-[9px] leading-relaxed text-center text-gray-400 uppercase">
            Due to Spotify API restrictions, only invited players can play. 
      
          </p>
        </CardFooter>
      </Card>
      
      {/* Optional: Small sub-footer outside the card */}
      <p className="mt-4 text-[10px] text-gray-600 uppercase">
        Contact the dev to get whitelisted
      </p>
    </div>
  );
}