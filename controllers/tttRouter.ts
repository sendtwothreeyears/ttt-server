import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
const apiRouter = express.Router();
import { saveRoom, loadRooms } from "./storage";

/*================= TYPES =================*/
// Board is a 3x3 grid, represented as a 9-element array.
// Indices map to positions:
//  0 | 1 | 2
//  ---------
//  3 | 4 | 5
//  ---------
//  6 | 7 | 8

type Player = "X" | "O";
type Cell = Player | null;
type Board = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];
type Won = true | false;
type GameState = {
  board: Board;
  currentPlayer: Player;
  won: Won;
};

type ErrorResponse = { error: string };
type GetGameResponse = { room: GameState } | ErrorResponse;
type GetGamesResponse = { room: string; board: Board; currentPlayer: Player; won: Won }[];
type CreateGameResponse = { roomId: string };
type MakeMoveResponse =
  | { boardState: Board; currentPlayer: Player; won: Won }
  | ErrorResponse;
type ResetGameResponse = { room: GameState } | ErrorResponse;
type DeleteGameResponse = { message: string } | ErrorResponse;

/*================= GLOBAL STATE =================*/

let rooms: Record<string, GameState> = loadRooms();

/*================= UTILITY METHODS =================*/
const checkWinner = (board: Board): boolean => {
  if (!board) return false;
  const dirs = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < dirs.length; i++) {
    const path = dirs[i];
    const first = board[path[0]];
    if (first !== null && path.every((pathIdx) => board[pathIdx] === first)) {
      return true;
    }
  }
  return false;
};

/*================= API METHODS =================*/

apiRouter.get("/games/:id", (req: Request, res: Response<GetGameResponse>) => {
  const gameId = req.params.id;

  rooms = loadRooms();
  const room = rooms[gameId];

  if (!room) {
    return res.status(404).json({ error: "Game not found" });
  }

  return res.status(200).json({
    room,
  });
});

apiRouter.get("/games", (req: Request, res: Response<GetGamesResponse>) => {
  rooms = loadRooms();

  const roomSummary = Object.entries(rooms).map(
    ([roomId, roomData]: [string, GameState]) => ({
      room: roomId,
      board: roomData.board,
      currentPlayer: roomData.currentPlayer,
      won: roomData.won,
    }),
  );

  return res.status(200).json(roomSummary);
});

apiRouter.post("/create", (req: Request, res: Response<CreateGameResponse>) => {
  const roomId = uuidv4();

  const boardState: GameState = {
    board: [null, null, null, null, null, null, null, null, null],
    currentPlayer: "X",
    won: false,
  };

  rooms = loadRooms();
  rooms[roomId] = boardState;
  saveRoom(rooms);

  return res.status(200).json({ roomId });
});

apiRouter.post(
  "/makeMove/:gameId",
  (req: Request, res: Response<MakeMoveResponse>) => {
    const { position } = req.body;
    const { gameId } = req.params;

    rooms = loadRooms();
    const game = rooms[gameId];

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    let error: string | undefined;
    if (game.won) {
      error = "Game already won";
    } else if (!Number.isInteger(position)) {
      error = "Position must be an integer";
    } else if (position < 0 || position > 8) {
      error = "Position must be between 0 and 8";
    } else if (game.board[position] !== null) {
      error = "Position is already occupied";
    }

    if (error) {
      return res.status(400).json({ error });
    }

    // Update game state
    game.board[position] = game.currentPlayer;
    game.currentPlayer = game.currentPlayer === "X" ? "O" : "X";
    game.won = checkWinner(game.board);

    rooms[gameId] = game;
    saveRoom(rooms);

    return res.status(200).json({
      boardState: game.board,
      currentPlayer: game.currentPlayer,
      won: game.won,
    });
  },
);

apiRouter.post("/reset", (req: Request, res: Response<ResetGameResponse>) => {
  const roomId = req.body.gameId;

  if (!roomId) {
    return res.status(400).json({ error: "roomId is required" });
  }

  const boardState: GameState = {
    board: [null, null, null, null, null, null, null, null, null],
    currentPlayer: "X",
    won: false,
  };

  rooms = loadRooms();

  // Check if room exists
  if (!rooms[roomId]) {
    return res.status(404).json({ error: "Game not found" });
  }

  rooms[roomId] = boardState;
  saveRoom(rooms);

  return res.status(200).json({
    room: rooms[roomId],
  });
});

apiRouter.delete("/games/:gameId", (req: Request, res: Response<DeleteGameResponse>) => {
  const { gameId } = req.params;

  rooms = loadRooms();

  if (!rooms[gameId]) {
    return res.status(404).json({ error: "Game not found" });
  }

  delete rooms[gameId];
  saveRoom(rooms);

  return res.status(200).json({ message: "Game deleted" });
});

export default apiRouter;
