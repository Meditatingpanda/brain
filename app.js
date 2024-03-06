import express from "express";
import axios from "axios";
import morgan from "morgan";
import cors from "cors";
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_KEYS,
});
const app = express();
const port = 3000;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.post("/analyze", async (req, res) => {
  const text = req.body.text;
  console.log("todays date ", new Date().toLocaleDateString("en-GB"));
  const prompt = `
Parse the following text to determine if it's related to creating a Google (Gmail) event. Extract the event type, date, time, and any mentioned email addresses. Convert the date and time to the IST timezone and format the date as dd/mm/yyyy. Use the provided date as today's reference for any relative date calculations. Return the data in JSON format with keys for event, date, time, and email.
Text: ${text}
Today's date for reference (dd/mm/yyyy): ${new Date().toLocaleDateString(
    "en-GB"
  )}
Expected Output Format:
{
  "event": "g_meet",
  "date": "",
  "time": "",
  "email": ""
}
  `;
  console.log(prompt);
  const ans = await chatModel.invoke(prompt);
  res.send(JSON.parse(ans.lc_kwargs.content));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
