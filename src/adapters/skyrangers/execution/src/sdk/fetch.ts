const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchGraphQLData = async <T>(query: any, apiurl: string): Promise<T> => {
  let response;
  let data;
  let retry = true;
  let retryCount = 0;
  const maxRetries = 10;

  while (retry && retryCount < maxRetries) {
    try {
      response = await fetch(apiurl, {
        method: "POST",
        body: JSON.stringify(query),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        retryCount++;
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      data = await response.json();
      if (data.errors) {
        retryCount++;
        throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
      }

      retry = false;
    } catch (error) {
      console.error("Fetch error:", error);
      console.log("Retrying in 5 seconds...");
      await delay(5000);
      retryCount++;
    }
  }

  if (retryCount >= maxRetries) {
    console.error("Maximum retry limit reached");
  }

  return data;
};
