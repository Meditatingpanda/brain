import express from "express";
import morgan from "morgan";
import cors from "cors";
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { google } from "googleapis";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import colors from "colors";
import { connectDb } from "./utils/connectDb.js";
;
import authController from "./controllers/auth.controller.js";
import meetController from "./controllers/meet.controller.js";
export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_KEYS,
});
const promptTemplate = PromptTemplate.fromTemplate(
  "Parse the following text to determine if it's related to creating a Google (Gmail) event. Extract the event type, date, time, and any mentioned email addresses. Convert the date and time to the PST timezone and format the date as dd/mm/yyyy. Use the provided date as today's reference for any relative date calculations. Return the data in JSON format with keys for event, date, time, and email. Text: {text}  Today's date for reference (dd/mm/yyyy): {date}  Expected Output Format: event_type, date, start_time,end_time, email , if it meeting return event_type gmeet, if end time is not provided then pick time after 30min of start time "
);
// const promptTemplate = PromptTemplate.fromTemplate(
//   "Tell me a joke about {topic}"
// );
const outputParser = new StringOutputParser();

const chain = RunnableSequence.from([promptTemplate, chatModel, outputParser]);
const app = express();
const port = 3000;
google.options({ auth: oauth2Client }); // Apply auth globally

const tokens = {
  access_token:
    "ya29.a0Ad52N3-cLI693FYmCk805l_w_XjM8lJCmTA-X8QnbuOYxFnfzrJt9fWQS-e9fZ11z2vKV79owVmx1CInbBGTcodx1EzcgshCPNG3Ssk9zJDBu_mTvd79x5_L8ffYoJi3vYpzSPeaM7Gm1A9JbRM6_-StVJO3tYWORU0KaCgYKAVoSARISFQHGX2MiOwzYJqmW87XSrh3HFnoctg0171",
  refresh_token:
    "1//0gCF4YXvUTwx8CgYIARAAGBASNwF-L9IreEzhrhAsRw2BYA4V803iIapE5uTbA6UWHt00yDGom-l_TNi62qRIFM64CdAEFqXcFAI",
  scope: "https://www.googleapis.com/auth/calendar",
  token_type: "Bearer",
  expiry_date: 1710223002001,
};
oauth2Client.setCredentials(tokens);
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

app.get("/auth",authController.authScopeController);

app.get("/oauth2callback", authController.callBackController);

app.post("/schedule-meet", meetController.scheduleMeet);

app.listen(port, () => {
  connectDb();
  console.log(`Server running at http://localhost:${port}`);
});
