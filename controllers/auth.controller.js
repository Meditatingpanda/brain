import { oauth2Client } from "../app.js";
import UserSchema from "../model/UserSchema.js"
import { google } from "googleapis";
import path from 'path'
import { __dirname } from "../app.js";
const authController = {
  authScopeController: (req, res) => {
    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/userinfo.email",
    ];
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });
    res.redirect(url);
  },
  callBackController: async (req, res) => {
    try {
      const { code } = req.query;
      const { tokens } = await oauth2Client.getToken(code);
      console.log("Token ", tokens);

      oauth2Client.setCredentials(tokens);

      // Fetch user information, including their email
      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: "v2",
      });

      const userInfo = await oauth2.userinfo.get();

      // Extract the email
      const userEmail = userInfo.data.email;

      // Prepare the data according to your schema
      const userData = {
        email: userEmail,
        auth: tokens,
        expiry_date: new Date(tokens.expiry_date), // Ensure this matches the tokens' expiry structure
      };

      // Here, use your Mongoose model to update or create the user data
      // This is a simplistic approach; adjust according to your actual database logic
      const user = await UserSchema.findOneAndUpdate(
        { email: userEmail },
        userData,
        {
          new: true,
          upsert: true, // Create a new document if one doesn't exist
        }
      );

      console.log("User data saved or updated:", user);

      res.sendFile(path.join(__dirname, "./view/auth.html"));
    } catch (error) {
      console.error("Error during OAuth callback", error);
      res.status(500).send("Internal Server Error");
    }
  },
};

export default authController;
