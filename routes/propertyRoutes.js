import express from "express";
import { createRoom, getAllRooms, deleteRoom, updateRoom } from "../controllers/propertyController.js";
// Import the authenticate middleware
import authenticate from '../middlewares/authenticate.js'; 

const router = express.Router();

// Add a new room (Admin)
router.post("/", authenticate, createRoom);

// View all rooms (Admin/User)
router.get("/", authenticate, getAllRooms);

// Remove a room (Admin)
router.delete("/:id", authenticate, deleteRoom);

// Update room details (Admin)
router.put("/:id", authenticate, updateRoom);

export default router;


// ඔයාගේ authenticate middleware එක import කරන විදිහ

// සියලුම කාමර බැලීම (Admin/User)

// කාමරයක් ඉවත් කිරීම (Admin)

// අලුතින් එකතු කරපු Edit Route එක