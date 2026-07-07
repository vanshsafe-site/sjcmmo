import { useEffect, useRef, useState } from "react";

export type ChatMessage = {
  id: number;
  nickname: string;
  text: string;
};

type Props = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  online: number;
  myNickname: string;
};

export function ChatOverlay({ messages, onSend, online, myNickname }: Props) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t.slice(0, 240));
    setText("");
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-3 pb-56 sm:p-4 md:pb-4">
      <div className="pointer-events-auto ml-auto w-full max-w-md rounded border-2 border-slate-900 bg-[#fff8dc]/95 font-mono shadow-[4px_4px_0_0_rgba(15,23,42,1)]">
        <div className="flex items-center justify-between border-b-2 border-slate-900 bg-[#f4d35e] px-3 py-1 text-xs font-bold text-slate-900">
          <span>GLOBAL CHAT</span>
          <span>ONLINE: {online}</span>
        </div>
        <div
          ref={scrollRef}
          className="max-h-40 min-h-[6rem] overflow-y-auto px-3 py-2 text-[13px] text-slate-900"
        >
          {messages.length === 0 && (
            <p className="italic text-slate-500">Say hi! Everyone is in one world.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className="leading-tight">
              <span
                className={
                  m.nickname === myNickname
                    ? "font-bold text-rose-700"
                    : "font-bold text-indigo-700"
                }
              >
                {m.nickname}:
              </span>{" "}
              <span>{m.text}</span>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex border-t-2 border-slate-900"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={240}
            placeholder={focused ? "Type & press Enter…" : "Press Enter to chat"}
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="border-l-2 border-slate-900 bg-[#a4c93f] px-4 text-xs font-bold text-slate-900 hover:bg-[#8fbf5a]"
          >
            SEND
          </button>
        </form>
      </div>
    </div>
  );
}
