import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { CampusScene, type RemotePlayer } from "./CampusScene";
import { WORLD } from "./campus";

type Props = {
  myId: string;
  nickname: string;
  onMove: (x: number, y: number, facing: RemotePlayer["facing"]) => void;
  sceneRef: React.MutableRefObject<CampusScene | null>;
};

export function GameCanvas({ myId, nickname, onMove, sceneRef }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new CampusScene();
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: "#8fbf5a",
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      pixelArt: true,
      physics: {
        default: "arcade",
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      scene: [scene],
      render: { antialias: false },
    });

    gameRef.current = game;
    game.scene.start("CampusScene", {
      id: myId,
      nickname,
      callbacks: { onMove },
    });
    sceneRef.current = scene;

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ imageRendering: "pixelated" }}
      aria-label={`Campus world ${WORLD.width}x${WORLD.height}`}
    />
  );
}
