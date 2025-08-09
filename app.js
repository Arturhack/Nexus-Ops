import React, { useState, useEffect } from "react";

// Nexus Ops: The Alliance - Single-file React preview
// - Tailwind CSS assumed available in the host environment
// - Minimal, playable preview of core mechanics: map, roles, resources, enemy deck, turn flow

export default function NexusOpsPreview() {
  const MAP_ROWS = 5;
  const MAP_COLS = 7;

  // Helper to create map tiles
  const createMap = () => {
    const tiles = [];
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        tiles.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          explored: r === 2 && c === 3, // start with center explored
          enemy: null,
          objective: Math.random() < 0.06 ? { id: `obj-${r}-${c}`, title: "Relay Node" } : null,
        });
      }
    }
    return tiles;
  };

  const [map, setMap] = useState(createMap);

  // Players
  const defaultPlayers = [
    { id: "p1", name: "Commander", role: "Commander", tile: "2-3", hp: 6 },
    { id: "p2", name: "Engineer", role: "Engineer", tile: "2-4", hp: 5 },
    { id: "p3", name: "Scout", role: "Scout", tile: "1-3", hp: 4 },
  ];
  const [players, setPlayers] = useState(defaultPlayers);

  // Shared resources
  const [resources, setResources] = useState({ energy: 5, supplies: 4, tech: 2 });

  // Enemy deck and discard
  const initialEnemyDeck = () => {
    const cards = [];
    for (let i = 0; i < 10; i++) cards.push({ id: `grunts-${i}`, type: "grunt", strength: 1 });
    for (let i = 0; i < 6; i++) cards.push({ id: `elite-${i}`, type: "elite", strength: 2 });
    return shuffle(cards);
  };
  const [enemyDeck, setEnemyDeck] = useState(initialEnemyDeck);
  const [enemyDiscard, setEnemyDiscard] = useState([]);

  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState("player"); // player | enemy | check
  const [log, setLog] = useState(["Game start. Explore the map and complete objectives!"]);

  // Utility
  function shuffle(arr) {
    return arr.slice().sort(() => Math.random() - 0.5);
  }

  // Draw enemy and spawn
  const drawEnemy = () => {
    if (enemyDeck.length === 0) {
      setEnemyDeck(shuffle(enemyDiscard));
      setEnemyDiscard([]);
      return null;
    }
    const [top, ...rest] = enemyDeck;
    setEnemyDeck(rest);
    setEnemyDiscard((d) => [top, ...d]);
    return top;
  };

  // Explore a tile
  const exploreTile = (tileId) => {
    setMap((m) => m.map((t) => (t.id === tileId ? { ...t, explored: true } : t)));
    setLog((l) => [`Explored ${tileId}.`, ...l].slice(0, 50));
  };

  // Move player
  const movePlayer = (playerId, targetTile) => {
    setPlayers((ps) => ps.map((p) => (p.id === playerId ? { ...p, tile: targetTile } : p)));
    setLog((l) => [`${playerId} moved to ${targetTile}.`, ...l].slice(0, 50));
    // auto-explore
    exploreTile(targetTile);
  };

  // Simple attack: remove an enemy if present
  const attackTile = (attackerId, tileId) => {
    const tile = map.find((t) => t.id === tileId);
    if (!tile || !tile.enemy) return;
    // compute damage
    const attacker = players.find((p) => p.id === attackerId);
    let damage = 1;
    if (attacker.role === "Commander") damage = 2;
    const remaining = tile.enemy.strength - damage;
    if (remaining <= 0) {
      // kill
      setMap((m) => m.map((tt) => (tt.id === tileId ? { ...tt, enemy: null } : tt)));
      setLog((l) => [`${attacker.name} eliminated enemy on ${tileId}.`, ...l].slice(0, 50));
    } else {
      setMap((m) => m.map((tt) => (tt.id === tileId ? { ...tt, enemy: { ...tt.enemy, strength: remaining } } : tt)));
      setLog((l) => [`${attacker.name} damaged enemy on ${tileId}.`, ...l].slice(0, 50));
    }
  };

  // Spawn enemy during enemy phase
  const enemyPhase = () => {
    setPhase("enemy");
    setTurn((t) => t + 1);
    // draw 1-2 enemies depending on turn
    const count = Math.min(3, 1 + Math.floor(turn / 3));
    for (let i = 0; i < count; i++) {
      const enemy = drawEnemy();
      if (!enemy) continue;
      // choose a random explored tile near players or center
      const candidates = map.filter((x) => x.explored && !x.enemy);
      const tile = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : map[Math.floor(Math.random() * map.length)];
      setMap((m) => m.map((tt) => (tt.id === tile.id ? { ...tt, enemy } : tt)));
      setLog((l) => [`Enemy ${enemy.type} spawned at ${tile.id}.`, ...l].slice(0, 50));
    }
    // enemy attacks adjacent players
    setPlayers((ps) => {
      const updated = ps.map((p) => {
        const tile = map.find((t) => t.id === p.tile);
        // if any enemy on tile, deal damage
        if (tile && tile.enemy) {
          const dmg = tile.enemy.strength;
          setLog((l) => [`${p.name} took ${dmg} damage from ${tile.enemy.type}.`, ...l].slice(0, 50));
          return { ...p, hp: p.hp - dmg };
        }
        return p;
      });
      return updated.filter((p) => p.hp > 0);
    });

    setPhase("player");
  };

  // Player uses resource
  const spendResource = (type, amount) => {
    setResources((r) => ({ ...r, [type]: Math.max(0, r[type] - amount) }));
  };

  // Build/repair (engineer)
  const buildOrRepair = (playerId, tileId) => {
    const player = players.find((p) => p.id === playerId);
    if (!player || player.role !== "Engineer") return;
    if (resources.supplies < 1) {
      setLog((l) => ["Not enough supplies.", ...l].slice(0, 50));
      return;
    }
    spendResource("supplies", 1);
    setMap((m) => m.map((t) => (t.id === tileId ? { ...t, objective: null } : t)));
    setLog((l) => [`Engineer repaired ${tileId}.`, ...l].slice(0, 50));
  };

  // Check objectives
  const checkObjectives = () => {
    const remaining = map.filter((t) => t.objective).length;
    if (remaining === 0) {
      setLog((l) => ["All objectives completed! Victory!", ...l].slice(0, 50));
      setPhase("victory");
    }
  };

  useEffect(() => {
    // auto-check if players alive
    if (players.length === 0) {
      setLog((l) => ["All players eliminated. Game over.", ...l].slice(0, 50));
      setPhase("defeat");
    }
  }, [players]);

  // UI bits
  return (
    <div className="p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">Nexus Ops: The Alliance — Web Preview</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="mb-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-slate-100">Turn: {turn}</div>
            <div className="p-2 rounded-md bg-slate-100">Phase: {phase}</div>
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white"
              onClick={() => {
                if (phase !== "player") return;
                enemyPhase();
              }}
            >
              End Player Phase / Enemy Phase
            </button>
            <button
              className="px-3 py-1 rounded bg-green-600 text-white"
              onClick={() => {
                setMap(createMap());
                setPlayers(defaultPlayers);
                setEnemyDeck(initialEnemyDeck());
                setEnemyDiscard([]);
                setResources({ energy: 5, supplies: 4, tech: 2 });
                setTurn(1);
                setPhase("player");
                setLog(["Game reset."]);
              }}
            >
              Reset
            </button>
          </div>

          <div className="bg-white p-4 rounded shadow">
            {/* Map grid - simplified hex-like layout using offsets */}
            <div className="space-y-1">
              {Array.from({ length: MAP_ROWS }).map((_, r) => (
                <div key={r} className={`flex items-center ${r % 2 ? "ml-6" : ""}`}>
                  {Array.from({ length: MAP_COLS }).map((__, c) => {
                    const tileId = `${r}-${c}`;
                    const tile = map.find((t) => t.id === tileId) || {};
                    const playerHere = players.find((p) => p.tile === tileId);
                    return (
                      <div key={tileId} className="m-1">
                        <div
                          onClick={() => exploreTile(tileId)}
                          className={`w-24 h-20 p-2 rounded-lg border cursor-pointer flex flex-col justify-between ${
                            tile.explored ? "bg-white" : "bg-slate-200"
                          }`}
                        >
                          <div className="text-xs">{tileId}</div>
                          <div className="flex-1 text-sm">
                            {tile.explored ? (
                              <>
                                {tile.objective && <div className="text-amber-600">Objective</div>}
                                {tile.enemy && <div className="text-red-600">Enemy: {tile.enemy.type}</div>}
                                {playerHere && <div className="text-blue-600">{playerHere.name}</div>}
                              </>
                            ) : (
                              <div className="text-gray-400">Hidden</div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              className="text-xs px-2 py-0.5 rounded bg-slate-100"
                              onClick={() => movePlayer(players[0].id, tileId)}
                            >
                              Move C
                            </button>
                            <button
                              className="text-xs px-2 py-0.5 rounded bg-slate-100"
                              onClick={() => attackTile(players[0].id, tileId)}
                            >
                              Attack C
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded shadow">
              <h3 className="font-semibold">Players</h3>
              {players.map((p) => (
                <div key={p.id} className="flex justify-between mt-2">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-600">{p.role} • Tile {p.tile}</div>
                  </div>
                  <div className="text-sm">HP: {p.hp}</div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-white rounded shadow">
              <h3 className="font-semibold">Resources</h3>
              <div className="mt-2">Energy: {resources.energy}</div>
              <div>Supplies: {resources.supplies}</div>
              <div>Tech: {resources.tech}</div>
            </div>

            <div className="p-3 bg-white rounded shadow">
              <h3 className="font-semibold">Enemy Deck</h3>
              <div className="mt-2">Deck: {enemyDeck.length}</div>
              <div>Discard: {enemyDiscard.length}</div>
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-white p-3 rounded shadow mb-3">
            <h3 className="font-semibold mb-2">Active Objective</h3>
            <div>Remaining objectives: {map.filter((t) => t.objective).length}</div>
            <button
              className="mt-2 w-full rounded px-2 py-1 bg-emerald-600 text-white"
              onClick={() => checkObjectives()}
            >
              Check Objectives
            </button>
          </div>

          <div className="bg-white p-3 rounded shadow mb-3">
            <h3 className="font-semibold mb-2">Quick Actions</h3>
            <button
              className="w-full mb-2 rounded px-2 py-1 bg-orange-500 text-white"
              onClick={() => spendResource("energy", 1)}
            >
              Spend 1 Energy
            </button>
            <button
              className="w-full mb-2 rounded px-2 py-1 bg-amber-500 text-white"
              onClick={() => buildOrRepair("p2", players[1]?.tile || "2-4")}
            >
              Engineer Repair (1 supplies)
            </button>
            <button
              className="w-full rounded px-2 py-1 bg-red-500 text-white"
              onClick={() => {
                // force spawn for demo
                const e = drawEnemy();
                if (!e) return;
                const tile = map[Math.floor(Math.random() * map.length)];
                setMap((m) => m.map((tt) => (tt.id === tile.id ? { ...tt, explored: true, enemy: e } : tt)));
                setLog((l) => [`Force-spawn ${e.type} at ${tile.id}`, ...l].slice(0, 50));
              }}
            >
              Force Spawn
            </button>
          </div>

          <div className="bg-white p-3 rounded shadow">
            <h3 className="font-semibold mb-2">Event Log</h3>
            <div className="h-64 overflow-auto text-sm text-gray-700">
              {log.map((line, i) => (
                <div key={i} className="mb-1 border-b pb-1">{line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-600">
        This preview implements a simplified version of the tabletop rules: explore tiles, manage resources,
        fight enemies, and complete objectives. It’s a starting point you can expand with networking,
        AI behavior, and additional player actions.
      </div>
    </div>
  );
}
