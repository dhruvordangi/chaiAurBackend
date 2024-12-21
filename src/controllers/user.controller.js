import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user=await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        

        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave : false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while refresh and access tokens")
    }
}


const registerUser= asyncHandler( async (req,res) =>{
    // you have to comment in it ki kahan kaise hum user ko register karwayenge
    // this is important ki you break up the userRegister process into things
    
    // get userDetails from frontend✅
    // validation ki email empty to nhi h password empty to nhi h✅
    // check if user already exist => check it by username or by password either works✅
    //we are taking from the user jo jo userModel mein define h✅
    // check for images , check for avatar✅
    // upload them to cloudinary, avatar check after this✅
    // create user object - create entry in db✅
    // remove password an refresh token field from response✅
    // check for userCreation✅
    //return response to frontend






    const {fullName,email, username,password }=req.body
    console.log("email",email); // user ki details aa gyi ab krna h validation

    if(
        [fullName,email,username,password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required")
    } //validation bhi done ho gya

    const existedUser= await User.findOne({
        $or:[{ username },{ email }]
    })
    
    if(existedUser){
        throw new ApiError(409,"User with email and username already exist");
    }   //user exist checked✅
    //chota sa console log 🪵🪵🪵🪵
    // console.log(req.files);
    

    const avatarLocalPath=req.files?.avatar[0]?.path ; // multer gives access to req.files aur middleware humara server pr store krwata h files to ye cloudinary pe available nhi h
    // const coverImageLocalPath=req.files?.coverImage[0]?.path ;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if( !avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }   //check for images and avatar is done

    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)
    if( !avatar){
        throw new ApiError(400,"Avatar file failed to upload")
    }   //uploading on cloudinary is done


    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })          // {User} bohot powerful cheez h iski madad se humne humara user add kr diya h 

    const createdUser=await User.findById(user._id).select("-password -refreshToken")      // .select mein already sb selected hota h to hum wo field likhta hain jo humein nhi chahiye

    if( !createdUser){
        throw new ApiError(500," Something went wrong while registering the user")
    } //user check bhi done✅
    
    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    )

})

const loginUser=asyncHandler( async (req,res) =>{
    //req body-> data
    // username or email se login krwana h to
    // find the user
    // password check
    // access and refreshToken 
    // send cookie


    const {email,username,password}= req.body

    if( !username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{email}, {username}],
    })

    if( !user){
        throw new ApiError("404","User does not exist");
    }//user check done✅

    const isPasswordValid = await user.isPasswordCorrect(password)

    if( !isPasswordValid ){
        throw new ApiError(401,"Invlaid User credentials")
    }   // password check done ✅


    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure:true
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken",refreshToken,options).json(
        new ApiResponse( 200, {user:loggedInUser,accessToken,refreshToken}, "User logged In Successfully")
    )

})

const logoutUser = asyncHandler( async(req,res) => {
    await User.findByIdAndUpdate( req.user._id,{
            $unset: { refreshToken: 1 }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure:true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
        new ApiResponse(200,{},"User logged out"))
})

const refreshAccessToken = asyncHandler( async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Refresh token is missing")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id);
        if( !user ){
            throw new ApiError(401,"Invalid refresh token ")
        }
        //match the user ka refresh token and incoming refresh token same hai y nhi
        if( incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401,"refresh token is expired or used")
        }
        //generate new access token and refresh token
        const options={
            httpOnly:true,
            secure:true
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200).cookie("accessToken",accessToken, options).cookie("refreshToken",newRefreshToken, options).json(
            new ApiResponse(200, {accessToken,refreshToken:newRefreshToken},"Access token refreshed ")
        )
    } catch (error) {
        throw ApiError(401,error?.message || "INVALID refersh token ")
    }

})

const changeCurrentPassword= asyncHandler (async (req,res) => {
    const {oldPassword,newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if( !isPasswordCorrect ){
        throw new ApiError(400, "Invalid old password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})

const getCurrentUser = asyncHandler ( async (req,res) => {
    return res.status(200).json(200,req.user, "Current user fetched succesfully")
})

const updateAccountDetails = asyncHandler ( async (req,res) =>{
    const {fullName,email} = req.body

    if( !fullName || !email){
        throw new ApiError(400, "Please fill all the fields")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullName,
                email,
            }
        },
        {new: true}
    ).select("-password")

    return res.staus(200).json(
        new ApiResponse(200,user,"ACcount details updated successfully ")
    )
})

const updateUserAvatar = asyncHandler ( async (req,res) => {
    const avatarLocalPath = req.file?.path

    if( !avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing ");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if( !avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }
    const user=await User.findByIdAndUpdate(req.user?._id,
        { $set:{avatar:avatar.url}},
        {new:true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user, "Cover image updated successfully")
    )
    
})

const updateUserCoverImage = asyncHandler ( async (req,res) => {
    const coverImageLocalPath = req.file?.path

    if( !coverImageLocalPath){
        throw new ApiError(400, "coverImage file is missing ");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if( !coverImage.url){
        throw new ApiError(400,"Error while uploading on coverImage")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        { $set:{coverImage:coverImage.url}},
        {new:true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"Cover Image uploaded successfully")
    )
    
})


export {registerUser,loginUser,logoutUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails,updateUserAvatar, updateUserCoverImage}
