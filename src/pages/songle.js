import Head from "next/head";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";

import Login from "@/components/Login";
import PlayerCard from "@/components/PlayerCard";
import SiteShell from "@/components/SiteShell";

export default function SonglePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    const accessToken = Cookies.get("spotify_access_token");
    if (!accessToken) {
      setIsLoggedIn(false);
      setUserData(null);
      return;
    }

    setIsLoggedIn(true);
    setToken(accessToken);
    fetch("/api/user")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) {
          setIsLoggedIn(false);
          Cookies.remove("spotify_access_token");
          Cookies.remove("spotify_refresh_token");
          Cookies.remove("spotify_expires_in");
          Cookies.remove("spotify_expires");
          return;
        }

        setUserData(data);
      })
      .catch(() => {
        setIsLoggedIn(false);
      });
  }, []);

  const handleLogout = () => {
    Cookies.remove("spotify_access_token");
    Cookies.remove("spotify_refresh_token");
    Cookies.remove("spotify_expires_in");
    Cookies.remove("spotify_expires");
    setIsLoggedIn(false);
    setUserData(null);
  };

  return (
    <SiteShell userData={userData} onLogout={handleLogout}>
      <Head>
        <title>Daily Songle</title>
      </Head>

      <section className="mx-auto flex w-full max-w-7xl justify-center px-6 py-8 sm:px-10">
        {isLoggedIn && userData ? (
          <PlayerCard token={token} />
        ) : (
          <div className="grid min-h-[calc(100vh-220px)] w-full place-items-center">
            <Login next="/songle" />
          </div>
        )}
      </section>
    </SiteShell>
  );
}
