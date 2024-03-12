import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    auth: Schema.Types.Map,
    expiry_date: Date,
  },
  {
    timestamps: true,
  }
);

// Default export
export default model("User", UserSchema);
