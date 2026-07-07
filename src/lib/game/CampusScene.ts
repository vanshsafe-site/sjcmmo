import Phaser from "phaser";
import { WORLD, ROOMS, CORRIDORS, NPCS } from "./campus";

export type RemotePlayer = {
  id: string;
  nickname: string;
  x: number;
  y: number;
  facing: "up" | "down" | "left" | "right";
  emote?: string | null;
};

export type ChatBubble = { id: string; text: string; until: number };

type SceneCallbacks = {
  onMove: (x: number, y: number, facing: RemotePlayer["facing"]) => void;
};

const PLAYER_COLORS = [
  0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x06b6d4, 0x3b82f6, 0xa855f7, 0xec4899,
];

function colorFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PLAYER_COLORS[hash % PLAYER_COLORS.length];
}

export class CampusScene extends Phaser.Scene {
  private me!: Phaser.GameObjects.Container;
  private meBody!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private remoteContainers = new Map<string, Phaser.GameObjects.Container>();
  private remoteState = new Map<string, RemotePlayer>();
  private bubbles = new Map<string, Phaser.GameObjects.Container>();
  private lastSent = 0;
  private lastX = 0;
  private lastY = 0;
  private lastFacing: RemotePlayer["facing"] = "down";
  private myId = "";
  private myNickname = "";
  private cbs!: SceneCallbacks;
  public touch: { x: -1 | 0 | 1; y: -1 | 0 | 1 } = { x: 0, y: 0 };

  setTouch(x: -1 | 0 | 1, y: -1 | 0 | 1) {
    this.touch.x = x;
    this.touch.y = y;
  }


  constructor() {
    super("CampusScene");
  }

  init(data: { id: string; nickname: string; callbacks: SceneCallbacks }) {
    this.myId = data.id;
    this.myNickname = data.nickname;
    this.cbs = data.callbacks;
  }

  create() {
    // Grass background
    this.cameras.main.setBackgroundColor("#8fbf5a");
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);

    // Draw dirt path border around whole campus
    const g = this.add.graphics();
    g.fillStyle(0xc9a96a, 1);
    g.fillRect(40, 40, WORLD.width - 80, WORLD.height - 80);
    g.fillStyle(0x8fbf5a, 1);
    g.fillRect(60, 60, WORLD.width - 120, WORLD.height - 120);

    // Corridors
    for (const c of CORRIDORS) {
      this.add.rectangle(c.x + c.w / 2, c.y + c.h / 2, c.w, c.h, c.color);
    }

