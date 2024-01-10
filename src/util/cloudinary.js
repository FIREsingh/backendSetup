import { v2 as cloudinary } from "cloudinary";
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
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded on cloudinary
    console.log("file uploaded on cloudinary", response.url);
    //unlink the file if uploaded.
    fs.unlinkSync(localFilePath);
    return response;
  } catch (err) {
    //remove the locally saved temporary file coz upload operation got failed
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
