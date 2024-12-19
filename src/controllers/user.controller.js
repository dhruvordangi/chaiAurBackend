import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"



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

export {registerUser}
