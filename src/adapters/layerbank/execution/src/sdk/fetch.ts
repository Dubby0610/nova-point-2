import { Response } from "./types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchGraphQLData = async (query: string): Promise<Response> => {
  let data;
  let errors;
  let retry = true;
  while (retry) {
    try {
      const response = await fetch('https://graph.zklink.io/subgraphs/name/layerbank-points', {
        method: 'POST',
        body: JSON.stringify({ query }),
        headers: { 'Content-Type': 'application/json' },
      });
      ({ data, errors } = await response.json());

      if (!errors) {
        retry = false;
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }

    if (errors) {
      console.log('Errors detected, retrying in 5 seconds...');
      await delay(5000); // retry after 5s
    }
  }

  return data;
};