const asyncHandler =(requestHandler) =>{
    return (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next)).catch((err)=> next(err));
    }
}

export {asyncHandler}
//this asyncHandler will return a promise










// const asyncHandler =() ={}
// const asyncHandler =(func) => () =>{}
// const asyncHandler =(func) => async () =>{}

//THIS IS A TRY CATCH CODE
// const asyncHandler =(fn) => async (req,res,next) =>{
//     try{
//             await fn(req,res,next)
//     } catch(error) {
//         res.status(err.code || 500 ).json({
//             success:false,
//             message:err.message
//         })
//     }
// }