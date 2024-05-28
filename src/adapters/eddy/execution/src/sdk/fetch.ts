import path from "path";

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchGraphQLData = async (query: string): Promise<any> => {
  let response;
  let data;
  let retry = true;
  let retryCount = 0;
  const maxRetries = 10;

  const SUBGRAPH_ENDPOINT = process.env.SUBGRAPH_ENDPOINT as string;

  while (retry && retryCount < maxRetries) {
    try {
      response = await fetch(SUBGRAPH_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      data = await response.json();
      if (data.errors) {
        throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
      }

      retry = false;
    } catch (error) {
      retryCount++;
      console.error("Fetch error:", error);
      console.log("Retrying in 5 seconds...");
      await delay(5000);
    }
  }

  if (retryCount >= maxRetries) {
    console.error("Maximum retry limit reached");
  }

  return data.data;
};