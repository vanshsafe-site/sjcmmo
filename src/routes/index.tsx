import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GameCanvas } from "@/lib/game/GameCanvas";
import { ChatOverlay, type ChatMessage } from "@/lib/game/ChatOverlay";
import { TouchControls } from "@/lib/game/TouchControls";
import type { CampusScene, RemotePlayer } from "@/lib/game/CampusScene";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JosephiteMMO — Retro School Campus MMO" },
      {
        name: "description",
        content:
          "Enter a nickname and join one global retro school campus. Explore, chat, and hang out with players around the world.",
      },
      { property: "og:title", content: "JosephiteMMO — Retro School Campus MMO" },
      {
        property: "og:description",
        content: "A funny, colorful, single-world social RPG. No signup — just a nickname.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Player = {
  id: string;
  nickname: string;
  x: number;
  y: number;
  facing: RemotePlayer["facing"];
};

function Index() {
  const [phase, setPhase] = useState<"login" | "joining" | "playing">("login");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; nickname: string } | null>(null);
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const sceneRef = useRef<CampusScene | null>(null);
  const meRef = useRef<{ id: string; nickname: string } | null>(null);

  const join = async () => {
    const nick = nickname.trim();
    if (nick.length < 2 || nick.length > 20) {
      setError("Nickname must be 2-20 characters.");
      return;
    }
    setError(null);
    setPhase("joining");
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInAnonymously();
      if (authErr || !authData.user) throw authErr ?? new Error("Sign in failed");

      const user = authData.user;
      const startX = 1200 + Math.floor(Math.random() * 100 - 50);
      const startY = 1500 + Math.floor(Math.random() * 100 - 50);
      const { error: upErr } = await supabase.from("players").upsert({
        id: user.id,
        nickname: nick,
        x: startX,
        y: startY,
        facing: "up",
        last_seen: new Date().toISOString(),
      });
      if (upErr) throw upErr;

      meRef.current = { id: user.id, nickname: nick };
      setMe(meRef.current);
      setPhase("playing");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to join");
      setPhase("login");
    }
  };

  // Load existing players and subscribe
  useEffect(() => {
    if (phase !== "playing" || !me) return;

    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from("players")
        .select("id, nickname, x, y, facing")
        .gte("last_seen", new Date(Date.now() - 5 * 60 * 1000).toISOString());
      if (!mounted || !data) return;
      const map = new Map<string, Player>();
      for (const p of data) {
        map.set(p.id, {
          id: p.id,
          nickname: p.nickname,
          x: p.x,
          y: p.y,
          facing: p.facing as RemotePlayer["facing"],
        });
      }
      setPlayers(map);
      // Push to scene
      const scene = sceneRef.current;
      if (scene) for (const p of map.values()) scene.upsertRemote(p);

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, nickname, text")
        .order("created_at", { ascending: false })
        .limit(30);
      if (mounted && msgs) setMessages(msgs.reverse());
    })();

    const playersCh = supabase
      .channel("players-room")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setPlayers((prev) => {
              const n = new Map(prev);
              n.delete(old.id);
              return n;
            });
            sceneRef.current?.removeRemote(old.id);
            return;
          }
          const row = payload.new as Player;
          setPlayers((prev) => {
            const n = new Map(prev);
            n.set(row.id, row);
            return n;
          });
          sceneRef.current?.upsertRemote(row);
        },
      )
      .subscribe();

    const messagesCh = supabase
      .channel("messages-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as ChatMessage & { user_id: string };
          setMessages((prev) => [...prev.slice(-49), row]);
          sceneRef.current?.showBubble(row.user_id, row.text);
        },
      )
      .subscribe();

    // Heartbeat to keep last_seen fresh
    const heartbeat = setInterval(() => {
      if (!meRef.current) return;
      supabase
        .from("players")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", meRef.current.id)
        .then(() => {});
    }, 20_000);

    // Delete row on unload
    const cleanup = () => {
      if (meRef.current) {
        void supabase.from("players").delete().eq("id", meRef.current.id);
      }
    };
    window.addEventListener("beforeunload", cleanup);

    return () => {
      mounted = false;
      clearInterval(heartbeat);
      supabase.removeChannel(playersCh);
      supabase.removeChannel(messagesCh);
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, [phase, me]);

  const handleMove = useCallback(
    async (x: number, y: number, facing: RemotePlayer["facing"]) => {
      if (!meRef.current) return;
      await supabase
        .from("players")
        .update({ x, y, facing, last_seen: new Date().toISOString() })
        .eq("id", meRef.current.id);
    },
    [],
  );

  const handleSend = useCallback(async (text: string) => {
    if (!meRef.current) return;
    await supabase.from("messages").insert({
      user_id: meRef.current.id,
      nickname: meRef.current.nickname,
      text,
    });
  }, []);

  if (phase !== "playing" || !me) {
    return <LoginScreen
      nickname={nickname}
      setNickname={setNickname}
      onJoin={join}
      loading={phase === "joining"}
      error={error}
    />;
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#8fbf5a]">
      <GameCanvas
        myId={me.id}
        nickname={me.nickname}
        onMove={handleMove}
        sceneRef={sceneRef}
      />
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded border-2 border-slate-900 bg-[#fff8dc] px-3 py-2 font-mono text-xs shadow-[4px_4px_0_0_rgba(15,23,42,1)]">
        <div className="font-bold text-slate-900">JosephiteMMO</div>
        <div className="text-slate-700">Playing as: {me.nickname}</div>
        <div className="mt-1 text-slate-600">Arrows / WASD to move</div>
      </div>
      <ChatOverlay
        messages={messages}
        onSend={handleSend}
        online={players.size + 1}
        myNickname={me.nickname}
      />
      <TouchControls sceneRef={sceneRef} />
    </main>
  );
}

