  // mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.3.1
 
  const mongoose=require('mongoose');
  const mongoURI="mongodb://localhost:27017/mqtt_server_chat"
 
  const ConnectToMongo= async()=>{
   try{
    await mongoose.connect(mongoURI,);
    console.log("Connected to Mongo Sucessfully!!");
   }  catch(error){
     console.error("Error connect to db ",error.message);
   }
     
  }
  module.exports=ConnectToMongo;