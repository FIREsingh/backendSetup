import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORES_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16bb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//routes import
import userRoute from "./routes/user.routes.js";

//router declarations
app.use("/api/v1/users", userRoute);

export { app };