function LoginScreen(props: {
  nickname: string;
  setNickname: (v: string) => void;
  onJoin: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#a4c93f] via-[#8fbf5a] to-[#4ade80] p-6 font-mono">
      <div className="w-full max-w-md rounded-lg border-4 border-slate-900 bg-[#fff8dc] p-6 shadow-[8px_8px_0_0_rgba(15,23,42,1)]">
        <div className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-slate-500">
          A retro school campus MMO
        </div>
        <h1 className="mb-1 text-center text-3xl font-black tracking-tight text-slate-900">
          Josephite<span className="text-rose-600">MMO</span>
        </h1>
        <p className="mb-6 text-center text-sm text-slate-600">
          One world. No accounts. Just pick a nickname and join everyone.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onJoin();
          }}
          className="space-y-3"
        >
          <label className="block text-xs font-bold uppercase text-slate-700">
            Nickname
          </label>
          <input
            autoFocus
            value={props.nickname}
            onChange={(e) => props.setNickname(e.target.value)}
            maxLength={20}
            placeholder="e.g. PixelPaul"
            className="w-full rounded border-2 border-slate-900 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-[#f4d35e]"
          />
          {props.error && (
            <p className="text-sm font-bold text-rose-700">{props.error}</p>
          )}
          <button
            type="submit"
            disabled={props.loading}
            className="w-full rounded border-2 border-slate-900 bg-[#f4d35e] px-4 py-3 text-lg font-black uppercase text-slate-900 shadow-[4px_4px_0_0_rgba(15,23,42,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_rgba(15,23,42,1)] disabled:opacity-50"
          >
            {props.loading ? "Joining..." : "► Join Campus"}
          </button>
        </form>
        <div className="mt-6 rounded border-2 border-dashed border-slate-400 p-3 text-xs text-slate-600">
          <div className="font-bold text-slate-800">Controls</div>
          Arrow keys or WASD to walk · Enter to chat
        </div>
      </div>
    </main>
  );
}
