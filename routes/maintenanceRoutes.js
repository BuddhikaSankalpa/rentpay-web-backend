import express from "express";
import {
    createTicket,
    getMyTickets,
    getAllTickets,
    updateTicketStatus
} from "../controllers/maintenanceController.js";
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.post("/", authenticate, createTicket);          // User: submit
router.get("/my", authenticate, getMyTickets);         // User: own tickets
router.get("/", authenticate, getAllTickets);          // Admin: all tickets
router.patch("/:id/status", authenticate, updateTicketStatus); // Both (with rules)

export default router;