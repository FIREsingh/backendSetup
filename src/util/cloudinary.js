import { v2 as cloudinary } from "cloudinary";
import { response } from "express";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDNARY_CLOUD_NAME,
  api_key: process.env.CLOUDNARY_API_KEY,
  api_secret: process.env.CLOUDNARY_API_SECRET,
});

//============= Upload on cloudinary ================
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //otherwise upload
    cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has beeb uploaded on cloudinary
    console.log("file uploaded on cloudinary", response.url);
    return response.url;
  } catch (err) {
    //remove the locally saved temporary file coz upload operation got failed
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
