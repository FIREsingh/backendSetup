import mongoose from "mongoose";
import { DB_Name } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_Name}`
    );
    console.log(
      `mongoDB connected successfully and host is : " + ${connectionInstance.connection.host}`
    );
  } catch (err) {
    console.log("Mongoose connection error =>: ", err);
    process.exit(1);
  }
};

export default connectDB;
