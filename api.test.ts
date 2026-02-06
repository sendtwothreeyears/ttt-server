import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import app from "./app";

const GAMES_PATH = path.join(__dirname, "controllers", "games.json");

beforeEach(() => {
  fs.writeFileSync(GAMES_PATH, JSON.stringify({}));
});

/* ────────── helpers ────────── */

async function createGame(): Promise<string> {
  const res = await request(app).post("/api/create");
  return res.body.roomId;
}

async function makeMove(gameId: string, position: number) {
  return request(app)
    .post(`/api/makeMove/${gameId}`)
    .send({ position });
}

/* ────────── POST /api/create ────────── */

describe("POST /api/create", () => {
  it("returns a roomId and initialises an empty game", async () => {
    const res = await request(app).post("/api/create");

    expect(res.status).toBe(200);
    expect(res.body.roomId).toBeDefined();
    expect(typeof res.body.roomId).toBe("string");

    // verify the game was actually stored
    const game = await request(app).get(`/api/games/${res.body.roomId}`);
    expect(game.body.room.board).toEqual([
      null, null, null,
      null, null, null,
      null, null, null,
    ]);
    expect(game.body.room.currentPlayer).toBe("X");
    expect(game.body.room.won).toBe(false);
  });
});

/* ────────── GET /api/games ────────── */

describe("GET /api/games", () => {
  it("returns an empty list when no games exist", async () => {
    const res = await request(app).get("/api/games");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("lists all games with board, currentPlayer, won", async () => {
    const id1 = await createGame();
    const id2 = await createGame();

    const res = await request(app).get("/api/games");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const rooms = res.body.map((g: any) => g.room);
    expect(rooms).toContain(id1);
    expect(rooms).toContain(id2);

    for (const game of res.body) {
      expect(game.board).toBeDefined();
      expect(game.currentPlayer).toBeDefined();
      expect(game.won).toBeDefined();
    }
  });
});

/* ────────── GET /api/games/:id ────────── */

describe("GET /api/games/:id", () => {
  it("returns the game for a valid id", async () => {
    const id = await createGame();
    const res = await request(app).get(`/api/games/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.room).toBeDefined();
    expect(res.body.room.board).toHaveLength(9);
  });

  it("returns 404 for a missing id", async () => {
    const res = await request(app).get("/api/games/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Game not found");
  });
});

/* ────────── POST /api/makeMove/:gameId ────────── */

describe("POST /api/makeMove/:gameId", () => {
  it("places a piece and switches the player", async () => {
    const id = await createGame();

    const res = await makeMove(id, 0);

    expect(res.status).toBe(200);
    expect(res.body.boardState[0]).toBe("X");
    expect(res.body.currentPlayer).toBe("O");
    expect(res.body.won).toBe(false);
  });

  it("returns 404 for a non-existent game", async () => {
    const res = await makeMove("fake-id", 0);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Game not found");
  });

  it("rejects an occupied position", async () => {
    const id = await createGame();
    await makeMove(id, 4);

    const res = await makeMove(id, 4);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Position is already occupied");
  });

  it("rejects an out-of-range position", async () => {
    const id = await createGame();

    const res = await makeMove(id, 9);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Position must be between 0 and 8");
  });

  it("rejects a non-integer position", async () => {
    const id = await createGame();

    const res = await request(app)
      .post(`/api/makeMove/${id}`)
      .send({ position: 1.5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Position must be an integer");
  });

  it("detects a winner", async () => {
    const id = await createGame();

    // X: 0, 1, 2  —  O: 3, 4
    await makeMove(id, 0); // X
    await makeMove(id, 3); // O
    await makeMove(id, 1); // X
    await makeMove(id, 4); // O
    const res = await makeMove(id, 2); // X wins (top row)

    expect(res.status).toBe(200);
    expect(res.body.won).toBe(true);
  });

  it("rejects moves after the game is won", async () => {
    const id = await createGame();

    await makeMove(id, 0); // X
    await makeMove(id, 3); // O
    await makeMove(id, 1); // X
    await makeMove(id, 4); // O
    await makeMove(id, 2); // X wins

    const res = await makeMove(id, 5);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Game already won");
  });
});

/* ────────── POST /api/reset ────────── */

describe("POST /api/reset", () => {
  it("resets the board to initial state", async () => {
    const id = await createGame();
    await makeMove(id, 0);

    const res = await request(app)
      .post("/api/reset")
      .send({ gameId: id });

    expect(res.status).toBe(200);
    expect(res.body.room.board).toEqual([
      null, null, null,
      null, null, null,
      null, null, null,
    ]);
    expect(res.body.room.currentPlayer).toBe("X");
    expect(res.body.room.won).toBe(false);
  });

  it("returns 404 for a non-existent game", async () => {
    const res = await request(app)
      .post("/api/reset")
      .send({ gameId: "nonexistent" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Game not found");
  });

  it("returns 400 when gameId is missing", async () => {
    const res = await request(app)
      .post("/api/reset")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("roomId is required");
  });
});

/* ────────── DELETE /api/games/:gameId ────────── */

describe("DELETE /api/games/:gameId", () => {
  it("deletes an existing game", async () => {
    const id = await createGame();

    const res = await request(app).delete(`/api/games/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Game deleted");

    // confirm it's gone
    const check = await request(app).get(`/api/games/${id}`);
    expect(check.status).toBe(404);
  });

  it("returns 404 for a non-existent game", async () => {
    const res = await request(app).delete("/api/games/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Game not found");
  });
});

/* ────────── Full game sequences ────────── */

describe("Full game sequences", () => {
  it("plays a game to a win (diagonal)", async () => {
    const id = await createGame();

    // X: 0, 4, 8  —  O: 1, 2
    await makeMove(id, 0); // X
    await makeMove(id, 1); // O
    await makeMove(id, 4); // X
    await makeMove(id, 2); // O
    const win = await makeMove(id, 8); // X wins (diagonal)

    expect(win.body.won).toBe(true);
    expect(win.body.boardState[0]).toBe("X");
    expect(win.body.boardState[4]).toBe("X");
    expect(win.body.boardState[8]).toBe("X");
  });

  it("plays a game to a draw", async () => {
    const id = await createGame();

    // X O X
    // X X O
    // O X O
    await makeMove(id, 0); // X
    await makeMove(id, 1); // O
    await makeMove(id, 2); // X
    await makeMove(id, 5); // O
    await makeMove(id, 3); // X
    await makeMove(id, 6); // O
    await makeMove(id, 4); // X
    await makeMove(id, 8); // O
    const last = await makeMove(id, 7); // X

    expect(last.body.won).toBe(false);
    // board is full
    expect(last.body.boardState.every((cell: string | null) => cell !== null)).toBe(true);
  });
});
