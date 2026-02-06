import express from "express";
import cors from "cors";
import tttRouter from "./controllers/tttRouter";

const app = express();
const port = process.env.PORT || 3001;

const router = express.Router();

app.use(cors());
app.use(express.json());
app.use("/", router);

router.use("/api", tttRouter);

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
