import express from "express";
import {
    createLease,
    getUserLeaseHistory,
    endLease,
    getActiveLease,
    getMyRoomDetails
} from "../controllers/leaseController.js";
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

// ─────────────────────────────────────────────
// Assign a room to a student (Admin only)
// ─────────────────────────────────────────────
router.post("/", authenticate, createLease);

// ─────────────────────────────────────────────
// View complete lease history of a student (User/Admin)
// Route 1: :userId nathnam → logged-in user ge history
// Route 2: :userId thiyenawa nam → ee specific user ge history (Admin)
// ─────────────────────────────────────────────
router.get("/history", authenticate, getUserLeaseHistory);
router.get("/history/:userId", authenticate, getUserLeaseHistory);

// ─────────────────────────────────────────────
// Logged-in user ge current room + roommates + amenities
// (MyRoom.jsx page eka mekata call karanawa)
// ─────────────────────────────────────────────
router.get("/my-room", authenticate, getMyRoomDetails);

// ─────────────────────────────────────────────
// Active lease check (specific user)
// ─────────────────────────────────────────────
router.get("/active/:userId", authenticate, getActiveLease);

// ─────────────────────────────────────────────
// Record a student leaving a room (Admin only)
// ─────────────────────────────────────────────
router.put("/:leaseId/end", authenticate, endLease);

export default router;


// router.post("/", authenticate, createLease);

// ළමයෙක්ගේ සම්පූර්ණ කාමර ඉතිහාසය බැලීම (User/Admin)

// :userId එක නැතුව යැව්වොත් තමන්ගේ එක පෙන්නනවා, Admin කෙනෙක් userId එක යැව්වොත් ඒ ළමයාගේ එක පෙන්නනවා

// ළමයෙක් කාමරෙන් අයින් වීම සටහන් කිරීම (Admin)