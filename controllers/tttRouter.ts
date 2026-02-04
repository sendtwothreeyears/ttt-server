import express from "express";
const apiRouter = express.Router();

type Player = "X" | "O";
type Cell = Player | null;

// Board is a 3x3 grid, represented as a 9-element array.
// Indices map to positions:
//  0 | 1 | 2
//  ---------
//  3 | 4 | 5
//  ---------
//  6 | 7 | 8

// TYPES
type Board = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];
type Won = true | false;
type GameState = {
  board: Board;
  currentPlayer: Player;
  won: Won;
};

let boardState: GameState | null = null;

const checkWinner = (): boolean => {
  if (!boardState) return false;

  const board = boardState.board;

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

apiRouter.post("/create", (req, res) => {
  boardState = {
    board: [null, null, null, null, null, null, null, null, null],
    currentPlayer: "X",
    won: false,
  };
  res.status(200).json(boardState);
});

apiRouter.post("/makeMove", (req, res) => {
  const { position } = req.body;
  let error: string | undefined;

  if (boardState.won) {
    error = "Game already won";
  } else if (!Number.isInteger(position)) {
    error = "Position must be an integer";
  } else if (position < 0 || position > 8) {
    error = "Position must be between 0 and 8";
  } else if (boardState.board[position] !== null) {
    error = "Position is already occupied";
  }

  if (error) {
    return res.status(400).json({ error });
  } else {
    boardState.board[position] = boardState.currentPlayer;
    boardState.currentPlayer = boardState.currentPlayer === "X" ? "O" : "X";
    boardState.won = checkWinner();
    return res.status(200).json({ boardState });
  }
});
export default apiRouter;
