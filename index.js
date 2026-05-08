import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import userRouter from "./routes/userRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import leaseRoutes from "./routes/leaseRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import noticeRoutes from './routes/noticeRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import settingsRoutes from "./routes/settingsRoutes.js";
import cors from "cors";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL or Key is missing in the .env file!");
    process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

import { startBillingCron } from './utils/billingCron.js';

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/users", userRouter);
app.use("/api/properties", propertyRoutes);
app.use("/api/leases", leaseRoutes);
app.use("/api/payments", paymentRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use("/api/settings", settingsRoutes);

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