import { useEffect, useState } from "react";
import QuizRoom from "@/components/QuizRoom";

const CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

export default function DiscordActivityPage() {
  const [state, setState] = useState({ status: "loading", name: null, channelId: null, error: null });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { DiscordSDK } = await import("@discord/embedded-app-sdk");
        const sdk = new DiscordSDK(CLIENT_ID);
        await sdk.ready();

        const { code } = await sdk.commands.authorize({
          client_id: CLIENT_ID,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify"],
        });

        const res = await fetch("/api/discord-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const { access_token } = await res.json();

        const { user } = await sdk.commands.authenticate({ access_token });

        if (!cancelled) {
          setState({
            status: "ready",
            name: user.global_name || user.username,
            channelId: sdk.channelId,
            error: null,
          });
        }
      } catch (error) {
        console.error("Discord Activity init failed:", error);
        if (!cancelled) {
          setState({ status: "error", name: null, channelId: null, error: error.message });
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-lg">Connecting to Discord...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <p className="text-red-600">Could not connect to Discord: {state.error}</p>
      </div>
    );
  }

  return (
    <QuizRoom
      mode="online"
      initialName={state.name}
      initialRoomId={state.channelId}
    />
  );
}
