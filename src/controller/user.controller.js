import { asyncHandler } from "../util/asyncHandler.js";
import { ApiError } from "../util/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../util/cloudinary.js";
import { ApiResponse } from "../util/ApiResponse.js";
import jwt from "jsonwebtoken";

//=================== RegisterUser Controller =====================
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

//================== generateAccessAndRefreshToken =================
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAuthToken();
    console.log("entered");

    const refreshToken = await user.generateRefreshToken();
    console.log("out");
    user.save({ validateBeforeSave: false }); //coz mongoose model kick in
    user.refreshToken = refreshToken;
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

//=================== LoginUser Controller =========================
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
  const { username, email, password } = req.body;

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

//=================== LogoutUser Controller =========================
const logoutUser = asyncHandler(async (req, res) => {
  //================================================================
  // use middleware to access user.
  //================================================================

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
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

//=================== refreshAccessToken Controller =================
const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookie.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthenticated request");
    }
    const decodedToekn = jwt.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET
    );
    const user = User.findById(decodedToekn?.user_id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh Token");
    }
    if (incomingRefreshToken.refreshToken !== user.refreshToken) {
      throw new ApiError(401, "refresh token expired");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user_id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: user,
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access Token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

//=================== changeCurrentPassword Controller ==============
const changeCurrentPassword = asyncHandler(async (req, res) => {
  //================================================================
  // use middleware to access user.
  //================================================================
  const { oldPassword, newPassword, confPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!(confPassword === newPassword)) {
    throw new ApiError(400, "Passwords do not match");
  }
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }
  user.password = newPassword;
  user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

//=================== getCurrentUser Controller =====================
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.body, "Current User fetched successfully");
});

//***** update text based data *****
//=================== updateAccountDetails Controller ===============
const updateAccountDetails = asyncHandler(async (req, res) => {
  //================================================================
  // use middleware to access user.
  //================================================================

  //get data
  const { fullname, email } = req.body;

  //validation
  if (!fullname || !email) {
    throw new ApiError(400, "Please fill all the fields");
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true } //retuen after the update
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Account details updated successfully"));
});

//***** update file based data *****
//=================== updateUserAvatar Controller ===============
const updateUserAvatar = asyncHandler(async (req, res) => {
  //.files come from multer
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  //upload on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});
//=================== updateUserCoverImage Controller ===============
const updateUserCoverImage = asyncHandler(async (req, res) => {
  //.files come from multer
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover file is missing");
  }
  //upload on cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading cover image");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover Image updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
