import express from "express";
import {
    getNotices,
    createNotice,
    deleteNotice
} from "../controllers/noticeController.js";
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

// Notices kiyawanna ondu logged-in user kenekma puluwan (admin + students)
router.get("/", authenticate, getNotices);

// Admin only
router.post("/", authenticate, createNotice);
router.delete("/:id", authenticate, deleteNotice);

export default router;