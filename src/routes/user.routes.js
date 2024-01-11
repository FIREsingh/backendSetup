import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
} from "../controller/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const userRouter = Router();

// userRouter.post("/register", registerUser); // this is better than above.
userRouter.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
userRouter.route("/login").post(loginUser);
//sucured routes
userRouter.route("/logout").post(verifyJwt, logoutUser);

export default userRouter;
