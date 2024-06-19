import { Response } from "./types";
import path from "path";

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SUBGRAPH_ENDPOINT = process.env.SUBGRAPH_ENDPOINT as string;
export const fetchGraphQLData = async (query: string): Promise<Response> => {
  let data;
  let errors;
  let retry = true;
  let retryCount = 0;
  const maxRetries = 10;

  while (retry && retryCount < maxRetries) {
    try {
      const response = await fetch(SUBGRAPH_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: { "Content-Type": "application/json" },
      });
      ({ data, errors } = await response.json());
      if (!errors) {
        retryCount++;
        retry = false;
      }
    } catch (error) {
      retryCount++;
      console.error("Fetch error:", error);
    }

    if (errors) {
      console.log("Errors detected, retrying in 5 seconds...");
      await delay(5000); // retry after 5s
      retryCount++;
    }
  }

  if (retryCount >= maxRetries) {
    console.error("Maximum retry limit reached");
  }

  return data;
};
