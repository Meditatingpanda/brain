import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    auth: Object,
    expiry_date: Date,
    token:String
  },
  {
    timestamps: true,
  }
);

// Default export
export default model("User", UserSchema);
