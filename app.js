import express, { json } from "express";
import morgan from "morgan";
import cors from "cors";
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { google } from "googleapis";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import colors from "colors";
import { connectDb } from "./utils/connectDb.js";
import authController from "./controllers/auth.controller.js";
import meetController from "./controllers/meet.controller.js";
import axios from "axios";
import UserSchema from "./model/UserSchema.js";
export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_KEYS,
  temperature: 0.8,
});
const promptTemplate = PromptTemplate.fromTemplate(
  "Parse the following text to determine if it's related to creating a Google (Gmail) event. Extract the event type, date, time, and any mentioned email addresses. Convert the date and time to the PST timezone and format the date as dd/mm/yyyy. Use the provided date as today's reference for any relative date calculations. Return the data in JSON format with keys for event, date, time, and email. Text: {text}  Today's date for reference (dd/mm/yyyy): {date}  Expected Output Format: event_type, date, start_time,end_time, email , if it meeting return event_type gmeet, if end time is not provided then pick time after 30min of start time "
);
const summarizeTemplate = PromptTemplate.fromTemplate(
  "Given the email conversation thread below, perform the following tasks: " +
    "1. Summarize the entire conversation, focusing on the main topics, decisions made, and any action items identified. " +
    "2. Identify key points from the conversation, such as critical decisions, deadlines, or specific concerns raised by the participants. " +
    "3. Based on the summary and key points, draft an appropriate reply that addresses any questions asked, provides necessary information, or outlines next steps. " +
    "Email Thread: {text}" +
    "Format your response as a JSON object with two keys: 'keypoints' and 'reply'. " +
    "Under 'keypoints', include a list of the main insights or important pieces of information from the conversation. " +
    "Under 'reply', provide text that represents a suitable response to the email thread, considering the context and requirements discussed. " +
    "return the data in json format  having fields keypoints and reply"
);

// const promptTemplate = PromptTemplate.fromTemplate(
//   "Tell me a joke about {topic}"
// );
const outputParser = new StringOutputParser();

const chain = RunnableSequence.from([promptTemplate, chatModel, outputParser]);
const emailChain = RunnableSequence.from([
  summarizeTemplate,
  chatModel,
  outputParser,
]);
const app = express();
const port = 3000;
google.options({ auth: oauth2Client }); // Apply auth globally

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.post("/analyze", async (req, res) => {
  const text = req.body.text;
  console.log("todays date ", new Date().toLocaleDateString("en-GB"));
  const date = new Date().toLocaleDateString("en-GB");
  const ans = await chain.invoke({
    text,
    date,
  });
  res.send(JSON.parse(ans));
});
app.post("/summarize", async (req, res) => {
  const text = req.body.text;
  console.log("text", text);

  try {
    const ans = await emailChain.invoke({ text });

    res.json(JSON.parse(ans));
  } catch (error) {
    console.error("Error processing request:", error);
    // Send a JSON response indicating an error occurred.
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/auth", authController.authScopeController);
app.post("/token", async (req, res) => {
  try {
    const token = req.body.token;
    if (!token) {
      return res.status(400).send({ message: "Token is required" });
    }

    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const email = response.data.email;

    // Find the user or create a new one
    const updatedUser = await UserSchema.findOneAndUpdate(
      { email: email }, // Find a document with this email
      {
        $set: {
          token: token,
        },
      },
      {
        new: true, // Return the modified document rather than the original
        upsert: true, // Create a new document if one doesn't exist
      }
    );
    res.status(200).send({
      email: updatedUser.email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "An error occurred" });
  }
});

app.get("/oauth2callback", authController.callBackController);

app.post("/schedule-meet", meetController.scheduleMeet);

app.listen(port, () => {
  connectDb();
  console.log(`Server running at http://localhost:${port}`);
});
