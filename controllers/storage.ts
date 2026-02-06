import fs from "fs";
import path from "path";

const STORAGE_PATH = path.join(__dirname, "games.json");

export const loadRooms = () => {
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      const data = fs.readFileSync(STORAGE_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.log("Error loading rooms:", error);
  }
  return {};
};

export const saveRoom = (rooms) => {
  try {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(rooms, null, 2));
  } catch (error) {
    console.log("Error saving rooms:", error);
  }
};
