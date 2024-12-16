// require('dotenv').config({path:'./env'}) 
import dotenv from "dotenv";
import connectdB from './db/index.js';

dotenv.config({path:'./env'})

connectdB() // this returns a promise
.then( ()=>{
    app.listen(process.env.PORT || 8000, () =>{
        console.log(`😁server is running at port : ${process.env.PORT}`);
        
    })
})
.catch( (err)=> {
    console.log('MONGO DB connection failed !!! ',err)
}) 








/*

import express from 'express';
const app=express()
(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=> {
            console.log("ERR", error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

        app.listen(process.env.PORT)
    } catch(error){
        console.log("zERROR", error);
        throw error
        
    }
})()

*/