import Head from "next/head";
import { useRouter } from "next/router";
import { CalendarDays, Globe, Speaker, Users } from "lucide-react";

import SiteShell from "@/components/SiteShell";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/8bit/card";

export default function Home() {
  const router = useRouter();

  return (
    <SiteShell>
      <Head>
        <title>Songle</title>
      </Head>

      <section className="mx-auto grid min-h-[calc(100vh-145px)] w-full max-w-7xl content-center gap-8 px-6 py-10 sm:px-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold sm:text-5xl">Choose your mode</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Play the daily Songle challenge solo, or open a live music quiz room with friends.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="songle-card-frame songle-card-main">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarDays className="h-5 w-5" />
                Daily Songle
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-52 flex-col justify-between gap-6">
              <p className="text-sm text-muted-foreground">
                One song per day. Guess the track and artist as fast as possible.
              </p>
              <Button onClick={() => router.push("/songle")} className="w-full">
                Play Daily Songle
              </Button>
            </CardContent>
          </Card>

          <Card className="songle-card-frame songle-card-main">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="h-5 w-5" />
                Music Quiz
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-52 flex-col justify-between gap-6">
              <p className="text-sm text-muted-foreground">
                Create or join a multiplayer room with synchronized Spotify playback.
              </p>
              <Button onClick={() => router.push("/quiz")} className="w-full">
                Open Music Quiz
              </Button>
            </CardContent>
          </Card>

          <Card className="songle-card-frame songle-card-main">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Speaker className="h-5 w-5" />
                Party Quiz
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-52 flex-col justify-between gap-6">
              <p className="text-sm text-muted-foreground">
                One host plays the music through speakers while everyone guesses on their phone.
              </p>
              <Button onClick={() => router.push("/party-quiz")} className="w-full">
                Open Party Quiz
              </Button>
            </CardContent>
          </Card>

          <Card className="songle-card-frame songle-card-main">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Globe className="h-5 w-5" />
                Online Quiz
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-52 flex-col justify-between gap-6">
              <p className="text-sm text-muted-foreground">
                No Spotify login and no player limit. Guess 30-second clips with friends anywhere.
              </p>
              <Button onClick={() => router.push("/online-quiz")} className="w-full">
                Open Online Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </SiteShell>
  );
}
