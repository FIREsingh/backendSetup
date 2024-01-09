import { asyncHandler } from "../util/asyncHandler.js";
import { ApiError } from "../util/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../util/cloudinary.js";
import { ApiResponse } from "../util/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //================================================================
  //1. get user details from frontend.
  //2. validation
  //3. check if user already exists
  //4. check for image
  //5. check for avatar
  //6. upload them on cloudinary & check avatar
  //7. create user object - create entry in DB
  //8. remove password and refresh token field from response.
  //9. check for user creation (created or not)
  //10. return response
  //================================================================

  //1. get user details from frontend.
  const { username, email, password, fullname } = req.body;
  console.log("username: ", username);

  //2. validation
  if (
    [username, email, password, fullname].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Please fill all the fields");
  }

  //3. check if user already exists
  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User or email already exists");
  }

  //given by multer
  //4. check for image
  //5. check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //6. upload them on cloudinary,avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //7. create user object - create entry in DB
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    fullname,
    avatar,
    coverImage: coverImage?.path || "",
  });

  //9. check for user creation (created or not) and
  //8. remove password and refresh token field from response.
  const createdUser = await User.findById(user._id).select(
    "-password, -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  //10. return response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
});

export { registerUser };
