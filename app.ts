import express from "express";
import cors from "cors";
import tttRouter from "./controllers/tttRouter";

const app = express();

const router = express.Router();

app.use(cors());
app.use(express.json());
app.use("/", router);

router.use("/api", tttRouter);

export default app;
