import express from "express";
import { verifyOwner, getSettings, updateSettings, updateOwnerPassword} from "../controllers/settingsController.js";
import authenticate from '../middlewares/authenticate.js'; 

const router = express.Router();

// 👇 මේක තමයි අපි දාන අලුත් තාවකාලික Route එක (GET request එකක් විදිහට දාමු ලේසි වෙන්න)
// router.get("/create-first-owner", createFirstOwner);

// Owner login වෙන route එක
router.post("/verify-owner", verifyOwner);

// Settings ගන්න route එක
router.get("/", authenticate, getSettings);

// Settings Update කරන route එක (Owner විතරයි)
router.put("/", authenticate, updateSettings);

// මේක තමයි Password එක මාරු කරන අලුත් Route එක
router.put("/password", authenticate, updateOwnerPassword);

export default router;