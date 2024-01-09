import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: "string",
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: "string",
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: "string",
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: "string",
      required: true,
    },
    coverimage: {
      type: "string",
    },
    watchhistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: "string",
      required: true,
    },
    refreshToken: {
      type: "string",
    },
  },
  {
    timestamps: true,
  }
);

//encryption(Encrypt the password and save it)
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } else {
    next();
  }
});

//decryption (check password with decrypted password)
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// generate access token (JWT)
userSchema.methods.generateAuthToken = async function () {
  const token = jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
  this.refreshToken = token;
  await this.save();
  return token;
};

// generate refresh token (JWT)
userSchema.methods.generateRefreshToken = async function () {
  const token = jwt.sign(
    {
      _id: this._id,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    }
  );
  this.refreshToken = token;
  await this.save();
  return token;
};

export const User = mongoose.model("User", userSchema);
