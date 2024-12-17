import fetch from "node-fetch";
global.fetch = fetch;

import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import axios from "axios";
import * as cheerio from "cheerio";

// Initialize Pinecone and OpenAI
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index("rag");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Extract URLs from text
function extractUrls(text) {
  const urlRegex =
    /https?:\/\/(www\.)?[-a-zA-Z0-9:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  return text.match(urlRegex) || [];
}

// Scrape webpage for metadata
async function scrapeWebpage(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(response.data);
    const title = $("title").text().trim() || "No title available";
    const description =
      $('meta[name="description"]').attr("content") ||
      "No description available";
    const bodySnippet = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300); // Limit snippet to 300 chars

    return { url, title, description, snippet: bodySnippet };
  } catch (error) {
    console.error(`Failed to scrape ${url}: ${error.message}`);
    return null;
  }
}

// Generate OpenAI embeddings
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      input: text,
      model: "text-embedding-ada-002",
    });

    return response.data[0]?.embedding;
  } catch (error) {
    console.error("Failed to generate embeddings:", error.message);
    return null;
  }
}

// Upsert content to Pinecone
async function upsertToPinecone(urls) {
  const processedData = await Promise.all(
    urls.map(async (url) => {
      const scraped = await scrapeWebpage(url);
      if (!scraped) return null;

      const embedding = await generateEmbedding(scraped.snippet);
      if (!embedding) return null;

      return {
        id: scraped.title || url,
        values: embedding,
        metadata: {
          url: scraped.url,
          title: scraped.title,
          description: scraped.description,
          snippet: scraped.snippet,
        },
      };
    })
  );

  const validData = processedData.filter((item) => item !== null);
  if (validData.length > 0) {
    await index.namespace("ns1").upsert(validData);
    console.log("Upserted vectors:", validData.length);
  }

  return validData;
}

// Format query results
function formatResults(results) {
  return results
    .map((match) =>
      `
**Title:** ${match.metadata.title}
**Description:** ${match.metadata.description}
**Snippet:** ${match.metadata.snippet}
**URL:** ${match.metadata.url}
    `.trim()
    )
    .join("\n\n---\n\n");
}

// POST Function
export async function POST(req) {
  try {
    const data = await req.json();
    const userMessage = data[data.length - 1]?.content || "";

    // Extract URLs and scrape content
    const urls = extractUrls(userMessage);
    let pineconeData = [];
    if (urls.length > 0) {
      pineconeData = await upsertToPinecone(urls);
    }

    // Create query embedding
    const embedding = await generateEmbedding(userMessage);
    if (!embedding) throw new Error("Failed to create query embedding.");

    // Query Pinecone for relevant data
    const queryResults = await index.namespace("ns1").query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    const formattedResults = formatResults(queryResults.matches);

    // Prepare GPT-4 API response
    const messages = [
      { role: "system", content: "You summarize and process URLs for users." },
      { role: "user", content: userMessage },
      { role: "assistant", content: formattedResults },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
    });

    const responseContent = completion.choices[0]?.message?.content || "";

    // Return only the assistant's response content
    return NextResponse.json({
      content: responseContent,
    });
  } catch (error) {
    console.error("Error in POST function:", error.message);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
