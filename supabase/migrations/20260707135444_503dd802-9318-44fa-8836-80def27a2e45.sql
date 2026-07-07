
-- Players table (live position for each connected user)
CREATE TABLE public.players (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 20),
  x REAL NOT NULL DEFAULT 400,
  y REAL NOT NULL DEFAULT 300,
  facing TEXT NOT NULL DEFAULT 'down' CHECK (facing IN ('up','down','left','right')),
  emote TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.players TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view players"
  ON public.players FOR SELECT
  USING (true);

CREATE POLICY "Players insert own row"
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Players update own row"
  ON public.players FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Players delete own row"
  ON public.players FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER TABLE public.players REPLICA IDENTITY FULL;

-- Messages table (global chat)
CREATE TABLE public.messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 240),
  x REAL,
  y REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.messages TO anon;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.messages_id_seq TO authenticated;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON SEQUENCE public.messages_id_seq TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view messages"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can post own messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE INDEX messages_created_at_idx ON public.messages (created_at DESC);
CREATE INDEX players_last_seen_idx ON public.players (last_seen DESC);