    // Rooms
    for (const r of ROOMS) {
      const rect = this.add.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, r.color);
      rect.setStrokeStyle(3, 0x1f2937);
      if (r.label) {
        this.add
          .text(r.x + r.w / 2, r.y + 14, r.label, {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#0f172a",
            fontStyle: "bold",
          })
          .setOrigin(0.5, 0);
      }
    }

    // NPCs
    for (const npc of NPCS) {
      const c = this.add.container(npc.x, npc.y);
      const body = this.add.rectangle(0, 0, 20, 20, npc.color);
      body.setStrokeStyle(2, 0x0f172a);
      const label = this.add
        .text(0, -22, npc.name, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#ffffff",
          backgroundColor: "#0f172ac0",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 1);
      c.add([body, label]);
    }

    // Me
    this.me = this.add.container(WORLD.width / 2, WORLD.height / 2);
    this.meBody = this.add.rectangle(0, 0, 22, 22, colorFromId(this.myId));
    this.meBody.setStrokeStyle(3, 0xffffff);
    const nameTag = this.add
      .text(0, -22, this.myNickname, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#0f172a",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1);
    this.me.add([this.meBody, nameTag]);

    this.physics.add.existing(this.me);
    const body = this.me.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(22, 22);

    this.cameras.main.startFollow(this.me, true, 0.15, 0.15);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  update(time: number) {
    const body = this.me.body as Phaser.Physics.Arcade.Body;
    const speed = 190;
    let vx = 0;
    let vy = 0;

    const left = this.cursors.left?.isDown || this.wasd.A.isDown || this.touch.x < 0;
    const right = this.cursors.right?.isDown || this.wasd.D.isDown || this.touch.x > 0;
    const up = this.cursors.up?.isDown || this.wasd.W.isDown || this.touch.y < 0;
    const down = this.cursors.down?.isDown || this.wasd.S.isDown || this.touch.y > 0;

    if (left) vx = -speed;
    else if (right) vx = speed;
    if (up) vy = -speed;
    else if (down) vy = speed;

    body.setVelocity(vx, vy);

    let facing = this.lastFacing;
    if (Math.abs(vx) > Math.abs(vy)) facing = vx < 0 ? "left" : vx > 0 ? "right" : facing;
    else if (vy !== 0) facing = vy < 0 ? "up" : "down";

    // Send position at most 10x/sec, only if moved
    if (time - this.lastSent > 100) {
      const dx = this.me.x - this.lastX;
      const dy = this.me.y - this.lastY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || facing !== this.lastFacing) {
        this.lastX = this.me.x;
        this.lastY = this.me.y;
        this.lastFacing = facing;
        this.lastSent = time;
        this.cbs.onMove(this.me.x, this.me.y, facing);
      }
    }

    // Interpolate remote players
    for (const [id, state] of this.remoteState) {
      const c = this.remoteContainers.get(id);
      if (!c) continue;
      c.x = Phaser.Math.Linear(c.x, state.x, 0.2);
      c.y = Phaser.Math.Linear(c.y, state.y, 0.2);
    }

    // Fade bubbles
    for (const [id, bubble] of this.bubbles) {
      const life = bubble.getData("until") as number;
      if (time > life) {
        bubble.destroy();
        this.bubbles.delete(id);
      }
    }
  }

  upsertRemote(player: RemotePlayer) {
    if (player.id === this.myId) return;
    this.remoteState.set(player.id, player);
    let c = this.remoteContainers.get(player.id);
    if (!c) {
      c = this.add.container(player.x, player.y);
      const body = this.add.rectangle(0, 0, 22, 22, colorFromId(player.id));
      body.setStrokeStyle(2, 0x0f172a);
      const nameTag = this.add
        .text(0, -22, player.nickname, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#ffffff",
          backgroundColor: "#0f172ac0",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 1);
      c.add([body, nameTag]);
      this.remoteContainers.set(player.id, c);
    } else {
      const nameTag = c.list[1] as Phaser.GameObjects.Text;
      nameTag.setText(player.nickname);
    }
  }

  removeRemote(id: string) {
    this.remoteContainers.get(id)?.destroy();
    this.remoteContainers.delete(id);
    this.remoteState.delete(id);
    this.bubbles.get(id)?.destroy();
    this.bubbles.delete(id);
  }

  showBubble(playerId: string, text: string) {
    const target =
      playerId === this.myId
        ? this.me
        : this.remoteContainers.get(playerId);
    if (!target) return;

    // Remove old bubble
    this.bubbles.get(playerId)?.destroy();

    const bubble = this.add.container(target.x, target.y - 40);
    const bg = this.add
      .text(0, 0, text, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#0f172a",
        backgroundColor: "#fff8dc",
        padding: { x: 6, y: 4 },
        wordWrap: { width: 200 },
      })
      .setOrigin(0.5, 1);
    bubble.add(bg);
    bubble.setData("until", this.time.now + 5000);
    bubble.setData("followId", playerId);
    this.bubbles.set(playerId, bubble);

    // Make bubble follow target
    this.tweens.add({
      targets: bubble,
      alpha: { from: 1, to: 0 },
      duration: 5000,
    });

    // Update loop for follow
    const follow = () => {
      if (!bubble.active) return;
      const t = playerId === this.myId ? this.me : this.remoteContainers.get(playerId);
      if (t) {
        bubble.x = t.x;
        bubble.y = t.y - 40;
      }
      if (this.time.now < (bubble.getData("until") as number)) {
        this.time.delayedCall(50, follow);
      }
    };
    follow();
  }
}
