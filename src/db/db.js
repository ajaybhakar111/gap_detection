
const mongoose = require("mongoose") 


async function connectDB() {
       
 
    try{
           await mongoose.connect(process.env.MONGO_URL) ;
           console.log("DB is connect to server") 
    } 
    
    catch(err) {
            console.log("DB connection error" , err) ;
    }
    

}

module.exports = connectDB ;
