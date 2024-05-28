import { Response } from "./types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchGraphQLData = async (query: string): Promise<Response> => {
  let data;
  let errors;
  let retry = true;
  let retryCount = 0;
  const maxRetries = 10;

  while (retry && retryCount < maxRetries) {
    try {
      const response = await fetch('https://graph.zklink.io/subgraphs/name/layerbank-points', {
        method: 'POST',
        body: JSON.stringify({ query }),
        headers: { 'Content-Type': 'application/json' },
      });
      ({ data, errors } = await response.json());

      if (!errors) {
        retryCount++;
        retry = false;
      }
    } catch (error) {
      retryCount++
      console.error('Fetch error:', error);
    }

    if (errors) {
      console.log('Errors detected, retrying in 5 seconds...');
      await delay(5000); // retry after 5s
      retryCount++;
    }
  }

  if (retryCount >= maxRetries) {
    console.error("Maximum retry limit reached");
  }

  return data;
};