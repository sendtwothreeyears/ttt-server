import express from "express";
import cors from "cors";
import expressWs from "express-ws";
import tttFactory from "./controllers/tttRouter";

const app = express();
expressWs(app);

const tttRouter = tttFactory(app);
const router = express.Router();

app.use(cors());
app.use(express.json());
app.use("/", router);
router.use("/api", tttRouter);

export default app;
