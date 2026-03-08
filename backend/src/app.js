import {} from 'dotenv/config';
import express from "express";
import cors from "cors"; 
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { ApiError } from "./utils/ApiError.js";
import { swaggerDocument } from "./docs/swagger.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import adminRouter from "./routes/admin.routes.js";
import authRouter from "./routes/auth.routes.js";
import disputeRouter from "./routes/dispute.routes.js";
import profileRouter from "./routes/profile.routes.js";
import taskRouter from "./routes/task.routes.js";
import walletRouter from "./routes/wallet.routes.js";

const app = express();


app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials: true,
}))


app.use(express.json({limit:"16kb"}));

app.use(express.urlencoded({extended:true, limit:"16kb"}))

app.use(express.static("public"))

app.use(cookieParser())

app.get("/api-docs.json", (_, res) => {
    res.status(200).json(swaggerDocument)
})

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.get("/api/v1/health", (_, res) => {
    res.status(200).json({
        success: true,
        message: "Backend is healthy",
    });
})

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/admin", adminRouter)
app.use("/api/v1/disputes", disputeRouter)
app.use("/api/v1/profile", profileRouter)
app.use("/api/v1/tasks", taskRouter)
app.use("/api/v1/wallet", walletRouter)

app.use((_, __, next) => {
    next(new ApiError(404, "Route not found"))
})

app.use(errorHandler)






export {app}