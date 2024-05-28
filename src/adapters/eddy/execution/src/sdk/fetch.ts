import path from "path";

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchGraphQLData = async (query: string): Promise<any> => {
  let response;
  let data;
  let retry = true;

  const SUBGRAPH_ENDPOINT = process.env.SUBGRAPH_ENDPOINT as string;

  while (retry) {
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
      console.error("Fetch error:", error);
      console.log("Retrying in 5 seconds...");
      await delay(5000); // 延时5秒后重试
    }
  }

  return data.data;
};