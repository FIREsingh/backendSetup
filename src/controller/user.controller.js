import { asyncHandler } from "../util/asyncHandler.js";
import { ApiError } from "../util/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../util/cloudinary.js";
import { ApiResponse } from "../util/ApiResponse.js";

//=================== RegisterUser Controller =====================+
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
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User or email already exists");
  }

  //given by multer
  //4. check for image
  //5. check for avatar
  const avatarLocalPath = await req.files?.avatar[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = await req.files.coverImage[0].path;
  }
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
    avatar: avatar.url,
    coverImage: coverImage?.url,
  });

  //9. check for user creation (created or not) and
  //8. remove password and refresh token field from response.
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  //10. return response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
});

//================== generateAccessAndRefreshToken ===============
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAuthToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    user.save({ validateBeforeSave: false }); //coz mongoose model kick in
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};
//=================== LoginUser Controller ========================
const loginUser = asyncHandler(async (req, res) => {
  //================================================================
  //1. get data from req body
  //2. validation
  //3. check if user exists
  //4. check password
  //5. access and refresh token
  //6. send cookies
  //7. return response
  //================================================================

  //1. get data from req body
  const { email, username, password } = req.body;

  //2. validation
  if (!username || !email || !password) {
    throw new ApiError(400, "Please fill all the fields");
  }
  //3. check if user exists
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  //4. check password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }
  //5. access and refresh token (create a function for it(check above))
  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  //6. send cookies
  const options = {
    httpOnly: true, //this cookie will only be modified from server
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

//=================== LogoutUser Controller ========================
const logoutUser = asyncHandler(async (req, res) => {
  //================================================================
  // use middleware to access user.
  //================================================================

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true, //this cookie will only be modified from server
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out successfully"));
});

export { registerUser, loginUser, logoutUser };
