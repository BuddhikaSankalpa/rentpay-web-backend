import express from "express";
import { createPaymentBill, submitPayment, approvePayment, getMyPayments, getAllPayments } from "../controllers/paymentController.js";
import authenticate from '../middlewares/authenticate.js'; 

const router = express.Router();

// Generate a new monthly payment bill (Admin)
router.post("/bill", authenticate, createPaymentBill);

// Submit payment details/receipt by the student (User)
router.put("/:paymentId/submit", authenticate, submitPayment);

// Approve a submitted payment (Admin)
router.put("/:paymentId/approve", authenticate, approvePayment);

// View logged-in student's payment history (User)
router.get("/my-payments", authenticate, getMyPayments);

// Admin can view all payments
router.get("/all", authenticate, getAllPayments);

export default router;


// මාසික බිලක් පද්ධතියට ඇතුලත් කිරීම (Admin)

// ළමයා බෝඩිම් ගාස්තුව ගෙවා Slip එක Upload කිරීම (User)

// ළමයාගේ ගෙවීම Admin විසින් Approve කිරීම (Admin)

// ළමයා තමන්ගේම ගෙවීම් විස්තර බැලීම (User)

//Admin ට ඔක්කොම payments ගන්න