import React from "react";

import { Button } from "@/components/ui/8bit/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/8bit/card";

export default function Login({ next = "/" }) {
  const handleLogin = () => {
    window.location.href = `/api/login?next=${encodeURIComponent(next)}`;
  };

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <Card className="songle-card-frame w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Login with Spotify</CardTitle>
          <CardDescription className="text-center">
            Use the same account for Daily Songle and Music Quiz.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center p-6">
          <Button
            onClick={handleLogin}
            className="flex w-full items-center justify-center bg-green-500 px-2 py-4 text-xs font-bold uppercase tracking-tighter text-white hover:bg-green-600 sm:text-sm"
          >
            Login with Spotify
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-0">
          <div className="mb-4 w-full border-t-2 border-dashed border-gray-700" />
          <p className="text-center text-[10px] font-bold uppercase leading-tight text-yellow-500">
            Developer Access Only
          </p>
          <p className="text-center text-[9px] uppercase leading-relaxed text-gray-400">
            Due to Spotify API restrictions, only invited players can play.
          </p>
        </CardFooter>
      </Card>

      <p className="mt-4 text-[10px] uppercase text-gray-600">
        Contact the dev to get whitelisted
      </p>
    </div>
  );
}
