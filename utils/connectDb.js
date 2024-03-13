import mongoose from 'mongoose';
mongoose.set("strictQuery", false);
export const connectDb = async () => {
  try {
   // console.log(process.env.MONGO_DB_URI);
    const res = await mongoose.connect(process.env.MONGO_DB_URI);
    // console.log(res)
    console.log(`MongoDB Connected at ${res.connection.host}`.bgGreen);
  } catch (error) {
    console.log(error.message.bgRed);
    process.exit(1);
  }
};
