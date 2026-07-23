import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import userRouter from "./routes/userRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import leaseRoutes from "./routes/leaseRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import noticeRoutes from './routes/noticeRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import settingsRoutes from "./routes/settingsRoutes.js";
import { supabase } from "./supabaseClient.js";
import { startBillingCron } from './utils/billingCron.js';

const app = express();

app.use(express.json());


// app.use(cors()); wenuwata me tika danna

app.use(cors({
    origin: [
        "https://rentpay-web-frontend-five.vercel.app", // Oyage Vercel frontend URL eka
        "http://localhost:5173", // Local development walata (Vite default port)
        "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true, // Authorization headers/cookies walata allow karanawa
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.get("/", (_req, res) => {
    res.status(200).json({
        status: "ok",
        message: "RentPay backend is running",
    });
});

app.use("/api/users", userRouter);
app.use("/api/properties", propertyRoutes);
app.use("/api/leases", leaseRoutes);
app.use("/api/payments", paymentRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use("/api/settings", settingsRoutes);

export { supabase };
export default app;

const isMainModule =
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, async () => {
        console.log(`Server started on port ${PORT}`);
        startBillingCron();

        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) {
            console.error("Supabase connection error:", error.message);
        } else {
            console.log("Connected to Supabase successfully!");
        }
    });
}