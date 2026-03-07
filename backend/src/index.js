import { app } from "./app.js";
import { startTaskExpiryMonitor } from "./background/taskExpiry.monitor.js";
import connectDB from "./db/db.js";
import { validateEnv } from "./utils/env.js";

const PORT = process.env.PORT;

validateEnv();

connectDB()
.then(() =>{
    startTaskExpiryMonitor();

   app.on("error", (error) => {
      console.log("ERRR", error);
      throw error
   })

    app.listen(PORT, () => {
        console.log("Server is running at port : ", PORT)
    });
})
.catch((err) => {
    console.log("MongoDB Connection failed !!!", err)
})
  
 








/*
import express from "express"
const app = express()
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()

*/