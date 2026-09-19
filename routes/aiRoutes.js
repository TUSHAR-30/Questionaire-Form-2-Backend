const express = require('express');
const airoutes = express.Router();
const PQueue = require('p-queue').default;
const OpenAI = require("openai");
const systemPrompt=require("../constant");
// const BASE_URL = "https://api.a4f.co/v1"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // baseURL: BASE_URL
});

// ✅ Create a queue with rate limit (3 requests per 60 seconds)
const queue = new PQueue({
  intervalCap: 3, // Max 3 requests
  interval: 60 * 1000, // Every 60 seconds
});


async function runAI(userInput) {
  return queue.add(async () => {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            "role": "system",
            "content": `${systemPrompt}`
          },
          { role: "user", content: userInput }],
      });

      const responseText = completion.choices[0].message.content;
      console.log(completion.choices[0].message.content);

      let jsonMatch = responseText.match(/```json([\s\S]*?)```/);
      if (!jsonMatch) {
        jsonMatch = responseText.match(/\{[\s\S]*\}/);
      }

      console.log(jsonMatch)

      if (jsonMatch) {
        return { extractedJson: JSON.parse(responseText), status: 200 };
      } else {
        return { status: 501 };
      }
    } catch (error) {
      console.error("API request error:", error);
      return { error: "API rate limit exceeded. Please wait.", status: 429 };
    }
  });
}

airoutes.post("/", async (req, res) => {
  const response = await runAI(req.body.text);
  response.id=req.body.id
  if (response.status == 200) res.status(200).json(response);
  else res.status(response.status).json(response || {error:"Error processing request",id:req.body.id});
});


// airoutes.post("/", async (req, res) => {
//   const response = await runAI(req.body.text);
//   response.id = req.body.id;

//   if (response.status === 200) {
//     res.setHeader("Content-Type", "application/json");
//     res.setHeader("Transfer-Encoding", "chunked"); // Enable chunked transfer

//     const jsonString = JSON.stringify(response);
//     const chunkSize = 50; // Set your desired chunk size (in bytes)
//     console.log(jsonString.length)
    
//     for (let i = 0; i < jsonString.length; i += chunkSize) {
//       console.log(i);
//       res.write(jsonString.slice(i, i + chunkSize)); // Send chunks
//       await new Promise(resolve => setTimeout(resolve, 500));
//     }

//     res.end(); // End response after sending all chunks
//   } else {
//     res.status(response.status).json(response || { error: "Error processing request", id: req.body.id });
//   }
// });


module.exports = airoutes;
